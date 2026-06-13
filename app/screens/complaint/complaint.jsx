import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supa/supabase-client";
import { useLanguage } from "../../languages/LanguageContext";

export default function ComplaintScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMeters, setFetchingMeters] = useState(true);

  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    fetchUserMeters();
  }, []);

  const fetchUserMeters = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("../Login/Login");
        return;
      }

      const { data, error } = await supabase
        .from("meters")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      setMeters(data || []);
    } catch (e) {
      console.error("Failed to fetch user meters", e);
    } finally {
      setFetchingMeters(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("../Login/Login");
        return;
      }

      const { error } = await supabase.from("complaints").insert([
        {
          user_id: session.user.id,
          meter_id: selectedMeterId, // null represents general complaint
          title: title.trim(),
          description: description.trim(),
          status: "pending",
        },
      ]);

      if (error) throw error;

      Alert.alert(
        t("complaint_submitted"),
        t("complaint_submit_success"),
        [
          {
            text: t("ok") || "OK",
            onPress: () => router.replace("/(tabs)/account"),
          },
        ]
      );
    } catch (e) {
      Alert.alert(t("error"), e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Instruction Info */}
        <View style={styles.infoBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#006442" />
          <Text style={styles.infoText}>
            Have a question, billing issue, or meter problem? Submit your complaint below and our team will get back to you shortly.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Complaint Title */}
          <Text style={styles.label}>{t("complaint_title")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("complaint_title_placeholder")}
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />

          {/* Meter Selection chips (optional) */}
          {meters.length > 0 && (
            <View style={styles.meterSelectionSection}>
              <Text style={styles.label}>{t("select_meter_optional")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedMeterId === null && styles.chipSelected,
                  ]}
                  onPress={() => setSelectedMeterId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedMeterId === null && styles.chipTextSelected,
                    ]}
                  >
                    {t("general_complaint")}
                  </Text>
                </TouchableOpacity>

                {meters.map((meter) => (
                  <TouchableOpacity
                    key={meter.id}
                    style={[
                      styles.chip,
                      selectedMeterId === meter.id && styles.chipSelected,
                    ]}
                    onPress={() => setSelectedMeterId(meter.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedMeterId === meter.id && styles.chipTextSelected,
                      ]}
                    >
                      {meter.name || meter.meter_number || t("meter")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Complaint Description */}
          <Text style={styles.label}>{t("complaint_description")}</Text>
          <TextInput
            style={styles.multilineInput}
            placeholder={t("complaint_description_placeholder")}
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>{t("submit_complaint")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: "#E6F0EC",
    borderWidth: 1,
    borderColor: "#006442",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#006442",
    lineHeight: 20,
    fontWeight: "500",
  },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F9FAFB",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  multilineInput: {
    backgroundColor: "#F9FAFB",
    height: 120,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 15,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  meterSelectionSection: {
    marginBottom: 20,
  },
  chipScroll: {
    flexDirection: "row",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    height: 38,
  },
  chipSelected: {
    backgroundColor: "#006442",
    borderColor: "#006442",
  },
  chipText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: "#006442",
    height: 55,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
