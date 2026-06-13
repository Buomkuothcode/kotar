import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../../supa/supabase-client";
import { CHAPA_SECRET_KEY, CHAPA_INIT_URL } from "../../../constants/ChapaConfig";
import { useLanguage } from "../../languages/LanguageContext";

export default function PaymentScreen() {
  const { paymentId, amount, transactionRef, meterName, monthName } =
    useLocalSearchParams();

  const router = useRouter();
  const { t } = useLanguage();
  const [initializing, setInitializing] = useState(true);
  const [chapaUrl, setChapaUrl] = useState(null);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    initializeChapaPayment();
  }, []);

  const initializeChapaPayment = async () => {
    console.log("initializeChapaPayment started");
    console.log("CHAPA_INIT_URL:", CHAPA_INIT_URL);
    console.log("CHAPA_SECRET_KEY:", CHAPA_SECRET_KEY ? CHAPA_SECRET_KEY.substring(0, 15) + "..." : "undefined");
    console.log("paymentId:", paymentId);
    console.log("amount:", amount);
    console.log("transactionRef:", transactionRef);
    console.log("meterName:", meterName);
    console.log("monthName:", monthName);

    try {
      // 1. Fetch current user and profile details from Supabase to provide to Chapa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Supabase session error:", sessionError);
      }
      
      let email = session?.user?.email || "customer@example.com";
      let firstName = "Customer";
      let lastName = "User";
      let profilePhoneNumber = null;

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, phone_number")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.log("Profile fetch error (non-fatal):", profileError);
        }

        if (profile) {
          email = profile.email || email;
          profilePhoneNumber = profile.phone_number;
          if (profile.full_name) {
            const parts = profile.full_name.trim().split(" ");
            firstName = parts[0] || firstName;
            if (parts.length > 1) {
              lastName = parts.slice(1).join(" ");
            }
          }
        }
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      const requestBody = {
        amount: parsedAmount,
        currency: "ETB",
        email: email,
        first_name: firstName,
        last_name: lastName,
        tx_ref: transactionRef,
        callback_url: "https://api.chapa.co/", // fallback dummy webhook callback
        return_url: "https://example.com/payment-success",
        customization: {
          title: `${meterName}`,
          description: `${monthName}`,
        },
      };

      if (profilePhoneNumber) {
        requestBody.phone_number = profilePhoneNumber;
      }

      console.log("Sending request to Chapa:", JSON.stringify(requestBody, null, 2));

      // 2. Call Chapa transaction initialize API directly
      const response = await fetch(CHAPA_INIT_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      const result = await response.json();
      console.log("Response JSON:", JSON.stringify(result, null, 2));

      if (result.status === "success" && result.data && result.data.checkout_url) {
        setChapaUrl(result.data.checkout_url);
      } else {
        const errMsg = result.message || "Failed to initialize transaction";
        const detailedMsg = typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg;
        throw new Error(detailedMsg);
      }
    } catch (err) {
      console.error("Initialization error detail:", err);
      // Ensure we stringify objects to avoid [object Object] in Alert
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setError(errorMessage);
      Alert.alert(
        t("payment_error"),
        `${t("payment_error")}: ${errorMessage}`,
        [{ text: t("ok") || "OK", onPress: () => router.back() }],
      );
    } finally {
      setInitializing(false);
    }
  };

  const verifyPaymentOnChapa = async () => {
    try {
      setVerifying(true);
      const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${transactionRef}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
        },
      });

      const result = await response.json();
      if (result.status === "success" && result.data && result.data.status === "success") {
        return true;
      }
      return false;
    } catch (err) {
      console.error("Verification error:", err);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;

    if (
      url.includes("payment-success") ||
      url.includes("chapa.co/success") ||
      url.includes("payment-result")
    ) {
      // Verify payment with Chapa API first to prevent client-side spoofing
      const isVerified = await verifyPaymentOnChapa();

      if (isVerified) {
        await supabase
          .from("payments")
          .update({ status: "success", paid_at: new Date().toISOString() })
          .eq("id", paymentId);

        Alert.alert(t("success"), t("payment_completed"), [
          {
            text: t("ok") || "OK",
            onPress: () => router.replace("/(tabs)/bill"),
          },
        ]);
      } else {
        Alert.alert(
          t("error"),
          "Could not verify your payment with Chapa. If you were charged, please contact support.",
          [{ text: t("ok") || "OK", onPress: () => router.replace("/(tabs)/bill") }]
        );
      }
      return;
    }

    if (url.includes("payment-cancel") || url.includes("chapa.co/cancel")) {
      Alert.alert(t("cancelled"), t("payment_cancelled"), [
        { text: t("ok") || "OK", onPress: () => router.back() },
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

  if (initializing || verifying || !chapaUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#006442" />
        <Text style={{ marginTop: 20 }}>
          {verifying ? t("verifying_payment") : t("preparing_payment")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `Pay ${monthName} - ${meterName}`,
          headerBackTitle: t("back") || "Back",
        }}
      />
      <WebView
        source={{ uri: chapaUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        renderLoading={() => (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#fff",
            }}
          >
            <ActivityIndicator size="large" color="#006442" />
          </View>
        )}
      />
    </View>
  );
}
