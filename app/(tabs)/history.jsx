import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../supa/supabase-client";
import { useLanguage } from "../languages/LanguageContext";

export default function LedgerScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [meters, setMeters] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    fetchMetersAndPayments();
  }, []);

  const fetchMetersAndPayments = async () => {
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

      // 1. Fetch user's meters to map IDs to Names
      const { data: metersData, error: metersError } = await supabase
        .from("meters")
        .select("*")
        .eq("user_id", currentUserId);

      if (metersError) throw metersError;
      setMeters(metersData || []);

      // 2. Fetch successful payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("status", "success")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      Alert.alert(t("error"), error.message);
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetersAndPayments();
  };

  const viewReceiptDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setModalVisible(true);
  };

  const getMeterName = (meterId) => {
    const meter = meters.find((m) => m.id === meterId);
    return meter ? meter.name || meter.meter_number : t("unnamed_meter");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderReceiptItem = ({ item }) => {
    const meterName = getMeterName(item.meter_id);
    const dateStr = formatDate(item.created_at);

    return (
      <TouchableOpacity
        style={styles.receiptCard}
        onPress={() => viewReceiptDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={styles.receiptIconContainer}>
            <Ionicons name="receipt-outline" size={24} color="#006442" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{meterName}</Text>
            <Text style={styles.cardSubtitle}>
              {t("billing")}: {item.month_key}
            </Text>
            <Text style={styles.cardDate}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>
            {parseFloat(item.total_amount).toFixed(2)} ETB
          </Text>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#006442" />
            <Text style={styles.successBadgeText}>
              {t("paid").toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderReceiptItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {t("no_payments_yet") || "No payment history found."}
            </Text>
          </View>
        }
      />

      {/* Modern High-Fidelity Receipt Modal */}
      {selectedReceipt && (
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("payment_completed").toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.receiptScroll}
              >
                <View style={styles.paperInvoice}>
                  {/* Dotted Tear-Off simulation */}
                  <View style={styles.tearOffTop} />

                  <View style={styles.paperHeader}>
                    <View style={styles.headerLeftContainer}>
                      <Text style={styles.utilityName}>KOTAR UTILITY</Text>
                      <Text style={styles.invoiceTitle}>
                        {t("payment_completed").toUpperCase()}
                      </Text>
                    </View>
                    <Ionicons name="flash" size={28} color="#006442" />
                  </View>

                  <View style={styles.dashedSeparator} />

                  {/* Meta Information */}
                  <View style={styles.metaContainer}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{t("meter")}:</Text>
                      <Text style={styles.metaValue}>
                        {getMeterName(selectedReceipt.meter_id)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{t("billing")}:</Text>
                      <Text style={styles.metaValue}>
                        {selectedReceipt.month_key}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>TX REF:</Text>
                      <Text style={[styles.metaValue, styles.txRefText]}>
                        {selectedReceipt.transaction_ref}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>DATE:</Text>
                      <Text style={styles.metaValue}>
                        {formatDate(selectedReceipt.created_at)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>METHOD:</Text>
                      <Text style={styles.metaValue}>
                        {selectedReceipt.payment_method?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dashedSeparator} />

                  {/* Consumed Energy */}
                  <View style={styles.readingsSection}>
                    <View style={styles.readingColumn}>
                      <Text style={styles.readingLabel}>TOTAL CONSUMED</Text>
                      <Text style={[styles.readingVal, styles.highlightText]}>
                        {parseFloat(selectedReceipt.consumption).toFixed(2)} kWh
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dashedSeparator} />

                  {/* Detailed Charges */}
                  <View style={styles.chargesContainer}>
                    <View style={styles.chargesRow}>
                      <Text style={styles.chargesLabel}>{t("energy_charge")}</Text>
                      <Text style={styles.chargesValue}>
                        {parseFloat(selectedReceipt.energy_cost).toFixed(2)} ETB
                      </Text>
                    </View>
                    <View style={styles.chargesRow}>
                      <Text style={styles.chargesLabel}>{t("service_fee")}</Text>
                      <Text style={styles.chargesValue}>
                        {parseFloat(selectedReceipt.service_fee).toFixed(2)} ETB
                      </Text>
                    </View>
                    <View style={styles.chargesRow}>
                      <Text style={styles.chargesLabel}>{t("vat")}</Text>
                      <Text style={styles.chargesValue}>
                        {parseFloat(selectedReceipt.vat).toFixed(2)} ETB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dashedSeparator} />

                  {/* Grand Total */}
                  <View style={styles.grandTotalContainer}>
                    <Text style={styles.grandTotalLabel}>
                      {t("total").toUpperCase()}
                    </Text>
                    <Text style={styles.grandTotalValue}>
                      {parseFloat(selectedReceipt.total_amount).toFixed(2)} ETB
                    </Text>
                  </View>

                  {/* Paid Stamp */}
                  <View style={styles.paidStampContainer}>
                    <View style={styles.paidStamp}>
                      <Text style={styles.paidStampText}>
                        {t("paid").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Tear-Off Bottom */}
                  <View style={styles.tearOffBottom} />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  receiptCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  receiptIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E6F0EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
    fontWeight: "500",
  },
  cardDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#006442",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F0EC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
  },
  successBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#006442",
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  receiptScroll: {
    padding: 20,
  },

  // Paper Invoice styling inside modal
  paperInvoice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
    position: "relative",
  },
  tearOffTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#E5E7EB",
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
  txRefText: {
    fontSize: 11,
    color: "#4B5563",
  },
  readingsSection: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 6,
  },
  readingColumn: {
    alignItems: "center",
  },
  readingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  readingVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  highlightText: {
    color: "#006442",
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
    fontWeight: "950",
    color: "#1F2937",
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: "950",
    color: "#006442",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
});
