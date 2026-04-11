// app/screens/PaymentScreen.jsx (or app/screens/pay/index.jsx)
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../../supa/supabase-client";

export default function PaymentScreen() {
  const { paymentId, amount, transactionRef, meterName, monthName } =
    useLocalSearchParams();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chapaUrl, setChapaUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeChapaPayment();
  }, []);

  const initializeChapaPayment = async () => {
    try {
      const response = await fetch(
        "https://your-backend.com/chapa/initialize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(amount),
            currency: "ETB",
            tx_ref: transactionRef,
            callback_url: "yourapp://payment-callback",
            return_url: "yourapp://payment-result",
            title: `Electricity Bill - ${meterName}`,
            description: `Payment for ${monthName}`,
          }),
        },
      );

      const data = await response.json();
      if (data.checkout_url) {
        setChapaUrl(data.checkout_url);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      Alert.alert(
        "Payment Error",
        "Could not initialize payment. Please try again.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;

    if (url.includes("payment-success") || url.includes("chapa.co/success")) {
      await supabase
        .from("payments")
        .update({ status: "success", paid_at: new Date().toISOString() })
        .eq("id", paymentId);

      Alert.alert("Success", "Payment completed successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/screens/MonthlyHistoryScreen"),
        },
      ]);
      return;
    }

    if (url.includes("payment-cancel") || url.includes("chapa.co/cancel")) {
      await supabase.from("payments").delete().eq("id", paymentId);
      Alert.alert("Cancelled", "Payment was cancelled.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (loading || !chapaUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#006442" />
        <Text style={{ marginTop: 20 }}>Preparing payment...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `Pay ${monthName} - ${meterName}`,
          headerBackTitle: "Back",
        }}
      />
      <WebView
        source={{ uri: chapaUrl }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        renderLoading={() => (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#006442" />
          </View>
        )}
      />
    </View>
  );
}
