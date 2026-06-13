import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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

// Progressive tiered breakdown calculation
const getTieredBreakdown = (kwh, tariffs) => {
  let remaining = kwh;
  const breakdown = [];
  for (const tier of tariffs) {
    if (remaining <= 0) break;
    const tierMin = tier.min_kwh;
    const tierMax = tier.max_kwh ?? Infinity;
    const range = tierMax - tierMin;
    const kwhInTier = Math.min(remaining, range);
    if (kwhInTier > 0) {
      breakdown.push({
        minKwh: tierMin,
        maxKwh: tierMax,
        kwh: kwhInTier,
        rate: tier.price_per_kwh,
        cost: kwhInTier * tier.price_per_kwh,
      });
    }
    remaining -= kwhInTier;
  }
  return breakdown;
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
  const { t } = useLanguage();

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
        Alert.alert(t("error"), error.message);
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
        const tieredBreakdown = getTieredBreakdown(consumption, tariffs);

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
          tieredBreakdown,
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
      Alert.alert(t("error"), error.message);
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
      Alert.alert(t("already_paid"), t("already_paid_desc"));
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
            meters.find((m) => m.id === selectedMeterId)?.name || t("meter"),
          monthName: bill.monthName,
        },
      });
    } catch (error) {
      Alert.alert(t("payment_error"), error.message);
      setPayingBill(null);
    }
  };

  const renderBillItem = ({ item }) => (
    <View style={styles.paperInvoice}>
      {/* Tear-off slip top effect */}
      <View style={styles.tearOffTop} />

      {/* Invoice Receipt Header */}
      <View style={styles.paperHeader}>
        <View style={styles.headerLeftContainer}>
          <Text style={styles.utilityName}>KOTAR UTILITY</Text>
          <Text style={styles.invoiceTitle}>{t("billing_history").toUpperCase()}</Text>
        </View>
        <Ionicons name="flash" size={32} color="#006442" style={styles.headerIcon} />
      </View>

      <View style={styles.dashedSeparator} />

      {/* Invoice Meta details */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t("meter")}:</Text>
          <Text style={styles.metaValue}>
            {meters.find((m) => m.id === selectedMeterId)?.name || t("meter")}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t("billing")}:</Text>
          <Text style={styles.metaValue}>{item.monthName}</Text>
        </View>
      </View>

      <View style={styles.dashedSeparator} />

      {/* Readings section */}
      <View style={styles.readingsSection}>
        <View style={styles.readingColumn}>
          <Text style={styles.readingLabel}>{t("from").toUpperCase()}</Text>
          <Text style={styles.readingVal}>{item.firstReadingValue.toFixed(2)} kWh</Text>
        </View>
        <View style={styles.readingColumn}>
          <Text style={styles.readingLabel}>{t("to").toUpperCase()}</Text>
          <Text style={styles.readingVal}>{item.lastReadingValue.toFixed(2)} kWh</Text>
        </View>
        <View style={styles.readingColumn}>
          <Text style={styles.readingLabel}>NET USAGE</Text>
          <Text style={[styles.readingVal, styles.highlightText]}>{item.consumption.toFixed(2)} kWh</Text>
        </View>
      </View>

      <View style={styles.dashedSeparator} />

     
      <View style={styles.dashedSeparator} />

      {/* Grand Total */}
      <View style={styles.grandTotalContainer}>
        <Text style={styles.grandTotalLabel}>{t("total").toUpperCase()}</Text>
        <Text style={styles.grandTotalValue}>{item.total.toFixed(2)} ETB</Text>
      </View>

      {/* Paid Stamp or Pay Button */}
      {item.isPaid ? (
        <View style={styles.paidStampContainer}>
          <View style={styles.paidStamp}>
            <Text style={styles.paidStampText}>{t("paid").toUpperCase()}</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => handlePay(item)}
        >
          <Text style={styles.payButtonText}>
            {t("pay_now").toUpperCase()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tear-off slip bottom effect */}
      <View style={styles.tearOffBottom} />
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
          <Text style={styles.headerTitle}>{t("billing_history")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {t("no_meters_found")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("billing_history")}</Text>
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
                {meter.name || meter.meter_number || t("meter")}
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
                ? t("calculating")
                : t("need_two_months")}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" }, // slightly darker background for receipt contrast
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

  // --- PAPER BILL HIGH FIDELITY DESIGN STYLES ---
  paperInvoice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8, // slight rounding for receipt paper card
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  tearOffTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#E5E7EB",
    // Simulation of paper serration via pattern or dots (border)
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
    borderStyle: "dotted",
  },
  tearOffBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderTopWidth: 2,
    borderTopColor: "#FFFFFF",
    borderStyle: "dotted",
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  headerLeftContainer: {
    flex: 1,
  },
  utilityName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#006442",
    letterSpacing: 1,
  },
  invoiceTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerIcon: {
    marginLeft: 10,
    opacity: 0.85,
  },
  dashedSeparator: {
    borderWidth: 0.8,
    borderColor: "#9CA3AF",
    borderStyle: "dashed",
    marginVertical: 12,
    height: 1,
    width: "100%",
  },
  metaContainer: {
    flexDirection: "column",
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  readingsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 6,
  },
  readingColumn: {
    alignItems: "center",
    flex: 1,
  },
  readingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  readingVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  highlightText: {
    color: "#006442",
    fontWeight: "800",
  },
  breakdownHeaderRow: {
    marginBottom: 8,
  },
  breakdownHeaderLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
    letterSpacing: 0.5,
  },
  tierBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    flex: 1.2,
  },
  tierFormula: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    flex: 2,
    textAlign: "right",
    paddingRight: 10,
  },
  tierCost: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    flex: 1,
    textAlign: "right",
  },
  chargesContainer: {
    flexDirection: "column",
    gap: 4,
  },
  chargesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chargesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  chargesValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  grandTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 14,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1F2937",
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#006442",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  payButton: {
    backgroundColor: "#006442",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  paidStampContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  paidStamp: {
    borderWidth: 2,
    borderColor: "#006442",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 20,
    transform: [{ rotate: "-4deg" }],
  },
  paidStampText: {
    color: "#006442",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7280", textAlign: "center" },
});
