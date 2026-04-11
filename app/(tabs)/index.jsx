import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";

export default function ManualEntryScreen() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [manualValue, setManualValue] = useState("");

  const router = useRouter();
  const { meterId } = useLocalSearchParams();

  // Fetch user and meters
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

      // Pre-select meter if passed via params or use first meter
      const defaultId =
        meterId || (metersData.length > 0 ? metersData[0].id : null);
      setSelectedMeterId(defaultId);

      setLoading(false);
    };

    initialize();
  }, [meterId]);

  // Save manual reading
  const handleSave = async () => {
    if (!selectedMeterId) {
      Alert.alert("No Meter", "Please select a meter first.");
      return;
    }

    const trimmedValue = manualValue.trim();
    if (!trimmedValue) {
      Alert.alert("Invalid Value", "Please enter a kWh reading.");
      return;
    }

    // Optional: validate numeric format
    if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
      Alert.alert(
        "Invalid Format",
        "Please enter a valid number (e.g., 12345 or 123.45).",
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("meter_readings").insert([
        {
          meter_id: selectedMeterId,
          value: trimmedValue, // stored as plain text (no encryption)
          reading_date: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", `Reading saved: ${trimmedValue} kWh`, [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Save Error", e.message);
      console.error(e);
    } finally {
      setSaving(false);
    }
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Reading</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Meter Selection */}
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

      {/* Manual Entry Input */}
      <View style={styles.section}>
        <Text style={styles.label}>kWh Value</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 12345"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={manualValue}
          onChangeText={setManualValue}
          autoFocus
        />
        <Text style={styles.hint}>
          Enter the reading exactly as shown on your meter
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
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
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "600",
    color: "#006442",
    textAlign: "center",
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
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
