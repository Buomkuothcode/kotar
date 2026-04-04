import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

export default function BillingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState([]);
  const [meter, setMeter] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("../screens/Login/Login");
        return;
      }

      // Fetch User Meter
      const { data: meters, error: meterError } = await supabase
        .from("meters")
        .select("id, meter_number, location")
        .eq("user_id", user.id)
        .limit(1);

      if (meterError) throw meterError;
      if (!meters || meters.length === 0) {
        setMeter(null);
        setBills([]);
        return;
      }

      const userMeter = meters[0];
      setMeter(userMeter);

      // Fetch existing bills
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .eq("meter_id", userMeter.id)
        .order("billing_date", { ascending: false });

      if (billsError) throw billsError;
      setBills(billsData || []);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateNewBill = async () => {
    if (!meter) return;

    try {
      setIsCalculating(true);

      // 1. Get the latest reading from meter_readings table
      const { data: readings, error: readErr } = await supabase
        .from("meter_readings")
        .select("encrypted_value")
        .eq("meter_id", meter.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (readErr || !readings.length) {
        Alert.alert(
          "No Reading",
          "Please scan your meter first to get a reading.",
        );
        return;
      }

      const currentReading = parseInt(readings[0].encrypted_value);

      // 2. Get previous reading from the last bill
      const lastBill = bills[0];
      const previousReading = lastBill ? lastBill.current_reading : 0;
      const usage = currentReading - previousReading;

      if (usage <= 0) {
        Alert.alert(
          "Usage Alert",
          "No new usage detected since the last bill.",
        );
        return;
      }

      // 3. Fetch Ethiopian Tariffs from DB
      const { data: tariffs, error: tariffErr } = await supabase
        .from("tariffs")
        .select("*")
        .order("min_kwh", { ascending: true });

      if (tariffErr) throw tariffErr;

      // 4. Ethiopian Calculation Logic (Tiered)
      // Find the tier that fits the total usage
      const tier =
        tariffs.find(
          (t) =>
            usage >= t.min_kwh && (t.max_kwh === null || usage <= t.max_kwh),
        ) || tariffs[tariffs.length - 1];

      const energyCharge = usage * tier.price_per_kwh;
      const serviceCharge = 10.95; // Fixed monthly fee (EEU Standard)
      const subtotal = energyCharge + serviceCharge;
      const totalWithVAT = subtotal * 1.15; // 15% VAT

      // 5. Create the Bill
      const { error: insertErr } = await supabase.from("bills").insert([
        {
          meter_id: meter.id,
          previous_reading: previousReading,
          current_reading: currentReading,
          usage_kwh: usage,
          total_amount: totalWithVAT.toFixed(2),
          status: "unpaid",
          due_date: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ]);

      if (insertErr) throw insertErr;

      Alert.alert(
        "Success",
        "New bill generated based on your latest reading.",
      );
      loadData();
    } catch (error) {
      Alert.alert("Calculation Error", error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const confirmPayment = async () => {
    if (!selectedBill) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const transactionId = `ET-${Date.now()}`;

      // Insert payment record
      await supabase.from("payments").insert([
        {
          bill_id: selectedBill.id,
          user_id: user.id,
          amount: selectedBill.total_amount,
          transaction_id: transactionId,
          status: "completed",
        },
      ]);

      // Update bill to paid
      await supabase
        .from("bills")
        .update({ status: "paid" })
        .eq("id", selectedBill.id);

      Alert.alert("Paid", "Thank you! Your payment was successful.");
      setPaymentModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert("Payment Error", error.message);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-ET", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006442" />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Electricity Bills</Text>
        <TouchableOpacity onPress={calculateNewBill} disabled={isCalculating}>
          {isCalculating ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons name="sync" size={24} color="#006442" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {!meter ? (
          <Text style={styles.emptyText}>No meter registered.</Text>
        ) : (
          <View style={{ padding: 20 }}>
            <View style={styles.meterCard}>
              <Text style={styles.meterLabel}>METER NUMBER</Text>
              <Text style={styles.meterVal}>{meter.meter_number}</Text>
            </View>

            {bills.map((bill) => (
              <View key={bill.id} style={styles.billCard}>
                <View style={styles.billRow}>
                  <Text style={styles.dateText}>
                    {formatDate(bill.billing_date)}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          bill.status === "paid" ? "#D1FAE5" : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: bill.status === "paid" ? "#065F46" : "#991B1B",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {bill.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.usageContainer}>
                  <Text style={styles.usageText}>{bill.usage_kwh} kWh</Text>
                  <Text style={styles.amountText}>ETB {bill.total_amount}</Text>
                </View>

                {bill.status === "unpaid" && (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => {
                      setSelectedBill(bill);
                      setPaymentModalVisible(true);
                    }}
                  >
                    <Text style={styles.payBtnText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.modalSub}>
              Amount: ETB {selectedBill?.total_amount}
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={confirmPayment}
            >
              <Text style={styles.confirmBtnText}>Confirm & Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  meterCard: {
    backgroundColor: "#006442",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  meterLabel: { color: "#FFF", opacity: 0.8, fontSize: 10 },
  meterVal: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  billCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateText: { color: "#6B7280", fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  usageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  usageText: { fontSize: 16, color: "#374151" },
  amountText: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  payBtn: {
    backgroundColor: "#006442",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  payBtnText: { color: "#FFF", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 30,
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 16,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalSub: { fontSize: 16, marginBottom: 20, color: "#4B5563" },
  confirmBtn: {
    backgroundColor: "#006442",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  confirmBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  cancelText: { color: "#9CA3AF" },
  emptyText: { textAlign: "center", marginTop: 50, color: "#9CA3AF" },
});
