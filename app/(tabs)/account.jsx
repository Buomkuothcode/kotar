import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../supa/supabase-client";

const Account = () => {
  const [profile, setProfile] = useState(null);
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State for New Meter
  const [meterNumber, setMeterNumber] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to Login if not authenticated
      router.replace("../screens/Login/Login");
      return;
    }

    fetchProfile(session.user.id);
    fetchMeters(session.user.id);
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchMeters = async (userId) => {
    const { data, error } = await supabase
      .from("meters")
      .select("*")
      .eq("user_id", userId);

    if (data) setMeters(data);
  };

  const handleAddMeter = async () => {
    if (!meterNumber || !location) {
      Alert.alert("Error", "Please fill in Meter Number and Location");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("meters").insert([
      {
        user_id: user.id,
        meter_number: meterNumber,
        location: location,
        description: description,
      },
    ]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Meter added successfully");
      setModalVisible(false);
      setMeterNumber("");
      setLocation("");
      setDescription("");
      fetchMeters(user.id); // Refresh list
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/screens/Login/Login");
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#006442" />;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={
            profile?.avatar
              ? { uri: profile.avatar }
              : require("../../assets/images/icon.png")
          }
          style={styles.avatar}
        />
        <Text style={styles.userName}>{profile?.full_name || "Devi Star"}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
      </View>

      {/* Settings Options */}
      <View style={styles.menuContainer}>
        <MenuOption
          icon="speedometer-outline"
          title="My Meters"
          subtitle={`${meters.length} Connected`}
          onPress={() => setModalVisible(true)}
        />

        <MenuOption icon="settings-outline" title="Settings" />
        <MenuOption icon="help-circle-outline" title="Help & Support" />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const MenuOption = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon} size={22} color="#006442" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#006442",
  },
  userName: { fontSize: 22, fontWeight: "bold", color: "#333" },
  userEmail: { fontSize: 14, color: "#777", marginTop: 4 },
  menuContainer: { paddingHorizontal: 20, marginTop: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E6F0EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  menuSubtitle: { fontSize: 12, color: "#006442" },
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: "#FF4D4D",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 25 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#006442",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  btn: { flex: 0.48, padding: 15, borderRadius: 10, alignItems: "center" },
  btnCancel: { backgroundColor: "#EEE" },
  btnSave: { backgroundColor: "#006442" },
  btnTextCancel: { color: "#666", fontWeight: "600" },
  btnTextSave: { color: "#fff", fontWeight: "600" },
});

export default Account;
