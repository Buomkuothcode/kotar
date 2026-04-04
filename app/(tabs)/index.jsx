import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const [scannedValue, setScannedValue] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);
  const router = useRouter();
  const { meterId } = useLocalSearchParams();
  const [userId, setUserId] = useState(null);
  const [meterIdState, setMeterIdState] = useState(meterId);
  const [meters, setMeters] = useState([]);

  const OCR_SPACE_API_KEY = "K87640750688957";

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("../screens/Login/Login");
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const { data, error } = await supabase
        .from("meters")
        .select("*")
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Failed to fetch meters", error);
        return;
      }

      const metersData = data || [];
      setMeters(metersData);

      const selectedId =
        meterId ||
        meterIdState ||
        (metersData.length > 0 ? metersData[0].id : null);
      setMeterIdState(selectedId);

      console.log("Fetched meters for user:", metersData);
      console.log("Selected meter ID for readings:", selectedId);
    };

    initialize();
  }, [meterId]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper function to call OCR with a specific engine and optionally preprocessed image
  const performOCR = async (imageUri, engine = "2") => {
    // Resize the image to a good resolution for OCR (upscale if needed)
    const processed = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1200 } }, // increase width, height auto-scales
      ],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 0.8 },
    );

    const formData = new FormData();
    formData.append("apikey", OCR_SPACE_API_KEY);
    formData.append("base64Image", `data:image/jpg;base64,${processed.base64}`);
    formData.append("language", "eng");
    formData.append("isTable", "false");
    formData.append("OCREngine", engine);

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    return result;
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isScanning) return;

    try {
      setIsScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setCapturedImage(photo.uri);

      // Crop to the region where digits are expected
      const cropRegion = {
        originX: photo.width * 0.1,
        originY: photo.height * 0.3,
        width: photo.width * 0.8,
        height: photo.height * 0.2,
      };

      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: cropRegion }],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      // Try OCR with engine 2 first (more accurate for digits)
      let result = await performOCR(cropped.uri, "2");
      let parsedText = "";

      if (result.OCRExitCode === 1) {
        parsedText = result.ParsedResults[0].ParsedText;
      } else {
        // Fallback to engine 1
        result = await performOCR(cropped.uri, "1");
        if (result.OCRExitCode === 1) {
          parsedText = result.ParsedResults[0].ParsedText;
        } else {
          throw new Error(result.ErrorMessage?.[0] || "OCR failed");
        }
      }

      // Extract numbers from the recognized text
      const cleanText = parsedText.replace(/\s+/g, "");
      const numberMatches = cleanText.match(/\d+/g);
      const readingValue = numberMatches ? numberMatches.join("") : null;

      if (!readingValue) {
        Alert.alert(
          "Scan Error",
          "OCR could not extract a valid numeric reading. Please re-scan.",
        );
        return;
      }

      // Success – show confirmation modal
      setScannedValue(readingValue);
      setModalVisible(true);
    } catch (e) {
      Alert.alert(
        "Scan Error",
        e.message || "Failed to process meter reading.",
      );
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const confirmAndSave = async () => {
    if (!meterIdState) {
      Alert.alert(
        "Meter not selected",
        "Please select or add a meter before saving readings.",
      );
      return;
    }

    try {
      const encryptedValue = Buffer.from(scannedValue).toString("base64");

      const { error } = await supabase.from("meter_readings").insert([
        {
          meter_id: meterIdState,
          encrypted_value: encryptedValue,
          ocr_raw_text: scannedValue,
          image_url: capturedImage,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", `Meter reading saved: ${scannedValue} kWh`, [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Save Error", e.message);
      console.error(e);
    } finally {
      setModalVisible(false);
    }
  };

  const retakePhoto = () => {
    setModalVisible(false);
    setScannedValue(null);
    setCapturedImage(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={styles.camera}
        ref={cameraRef}
        enableTorch={torch}
        facing="back"
      >
        <SafeAreaView style={styles.overlay}>
          {/* Header with close and flash */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Scan Meter</Text>
            <TouchableOpacity
              onPress={() => setTorch(!torch)}
              style={styles.iconBtn}
            >
              <Ionicons
                name={torch ? "flash" : "flash-off"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Scanning frame with improved visual */}
          <View style={styles.targetContainer}>
            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.hint}>Keep meter digits inside the box</Text>
          </View>

          {/* Bottom capture button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleCapture}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#006442" size="large" />
              ) : (
                <View style={styles.innerBtn} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>

      {/* Confirmation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Reading</Text>
              <TouchableOpacity onPress={retakePhoto}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.valueContainer}>
              <Text style={styles.valueLabel}>Extracted Value</Text>
              <Text style={styles.valueText}>{scannedValue} kWh</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={retakePhoto}
              >
                <Text style={styles.cancelBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={confirmAndSave}
              >
                <Text style={styles.confirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  targetContainer: { alignItems: "center", marginTop: -40 },
  targetFrame: {
    width: 300,
    height: 140,
    borderWidth: 0,
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#006442",
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    color: "#fff",
    marginTop: 20,
    fontSize: 15,
    backgroundColor: "#006442",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 40,
    overflow: "hidden",
    fontWeight: "500",
  },

  footer: { paddingBottom: 50, alignItems: "center" },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  innerBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#006442",
    backgroundColor: "#fff",
  },
  permissionText: { textAlign: "center", marginBottom: 20, color: "#fff" },
  permissionBtn: {
    backgroundColor: "#006442",
    padding: 15,
    borderRadius: 30,
    alignSelf: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  valueContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  valueLabel: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  valueText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#006442",
    letterSpacing: 2,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: "#006442",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
