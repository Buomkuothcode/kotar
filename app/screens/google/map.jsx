import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../../supa/supabase-client";

const { width, height } = Dimensions.get("window");

// --- PREMIUM LIGHT THEME ---
const COLORS = {
  PRIMARY: "#1e4b89", // Royal Blue
  SECONDARY: "#DBEAFE", // Soft Blue
  SUCCESS: "#1e4b89", // Green
  DANGER: "#EF4444", // Red
  WHITE: "#FFFFFF",
  BG_LIGHT: "#F8FAFC",
  TEXT_MAIN: "#0F172A",
  TEXT_MUTED: "#64748B",
  BORDER: "#E2E8F0",
};

export default function StationQueueScreen() {
  const router = useRouter();
  const mapRef = useRef(null);

  // Data State
  const [stations, setStations] = useState([]);
  const [queueMap, setQueueMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("map");
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initialize();
    const queueChannel = supabase
      .channel("public:fuel_queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fuel_queue" },
        () => fetchQueues(),
      )
      .subscribe();
    return () => supabase.removeChannel(queueChannel);
  }, []);

  const initialize = async () => {
    setLoading(true);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      router.replace("../screens/welcome/welcome");
      return;
    }
    await requestLocation();
    await Promise.all([fetchStations(), fetchQueues()]);
    setLoading(false);
  };

  const requestLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    let location = await Location.getCurrentPositionAsync({});
    setUserLocation(location.coords);
  };

  const fetchStations = async () => {
    const { data } = await supabase
      .from("station_profiles")
      .select("*")
      .eq("is_verified", true);

    setStations(data || []);
  };

  const fetchQueues = async () => {
    const { data } = await supabase
      .from("fuel_queue")
      .select("*")
      .in("status", ["pending", "serving"]);
    const map = {};
    data?.forEach((item) => {
      if (!map[item.station_user_id]) map[item.station_user_id] = [];
      map[item.station_user_id].push(item);
    });
    setQueueMap(map);
  };

  const centerOnUser = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000,
      );
    }
  };

  const handleMarkerPress = (station) => {
    setSelectedStation(station);
    mapRef.current?.animateToRegion(
      {
        latitude: station.Latitude - 0.005, // Offset to clear the bottom card
        longitude: station.Longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      600,
    );
  };

  const handleConfirmQueue = async () => {
    if (!fuelAmount || parseFloat(fuelAmount) <= 0)
      return Alert.alert("Wait!", "Please enter fuel amount");
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const count = queueMap[selectedStation.user_id]?.length || 0;
      await supabase.from("fuel_queue").insert([
        {
          car_user_id: user.id,
          station_user_id: selectedStation.user_id,
          fuel_type: fuelType,
          requested_amount: parseFloat(fuelAmount),
          queue_position: count + 1,
          status: "pending",
        },
      ]);
      Alert.alert("Confirmed!", "You are now in line.");
      setModalVisible(false);
      setSelectedStation(null);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
    setSubmitting(false);
  };

  const filteredStations = stations.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- FLOATING HEADER --- */}
      <View style={styles.floatingHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search fuel..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle" size={32} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setViewMode("map")}
            style={[styles.pill, viewMode === "map" && styles.pillActive]}
          >
            <Text
              style={[
                styles.pillText,
                viewMode === "map" && styles.pillTextActive,
              ]}
            >
              Map View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            style={[styles.pill, viewMode === "list" && styles.pillActive]}
          >
            <Text
              style={[
                styles.pillText,
                viewMode === "list" && styles.pillTextActive,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: stations[0]?.Latitude || 9.02,
              longitude: stations[0]?.Longitude || 38.75,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            customMapStyle={silverMapStyle}
            showsUserLocation={true}
          >
            {filteredStations.map((station) => {
              const queueCount = queueMap[station.user_id]?.length || 0;
              const statusColor =
                queueCount > 8
                  ? COLORS.DANGER
                  : queueCount > 3
                    ? "#F59E0B"
                    : COLORS.SUCCESS;

              return (
                <Marker
                  key={station.user_id}
                  coordinate={{
                    latitude: station.Latitude,
                    longitude: station.Longitude,
                  }}
                  onPress={() => handleMarkerPress(station)}
                >
                  <View style={styles.markerContainer}>
                    <View
                      style={[
                        styles.markerHex,
                        { backgroundColor: statusColor },
                      ]}
                    >
                      <FontAwesome5 name="gas-pump" size={12} color="white" />
                    </View>
                    <View style={styles.markerWait}>
                      <Text style={styles.markerWaitText}>{queueCount}</Text>
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Floating Location Button */}
          <TouchableOpacity style={styles.locationBtn} onPress={centerOnUser}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={24}
              color={COLORS.PRIMARY}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStations}
          contentContainerStyle={{
            paddingTop: 160,
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => handleMarkerPress(item)}
            >
              <View
                style={[
                  styles.listIndicator,
                  {
                    backgroundColor:
                      (queueMap[item.user_id]?.length || 0) > 5
                        ? COLORS.DANGER
                        : COLORS.SUCCESS,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listBrand}>{item.brand}</Text>
                <View style={styles.listMeta}>
                  <Ionicons name="car" size={14} color={COLORS.TEXT_MUTED} />
                  <Text style={styles.listMetaText}>
                    {queueMap[item.user_id]?.length || 0} waiting
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.BORDER}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* --- FLOATING STATION CARD (Above Tab Bar) --- */}
      {selectedStation && (
        <View style={styles.floatCard}>
          <View style={styles.cardIndicator} />
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardName}>{selectedStation.name}</Text>
              <Text style={styles.cardLocation}>
                {selectedStation.brand} • 1.2 km away
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedStation(null)}
            >
              <Ionicons name="close" size={20} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>AVG. WAIT</Text>
              <Text style={styles.statusValue}>
                {(queueMap[selectedStation.user_id]?.length || 0) * 5} min
              </Text>
            </View>
            <View
              style={[
                styles.statusItem,
                { borderLeftWidth: 1, borderColor: COLORS.BORDER },
              ]}
            >
              <Text style={styles.statusLabel}>QUEUE SIZE</Text>
              <Text style={styles.statusValue}>
                {queueMap[selectedStation.user_id]?.length || 0} cars
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.actionBtnText}>Secure Position in Queue</Text>
            <Ionicons name="flash" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* --- MODAL --- */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.modalTitle}>Refuel Request</Text>

            <Text style={styles.label}>Fuel Grade</Text>
            <View style={styles.gradeContainer}>
              {["Diesel", "Benzene"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.gradePill,
                    fuelType === type && styles.gradePillActive,
                  ]}
                  onPress={() => setFuelType(type)}
                >
                  <Text
                    style={[
                      styles.gradeText,
                      fuelType === type && styles.gradeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity (Liters)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ex: 45"
              value={fuelAmount}
              onChangeText={setFuelAmount}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleConfirmQueue}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Queue Entry</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_LIGHT },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { width: width, height: height },

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 30,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBar: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: { flex: 1, marginLeft: 10, fontWeight: "500" },
  filterRow: { flexDirection: "row", marginTop: 15, gap: 10 },
  pill: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  pillActive: { backgroundColor: COLORS.PRIMARY },
  pillText: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_MUTED },
  pillTextActive: { color: "white" },

  // Markers
  markerContainer: { alignItems: "center" },
  markerHex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    transform: [{ rotate: "45deg" }],
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    borderWidth: 2,
    borderColor: "white",
  },
  markerWait: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: COLORS.TEXT_MAIN,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
  markerWaitText: { color: "white", fontSize: 14, fontWeight: "bold" },

  // Floating Controls
  locationBtn: {
    position: "absolute",
    bottom: 320,
    right: 20,
    backgroundColor: "white",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowOpacity: 0.1,
  },

  // List View
  listCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  listIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  listName: { fontSize: 16, fontWeight: "800", color: COLORS.TEXT_MAIN },
  listBrand: { fontSize: 14, color: COLORS.TEXT_MUTED },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  listMetaText: { fontSize: 14, color: COLORS.TEXT_MAIN, fontWeight: "600" },

  // --- THE FLOATING CARD (CLEARS TAB BAR) ---
  floatCard: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 28,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  cardIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.BORDER,
    alignSelf: "center",
    borderRadius: 2,
    marginBottom: 15,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: { fontSize: 20, fontWeight: "900", color: COLORS.TEXT_MAIN },
  cardLocation: { fontSize: 14, color: COLORS.TEXT_MUTED, marginTop: 2 },
  statusGrid: {
    flexDirection: "row",
    marginVertical: 20,
    backgroundColor: COLORS.BG_LIGHT,
    borderRadius: 15,
  },
  statusItem: { flex: 1, padding: 15, alignItems: "center" },
  statusLabel: { fontSize: 14, color: COLORS.TEXT_MUTED, fontWeight: "800" },
  statusValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: COLORS.PRIMARY,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  actionBtnText: { color: "white", fontWeight: "800", fontSize: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.TEXT_MAIN,
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  gradeContainer: { flexDirection: "row", gap: 10, marginBottom: 25 },
  gradePill: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  gradePillActive: {
    backgroundColor: COLORS.SECONDARY,
    borderColor: COLORS.PRIMARY,
  },
  gradeText: { fontWeight: "700", color: COLORS.TEXT_MUTED },
  gradeTextActive: { color: COLORS.PRIMARY },
  modalInput: {
    backgroundColor: COLORS.BG_LIGHT,
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 25,
  },
  submitBtn: {
    backgroundColor: COLORS.PRIMARY,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "white", fontWeight: "900", fontSize: 18 },
  cancelBtn: { marginTop: 15, padding: 10, alignItems: "center" },
  cancelText: { color: COLORS.TEXT_MUTED, fontWeight: "600" },
});

const silverMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e9e9e9" }],
  },
];
