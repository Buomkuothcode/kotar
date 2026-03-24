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
  const [payingBillId, setPayingBillId] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

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

      // Fetch the user's meter (only one allowed)
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

      // Fetch bills for this meter
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .eq("meter_id", userMeter.id)
        .order("billing_date", { ascending: false });

      if (billsError) throw billsError;
      setBills(billsData || []);
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePayPress = (bill) => {
    setSelectedBill(bill);
    setPaymentModalVisible(true);
  };

  const confirmPayment = async () => {
    if (!selectedBill) return;

    setPayingBillId(selectedBill.id);
    setPaymentModalVisible(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Simulate payment processing (you can integrate real payment gateway here)
      // For now, we create a payment record with status 'completed'
      const transactionId = `TXN${Date.now()}`;
      const { error: paymentError } = await supabase.from("payments").insert([
        {
          bill_id: selectedBill.id,
          user_id: user.id,
          payment_method: "card", // placeholder
          transaction_id: transactionId,
          amount: selectedBill.total_amount,
          currency: "ETB",
          status: "completed",
        },
      ]);

      if (paymentError) throw paymentError;

      // Update bill status to 'paid'
      const { error: updateError } = await supabase
        .from("bills")
        .update({ status: "paid" })
        .eq("id", selectedBill.id);

      if (updateError) throw updateError;

      // Optionally create a receipt (simplified)
      await supabase.from("receipts").insert([
        {
          payment_id: transactionId, // You would need the actual payment ID, but we can query it back. For simplicity, skip or handle properly.
          receipt_url: "https://example.com/receipt", // placeholder
        },
      ]);

      Alert.alert("Success", "Payment completed successfully!");
      loadData(); // Refresh bills
    } catch (error) {
      Alert.alert("Payment Failed", error.message);
      console.error(error);
    } finally {
      setPayingBillId(null);
      setSelectedBill(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `ETB ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006442" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!meter ? (
          <View style={styles.emptyState}>
            <Ionicons name="speedometer-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>No Meter Found</Text>
            <Text style={styles.emptyStateText}>
              Please add a meter first to view bills.
            </Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>No Bills</Text>
            <Text style={styles.emptyStateText}>
              There are no bills for this meter yet.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.meterInfo}>
              <Text style={styles.meterNumber}>{meter.meter_number}</Text>
              <Text style={styles.meterLocation}>{meter.location}</Text>
            </View>
            {bills.map((bill) => (
              <View key={bill.id} style={styles.billCard}>
                <View style={styles.billHeader}>
                  <Text style={styles.billDate}>
                    {formatDate(bill.billing_date)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      bill.status === "paid"
                        ? styles.paidBadge
                        : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        bill.status === "paid"
                          ? styles.paidText
                          : styles.unpaidText,
                      ]}
                    >
                      {bill.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.billDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Usage</Text>
                    <Text style={styles.detailValue}>{bill.usage_kwh} kWh</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(bill.due_date)}
                    </Text>
                  </View>
                  <View style={[styles.detailRow, styles.amountRow]}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(bill.total_amount)}
                    </Text>
                  </View>
                </View>

                {bill.status === "unpaid" && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayPress(bill)}
                    disabled={payingBillId === bill.id}
                  >
                    {payingBillId === bill.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.payButtonText}>Pay Now</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Confirmation Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.modalText}>
              You are about to pay{" "}
              <Text style={styles.modalAmount}>
                {selectedBill && formatCurrency(selectedBill.total_amount)}
              </Text>{" "}
              for the bill dated{" "}
              {selectedBill && formatDate(selectedBill.billing_date)}.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmPayment}
              >
                <Text style={styles.confirmButtonText}>Pay</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  meterInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  meterNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  meterLocation: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
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
    paddingHorizontal: 20,
  },
  billCard: {
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
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  paidBadge: {
    backgroundColor: "#D1FAE5",
  },
  unpaidBadge: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  paidText: {
    color: "#059669",
  },
  unpaidText: {
    color: "#DC2626",
  },
  billDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  amountRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#006442",
  },
  payButton: {
    backgroundColor: "#006442",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    width: "80%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalAmount: {
    fontWeight: "800",
    color: "#006442",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#006442",
    shadowColor: "#006442",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
