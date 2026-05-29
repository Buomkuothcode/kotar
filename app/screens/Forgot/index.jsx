import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supa/supabase-client";
import { useLanguage } from "../../languages/LanguageContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  
  const router = useRouter();
  const { t } = useLanguage();

  // Step 1: Send OTP Code
  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);
    if (error) {
      Alert.alert(t("error"), error.message);
    } else {
      Alert.alert(t("success") || "Success", "Check your email for the OTP code!");
      setStep(2);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: "recovery",
    });

    setLoading(false);
    if (error) {
      Alert.alert(t("error"), error.message);
    } else {
      setStep(3);
    }
  };

  // Step 3: Change to New Password
  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);
    if (error) {
      Alert.alert(t("error"), error.message);
    } else {
      Alert.alert(t("success") || "Success", "Password updated successfully!", [
        { text: "OK", onPress: () => router.replace("../Login") }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.brandName}>Kotar</Text>
        <Text style={styles.welcomeText}>{t("forgot_password")}</Text>
        
        {step === 1 && <Text style={styles.subText}>Enter your email to get a security code.</Text>}
        {step === 2 && <Text style={styles.subText}>Enter the code sent to your email.</Text>}
        {step === 3 && <Text style={styles.subText}>Create your new strong password.</Text>}
      </View>

      <View style={styles.form}>
        {/* STEP 1: Email Input */}
        {step === 1 && (
          <>
            <TextInput
              style={styles.input}
              placeholder={t("email")}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2: OTP Input */}
        {step === 2 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3: Password Input */}
        {step === 3 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.signUpLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  header: {
    marginTop: 80,
    marginBottom: 30,
    alignItems: "center",
  },
  brandName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#006442",
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: "#F5F5F5",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  button: {
    backgroundColor: "#006442",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  signUpLink: {
    color: "#006442",
    fontWeight: "bold",
  },
});

export default ForgotPassword;
