import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { supabase } from "../../supa/supabase-client";

const { width, height } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SignUp = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Animation values
  const wave1Translate = useRef(new Animated.Value(0)).current;
  const wave2Translate = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(0.5)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Infinite wave animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave1Translate, {
          toValue: -width * 0.6,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(wave1Translate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(wave2Translate, {
          toValue: width * 0.6,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(wave2Translate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating bubble animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleScale, {
          toValue: 1.3,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleScale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleOpacity, {
          toValue: 0.8,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleOpacity, {
          toValue: 0.3,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    console.log("Attempting to sign up with:", { email, fullName });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      Alert.alert("Error", signUpError.message);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert([{ id: data.user.id, full_name: fullName, email: email }]);

    if (profileError) {
      console.log("Profile Sync Info:", profileError.message);
    }

    setLoading(false);
    Alert.alert(
      "Account Created",
      "Your account has been created successfully.",
    );
    router.replace("../../(tabs)");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Animated Background Layer - Same as Login */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg height={height} width={width} style={styles.svgBackground}>
          <Defs>
            <LinearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFB6C1" stopOpacity="0.3" />
              <Stop offset="0.5" stopColor="#006442" stopOpacity="0.4" />
              <Stop offset="1" stopColor="#87CEEB" stopOpacity="0.3" />
            </LinearGradient>
            <LinearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#98FB98" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#006442" stopOpacity="0.4" />
            </LinearGradient>
            <LinearGradient id="grad3" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#E6E6FA" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#FFF0F5" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Rotating decorative circle */}
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Circle
              cx={width * 0.85}
              cy={height * 0.15}
              r="60"
              fill="url(#grad3)"
            />
          </Animated.View>

          {/* Wavy line 1 (moving left) */}
          <AnimatedPath
            d={`M -50 ${height * 0.3} Q ${width * 0.25} ${height * 0.2}, ${width * 0.5} ${height * 0.3} T ${width + 50} ${height * 0.25}`}
            stroke="url(#grad1)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{ transform: [{ translateX: wave1Translate }] }}
          />

          {/* Wavy line 2 (moving right) */}
          <AnimatedPath
            d={`M -50 ${height * 0.45} Q ${width * 0.3} ${height * 0.55}, ${width * 0.6} ${height * 0.4} T ${width + 50} ${height * 0.5}`}
            stroke="url(#grad2)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            style={{ transform: [{ translateX: wave2Translate }] }}
          />

          {/* Wavy line 3 (static but with gradient) */}
          <Path
            d={`M -50 ${height * 0.7} Q ${width * 0.4} ${height * 0.8}, ${width * 0.7} ${height * 0.65} T ${width + 50} ${height * 0.75}`}
            stroke="url(#grad1)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Floating bubbles */}
          <AnimatedCircle
            cx={width * 0.15}
            cy={height * 0.2}
            r="15"
            fill="#FFB6C1"
            opacity={bubbleOpacity}
            style={{ transform: [{ scale: bubbleScale }] }}
          />
          <AnimatedCircle
            cx={width * 0.8}
            cy={height * 0.6}
            r="20"
            fill="#DDA0DD"
            opacity={bubbleOpacity}
            style={{ transform: [{ scale: bubbleScale }] }}
          />
          <AnimatedCircle
            cx={width * 0.9}
            cy={height * 0.8}
            r="12"
            fill="#87CEEB"
            opacity={bubbleOpacity}
            style={{ transform: [{ scale: bubbleScale }] }}
          />
        </Svg>
      </View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brandName}>Kotar</Text>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.subText}>
            Join us to manage your electricity usage
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("../Login/Login")}>
              <Text style={styles.signUpLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  svgBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    marginTop: 80,
    marginBottom: 40,
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
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  button: {
    backgroundColor: "#006442",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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
    marginTop: 30,
    marginBottom: 50,
  },
  footerText: {
    color: "#666",
  },
  signUpLink: {
    color: "#006442",
    fontWeight: "bold",
  },
});

export default SignUp;
