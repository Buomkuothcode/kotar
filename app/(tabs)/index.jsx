import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";

const EDGE_FUNCTION_URL =
  "https://apwvpnpdwkavrujqefxf.supabase.co/functions/v1/read-meter";

export default function ManualEntryScreen() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedReading, setScannedReading] = useState(null);
  const [rawOutput, setRawOutput] = useState("");

  const router = useRouter();
  const { meterId } = useLocalSearchParams();

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
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
        Alert.alert("Error", "Could not load your meters.");
        setLoading(false);
        return;
      }

      const metersData = data || [];
      setMeters(metersData);

      const defaultId =
        meterId || (metersData.length > 0 ? metersData[0].id : null);
      setSelectedMeterId(defaultId);

      setLoading(false);
    };

    initialize();
  }, [meterId]);

  const handleSave = async () => {
    if (!selectedMeterId) {
      Alert.alert("No Meter", "Please select a meter first.");
      return;
    }

    if (!scannedReading) {
      Alert.alert("No Reading", "Please scan the meter first.");
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(scannedReading)) {
      Alert.alert(
        "Invalid Reading",
        "The scanned value is not a valid number.",
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("meter_readings").insert([
        {
          meter_id: selectedMeterId,
          value: scannedReading,
          reading_date: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", `Reading saved: ${scannedReading} kWh`, [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Save Error", e.message);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera permission is required.");
        setScanning(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true, // user can crop
      });

      if (result.canceled) {
        setScanning(false);
        return;
      }

      const asset = result.assets?.[0] || result;
      const uri = asset.uri;
      if (!uri) throw new Error("No image URI");

      // Resize and compress
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const finalImageUri = manipResult.uri;

      // Build FormData (React Native way)
      const formData = new FormData();
      formData.append("file", {
        uri: finalImageUri,
        name: "meter.jpg",
        type: "image/jpeg",
      });

      const edgeResponse = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          apikey: "sb_publishable_Jd6WXKljepu2-dRBQQm4QA_nQSucktc",
          Authorization:
            "Bearer sb_publishable_Jd6WXKljepu2-dRBQQm4QA_nQSucktc",
        },
        body: formData,
      });

      const data = await edgeResponse.json();

      if (data.status === "success" && data.reading) {
        setScannedReading(data.reading);
        setRawOutput(data.raw_output || "");
        Alert.alert("Scan Successful", `Detected reading: ${data.reading}`);
      } else {
        const errorMsg =
          data.raw_output || "Could not read meter. Please try again.";
        setScannedReading(null);
        setRawOutput(errorMsg);
        Alert.alert("Scan Failed", errorMsg);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Scan Error",
        error.message || "An unexpected error occurred.",
      );
      setScannedReading(null);
    } finally {
      setScanning(false);
    }
  };

  const handleRescan = () => {
    setScannedReading(null);
    setRawOutput("");
    handleScan();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006442" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enter Reading</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Meter</Text>
        <View style={styles.pickerContainer}>
          {meters.map((meter) => (
            <TouchableOpacity
              key={meter.id}
              style={[
                styles.meterOption,
                selectedMeterId === meter.id && styles.meterOptionSelected,
              ]}
              onPress={() => setSelectedMeterId(meter.id)}
            >
              <Text
                style={[
                  styles.meterText,
                  selectedMeterId === meter.id && styles.meterTextSelected,
                ]}
              >
                {meter.name || meter.meter_number || "Unnamed Meter"}
              </Text>
              {selectedMeterId === meter.id && (
                <Ionicons name="checkmark-circle" size={20} color="#006442" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>kWh Reading</Text>
        <View style={styles.readingDisplayContainer}>
          {scannedReading ? (
            <Text style={styles.readingValue}>{scannedReading}</Text>
          ) : (
            <Text style={styles.readingPlaceholder}>—</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
          onPress={scannedReading ? handleRescan : handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="camera-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.scanBtnText}>
                {scannedReading ? "Rescan Meter" : "Scan Meter"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {scannedReading && (
          <Text style={styles.hint}>
            Reading locked — tap "Rescan Meter" to capture again.
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          (saving || !scannedReading) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        disabled={saving || !scannedReading}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Reading</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  meterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  meterOptionSelected: {
    backgroundColor: "#F0FDF4",
  },
  meterText: {
    fontSize: 16,
    color: "#4B5563",
  },
  meterTextSelected: {
    color: "#006442",
    fontWeight: "500",
  },
  readingDisplayContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  readingValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#006442",
    letterSpacing: 2,
  },
  readingPlaceholder: {
    fontSize: 36,
    fontWeight: "300",
    color: "#9CA3AF",
  },
  scanBtn: {
    backgroundColor: "#006442",
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  scanBtnDisabled: {
    opacity: 0.7,
  },
  scanBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: "#006442",
    marginHorizontal: 20,
    marginTop: 40,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
