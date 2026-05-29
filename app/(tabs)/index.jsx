import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";
import { useLanguage } from "../languages/LanguageContext";

const EDGE_FUNCTION_URL =
  "https://apwvpnpdwkavrujqefxf.supabase.co/functions/v1/read-meter";

export default function ManualEntryScreen() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedReading, setScannedReading] = useState(null);
  const [rawOutput, setRawOutput] = useState("");

  const router = useRouter();
  const { meterId } = useLocalSearchParams();

  const fetchMeters = useCallback(async () => {
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
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch meters", error);
      Alert.alert(t("error"), t("could_not_load_meters") || "Could not load your meters.");
      return;
    }

    const metersData = data || [];
    setMeters(metersData);

    // Preserve selected meter if it still exists, otherwise pick first or passed meterId
    let newSelectedId = null;
    if (meterId && metersData.some((m) => m.id === meterId)) {
      newSelectedId = meterId;
    } else if (
      selectedMeterId &&
      metersData.some((m) => m.id === selectedMeterId)
    ) {
      newSelectedId = selectedMeterId;
    } else if (metersData.length > 0) {
      newSelectedId = metersData[0].id;
    }
    setSelectedMeterId(newSelectedId);
  }, [meterId, selectedMeterId]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchMeters();
      setLoading(false);
    };
    initialize();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMeters();
    setRefreshing(false);
  }, [fetchMeters]);

  const handleSave = async () => {
    if (!selectedMeterId) {
      Alert.alert(t("no_meter"), t("select_meter_first"));
      return;
    }

    if (!scannedReading) {
      Alert.alert(t("no_reading"), t("please_scan_first"));
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(scannedReading)) {
      Alert.alert(
        t("invalid_reading"),
        t("scanned_value_invalid"),
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

      Alert.alert(t("success"), `${t("reading_saved")}: ${scannedReading} kWh`, [
        { text: t("ok") || "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert(t("save_error"), e.message);
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
        Alert.alert(t("permission_denied"), t("camera_permission_required"));
        setScanning(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled) {
        setScanning(false);
        return;
      }

      const asset = result.assets?.[0] || result;
      const uri = asset.uri;
      if (!uri) throw new Error("No image URI");

      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const finalImageUri = manipResult.uri;

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
        Alert.alert(t("scan_successful"), `${t("detected_reading")}: ${data.reading}`);
      } else {
        const errorMsg =
          data.raw_output || "Could not read meter. Please try again.";
        setScannedReading(null);
        setRawOutput(errorMsg);
        Alert.alert(t("scan_failed"), errorMsg);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        t("scan_error"),
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
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t("loading_meters")}</Text>
      </View>
    );
  }

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E7D32"
            colors={["#2E7D32"]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("enter_reading")}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Meter Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash-outline" size={20} color="#2E7D32" />
            <Text style={styles.cardTitle}>{t("select_meter")}</Text>
          </View>
          {meters.length === 0 ? (
            <View style={styles.emptyMeters}>
              <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>{t("no_meters_found")}</Text>
              <TouchableOpacity
                style={styles.addMeterButton}
                onPress={() => router.push("/add-meter")}
              >
                <Text style={styles.addMeterButtonText}>
                  {t("add_meter")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.meterList}>
              {meters.map((meter) => (
                <TouchableOpacity
                  key={meter.id}
                  style={[
                    styles.meterItem,
                    selectedMeterId === meter.id && styles.meterItemSelected,
                  ]}
                  onPress={() => setSelectedMeterId(meter.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.meterInfo}>
                    <Text
                      style={[
                        styles.meterName,
                        selectedMeterId === meter.id &&
                          styles.meterNameSelected,
                      ]}
                    >
                      {meter.name || t("unnamed_meter")}
                    </Text>
                    {meter.meter_number && (
                      <Text style={styles.meterNumber}>
                        {meter.meter_number}
                      </Text>
                    )}
                  </View>
                  {selectedMeterId === meter.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#2E7D32"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reading Display Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer-outline" size={20} color="#2E7D32" />
            <Text style={styles.cardTitle}>{t("kwh_value")}</Text>
          </View>
          <View style={styles.readingWrapper}>
            {scannedReading ? (
              <>
                <Text style={styles.readingValue}>{scannedReading}</Text>
                <Text style={styles.readingUnit}>kWh</Text>
              </>
            ) : (
              <Text style={styles.readingPlaceholder}>—</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
            onPress={scannedReading ? handleRescan : handleScan}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.scanButtonText}>
                  {scannedReading ? t("scan_again") : t("scan_meter")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {scannedReading && (
            <Text style={styles.hintText}>
              <Ionicons name="lock-closed-outline" size={12} color="#6B7280" />{" "}
              {t("reading_locked")}
            </Text>
          )}
          {rawOutput && !scannedReading && (
            <Text style={styles.errorHint}>{rawOutput}</Text>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving || !scannedReading || !selectedMeterId) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !scannedReading || !selectedMeterId}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#fff"
              />
              <Text style={styles.saveButtonText}>{t("save_reading")}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Extra bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#4B5563",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  headerPlaceholder: {
    width: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  meterList: {
    borderRadius: 16,
    overflow: "hidden",
  },
  meterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  meterItemSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  meterInfo: {
    flex: 1,
  },
  meterName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  meterNameSelected: {
    color: "#1B5E20",
  },
  meterNumber: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyMeters: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
    marginBottom: 20,
  },
  addMeterButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  addMeterButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  readingWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readingValue: {
    fontSize: 56,
    fontWeight: "800",
    color: "#2E7D32",
    letterSpacing: -1,
    lineHeight: 64,
  },
  readingUnit: {
    fontSize: 18,
    fontWeight: "500",
    color: "#4B5563",
    marginTop: 4,
  },
  readingPlaceholder: {
    fontSize: 56,
    fontWeight: "300",
    color: "#D1D5DB",
  },
  scanButton: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 40,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  hintText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 13,
    color: "#DC2626",
    marginTop: 12,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#1B5E20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 40,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },
});
