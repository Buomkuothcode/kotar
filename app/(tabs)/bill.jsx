import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supa/supabase-client";

// Progressive tiered cost calculation
const calculateEnergyCost = (kwh, tariffs) => {
  let remaining = kwh;
  let cost = 0;
  for (const tier of tariffs) {
    if (remaining <= 0) break;
    const tierMin = tier.min_kwh;
    const tierMax = tier.max_kwh ?? Infinity;
    const range = tierMax - tierMin;
    const kwhInTier = Math.min(remaining, range);
    cost += kwhInTier * tier.price_per_kwh;
    remaining -= kwhInTier;
  }
  return cost;
};

// Lookup service fee from database tiers
const getServiceFeeFromDB = (kwh, feeTiers) => {
  const tier = feeTiers.find(
    (t) => kwh >= t.min_kwh && (t.max_kwh === null || kwh <= t.max_kwh),
  );
  return tier ? tier.fee : 35.0; // fallback
};

export default function MonthlyHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [monthlyBills, setMonthlyBills] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [serviceFees, setServiceFees] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [payingBill, setPayingBill] = useState(null);

  const router = useRouter();
  const { meterId } = useLocalSearchParams();

  // Load user, meters, tariffs, service fees
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("../screens/Login/Login");
          return;
        }

        const currentUserId = session.user.id;
        setUserId(currentUserId);

        // Fetch meters
        const { data: metersData, error: metersError } = await supabase
          .from("meters")
          .select("*")
          .eq("user_id", currentUserId);

        if (metersError) throw metersError;
        setMeters(metersData || []);

        const defaultId = meterId || (metersData?.[0]?.id ?? null);
        setSelectedMeterId(defaultId);

        // Fetch tariffs
        const { data: tariffsData, error: tariffsError } = await supabase
          .from("tariffs")
          .select("*")
          .order("min_kwh", { ascending: true });

        if (tariffsError) throw tariffsError;
        setTariffs(tariffsData || []);

        // Fetch service fees
        const { data: serviceFeesData, error: serviceFeesError } =
          await supabase
            .from("service_fees")
            .select("*")
            .order("min_kwh", { ascending: true });

        if (serviceFeesError) throw serviceFeesError;
        setServiceFees(serviceFeesData || []);
      } catch (error) {
        Alert.alert("Error", error.message);
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [meterId]);

  // Compute monthly bills when meter, tariffs, or service fees change
  useEffect(() => {
    if (!selectedMeterId || tariffs.length === 0 || serviceFees.length === 0)
      return;
    fetchAndCalculate();
  }, [selectedMeterId, tariffs, serviceFees]);

  const fetchAndCalculate = async () => {
    setRefreshing(true);
    try {
      // Fetch readings with IDs
      const { data: readings, error } = await supabase
        .from("meter_readings")
        .select("id, value, reading_date")
        .eq("meter_id", selectedMeterId)
        .order("reading_date", { ascending: true });

      if (error) throw error;
      if (!readings || readings.length < 2) {
        setMonthlyBills([]);
        return;
      }

      // Get last reading (id, value, date) per month
      const lastReadingPerMonth = new Map(); // key: YYYY-MM, value: { id, value, date }
      readings.forEach((r) => {
        const date = new Date(r.reading_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const value = parseFloat(r.value);
        const existing = lastReadingPerMonth.get(monthKey);
        if (!existing || date > existing.date) {
          lastReadingPerMonth.set(monthKey, { id: r.id, value, date });
        }
      });

      const sortedMonths = Array.from(lastReadingPerMonth.keys()).sort();
      const bills = [];

      // Fetch already paid months for this meter
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("month_key")
        .eq("meter_id", selectedMeterId)
        .eq("status", "success");

      const paidMonths = new Set(
        existingPayments?.map((p) => p.month_key) || [],
      );

      for (let i = 1; i < sortedMonths.length; i++) {
        const currentMonthKey = sortedMonths[i];
        const previousMonthKey = sortedMonths[i - 1];

        const current = lastReadingPerMonth.get(currentMonthKey);
        const previous = lastReadingPerMonth.get(previousMonthKey);

        let consumption = current.value - previous.value;
        if (consumption < 0) consumption = 0;

        const [year, month] = currentMonthKey.split("-");
        const monthName = new Date(year, month - 1).toLocaleString("default", {
          month: "long",
          year: "numeric",
        });

        const energyCost = calculateEnergyCost(consumption, tariffs);
        const serviceFee = getServiceFeeFromDB(consumption, serviceFees);
        const subtotal = energyCost + serviceFee;
        const vat = subtotal * 0.15;
        const total = subtotal + vat;

        bills.push({
          monthKey: currentMonthKey,
          monthName,
          consumption,
          firstReadingValue: previous.value,
          lastReadingValue: current.value,
          fromReadingId: previous.id,
          toReadingId: current.id,
          energyCost,
          serviceFee,
          vat,
          total,
          isPaid: paidMonths.has(currentMonthKey),
          tariffRate:
            tariffs.find(
              (t) =>
                consumption >= t.min_kwh &&
                (t.max_kwh === null || consumption <= t.max_kwh),
            )?.price_per_kwh || 0,
        });
      }

      bills.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      setMonthlyBills(bills);
    } catch (error) {
      Alert.alert("Calculation Error", error.message);
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMeterChange = (id) => {
    setSelectedMeterId(id);
  };

  const handlePay = async (bill) => {
    if (bill.isPaid) {
      Alert.alert("Already Paid", "This bill has already been paid.");
      return;
    }

    setPayingBill(bill);
    try {
      // Create a pending payment record
      const transactionRef = `chapa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data: payment, error: insertError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          meter_id: selectedMeterId,
          month_key: bill.monthKey,
          from_reading_id: bill.fromReadingId,
          to_reading_id: bill.toReadingId,
          consumption: bill.consumption,
          energy_cost: bill.energyCost,
          service_fee: bill.serviceFee,
          vat: bill.vat,
          total_amount: bill.total,
          transaction_ref: transactionRef,
          status: "pending",
          payment_method: "chapa",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Navigate to payment screen, passing payment details
      router.push({
        pathname: "../screens/pay",
        params: {
          paymentId: payment.id,
          amount: bill.total.toString(),
          transactionRef: transactionRef,
          meterName:
            meters.find((m) => m.id === selectedMeterId)?.name || "Meter",
          monthName: bill.monthName,
        },
      });
    } catch (error) {
      Alert.alert("Payment Error", error.message);
      setPayingBill(null);
    }
  };

  const renderBillItem = ({ item }) => (
    <View style={styles.billCard}>
      <View style={styles.billHeader}>
        <Text style={styles.monthText}>{item.monthName}</Text>
        <View style={styles.consumptionBadge}>
          <Text style={styles.consumptionText}>
            {item.consumption.toFixed(2)} kWh
          </Text>
        </View>
      </View>

      <View style={styles.readingRow}>
        <Text style={styles.readingLabel}>From</Text>
        <Text style={styles.readingValue}>
          {item.firstReadingValue.toFixed(2)}
        </Text>
        <Text style={styles.readingLabel}>To</Text>
        <Text style={styles.readingValue}>
          {item.lastReadingValue.toFixed(2)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Energy Charge</Text>
        <Text style={styles.detailValue}>{item.energyCost.toFixed(2)} ETB</Text>
      </View>
      <Text style={styles.detailSub}>
        {item.consumption.toFixed(2)} kWh × {item.tariffRate.toFixed(4)} ETB/kWh
        (tiered)
      </Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Service Fee</Text>
        <Text style={styles.detailValue}>{item.serviceFee.toFixed(2)} ETB</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>VAT (15%)</Text>
        <Text style={styles.detailValue}>{item.vat.toFixed(2)} ETB</Text>
      </View>

      <View style={[styles.detailRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{item.total.toFixed(2)} ETB</Text>
      </View>

      <TouchableOpacity
        style={[styles.payButton, item.isPaid && styles.payButtonDisabled]}
        onPress={() => handlePay(item)}
        disabled={item.isPaid}
      >
        <Text style={styles.payButtonText}>
          {item.isPaid ? "Paid" : "Pay Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006442" />
      </View>
    );
  }

  if (meters.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Billing History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No meters found. Add a meter first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing History</Text>
        <TouchableOpacity onPress={fetchAndCalculate}>
          <Ionicons name="refresh" size={24} color="#006442" />
        </TouchableOpacity>
      </View>

      <View style={styles.meterSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {meters.map((meter) => (
            <TouchableOpacity
              key={meter.id}
              style={[
                styles.meterChip,
                selectedMeterId === meter.id && styles.meterChipSelected,
              ]}
              onPress={() => handleMeterChange(meter.id)}
            >
              <Text
                style={[
                  styles.meterChipText,
                  selectedMeterId === meter.id && styles.meterChipTextSelected,
                ]}
              >
                {meter.name || meter.meter_number || "Meter"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={monthlyBills}
        keyExtractor={(item) => item.monthKey}
        renderItem={renderBillItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={fetchAndCalculate}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {refreshing
                ? "Calculating..."
                : "Need at least two months of readings to calculate bills.\nAdd readings for this meter."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  meterSelector: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  meterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  meterChipSelected: {
    backgroundColor: "#006442",
    borderColor: "#006442",
  },
  meterChipText: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  meterChipTextSelected: { color: "#FFFFFF" },
  listContent: { padding: 16, paddingBottom: 30 },
  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthText: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  consumptionBadge: {
    backgroundColor: "#006442",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  consumptionText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  readingLabel: { fontSize: 14, color: "#6B7280", width: 40 },
  readingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginRight: 20,
  },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: { fontSize: 14, color: "#4B5563" },
  detailValue: { fontSize: 14, fontWeight: "500", color: "#1F2937" },
  detailSub: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 10,
    marginTop: -2,
    textAlign: "right",
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#006442" },
  payButton: {
    marginTop: 16,
    backgroundColor: "#006442",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7280", textAlign: "center" },
});
