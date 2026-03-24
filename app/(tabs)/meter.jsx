import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";

const { width } = Dimensions.get("window");

// --- MODERN UI COMPONENTS ---

const Divider = () => <View style={styles.divider} />;

const InputField = ({ label, ...props }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.textInput}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  </View>
);

const SkeletonCard = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "60%" }]} />
      </View>
    ))}
  </View>
);

export default function ModernAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [meters, setMeters] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingMeter, setEditingMeter] = useState(null);
  const [meterForm, setMeterForm] = useState({ number: "", loc: "", desc: "" });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("../screens/Login/Login");
      return;
    }
    await Promise.all([
      fetchProfile(session.user.id),
      fetchMeters(session.user.id),
    ]);
    setLoading(false);
  };

  const fetchProfile = async (uId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uId)
      .single();
    if (data) setProfile(data);
  };

  const fetchMeters = async (uId) => {
    const { data } = await supabase
      .from("meters")
      .select("*")
      .eq("user_id", uId);
    if (data) setMeters(data);
  };

  const handleSaveMeter = async () => {
    if (!editingMeter && meters.length >= 1) {
      Alert.alert("Limit Reached", "You can only have one meter.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user.id,
      meter_number: meterForm.number,
      location: meterForm.loc,
      description: meterForm.desc,
    };

    let error;
    if (editingMeter) {
      const { error: err } = await supabase
        .from("meters")
        .update(payload)
        .eq("id", editingMeter.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("meters").insert([payload]);
      error = err;
    }

    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      resetForm();
      fetchMeters(user.id);
    }
  };

  const deleteMeter = (id) => {
    Alert.alert("Delete Meter", "Are you sure you want to remove this meter?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("meters").delete().eq("id", id);
          fetchMeters(profile.id);
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingMeter(null);
    setMeterForm({ number: "", loc: "", desc: "" });
  };

  const openEdit = (meter) => {
    setEditingMeter(meter);
    setMeterForm({
      number: meter.meter_number,
      loc: meter.location,
      desc: meter.description,
    });
    setModalVisible(true);
  };

  if (loading)
    return (
      <View style={styles.container}>
        <SafeAreaView />
        <SkeletonCard />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meters Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Meter</Text>
          {meters.length === 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Meter</Text>
            </TouchableOpacity>
          )}
        </View>

        {meters.length > 0 ? (
          meters.map((item, index) => (
            <View key={item.id} style={styles.meterCard}>
              <View style={styles.meterIcon}>
                <Ionicons
                  name="speedometer-outline"
                  size={28}
                  color="#006442"
                />
              </View>
              <View style={styles.meterInfo}>
                <Text style={styles.meterNumber}>{item.meter_number}</Text>
                <Text style={styles.meterLoc}>{item.location}</Text>
                {item.description ? (
                  <Text style={styles.meterDesc}>{item.description}</Text>
                ) : null}
              </View>
              <View style={styles.meterActions}>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  style={styles.iconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="pencil" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteMeter(item.id)}
                  style={[styles.iconButton, { marginTop: 8 }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="speedometer-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>No meter yet</Text>
            <Text style={styles.emptyStateText}>
              Tap "Add Meter" to register your first meter.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal for adding/editing meter */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMeter ? "Edit Meter" : "New Meter"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <InputField
              label="Meter Serial Number"
              value={meterForm.number}
              onChangeText={(t) => setMeterForm({ ...meterForm, number: t })}
              placeholder="e.g., 123456789"
            />
            <InputField
              label="Installation Location"
              value={meterForm.loc}
              onChangeText={(t) => setMeterForm({ ...meterForm, loc: t })}
              placeholder="e.g., Kitchen"
            />
            <InputField
              label="Description (Optional)"
              value={meterForm.desc}
              onChangeText={(t) => setMeterForm({ ...meterForm, desc: t })}
              placeholder="Any additional info"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveMeter}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {editingMeter ? "Save Changes" : "Add Meter"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#006442",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profileInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#006442",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  meterCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  meterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  meterInfo: {
    flex: 1,
    justifyContent: "center",
  },
  meterNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  meterLoc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  meterDesc: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  meterActions: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
  },
  inputWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  textInput: {
    fontSize: 16,
    color: "#1F2937",
    padding: 0,
  },
  saveButton: {
    backgroundColor: "#006442",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#E5E7EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  skeletonLine: {
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginBottom: 10,
    width: "80%",
  },
});
