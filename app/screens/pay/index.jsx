import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

// Create animated versions of SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const PaymentComingSoon = () => {
  const router = useRouter();

  // Animation Refs
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Floating Card & Bubbles
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 2. Pulse for Glow and Dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 3. Constant Background Rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  // Interpolations
  const cardTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* BACKGROUND ANIMATION */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg height={height} width={width}>
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#f0fdf4" stopOpacity="1" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#006442" />
              <Stop offset="1" stopColor="#059669" />
            </LinearGradient>
          </Defs>

          <Rect width={width} height={height} fill="url(#bgGrad)" />

          {/* Animated Background Blobs */}
          <AnimatedG
            style={{ transform: [{ rotate: rotation }, { scale: pulseAnim }] }}
          >
            <Circle
              cx={width * 0.9}
              cy={height * 0.2}
              r="100"
              fill="#006442"
              opacity="0.05"
            />
            <Circle
              cx={width * 0.1}
              cy={height * 0.8}
              r="150"
              fill="#006442"
              opacity="0.05"
            />
          </AnimatedG>
        </Svg>
      </View>

      {/* BACK BUTTON */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#006442" />
      </TouchableOpacity>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.brandName}>Kotar</Text>

        {/* FLOATING CARD */}
        <Animated.View
          style={[styles.card, { transform: [{ translateY: cardTranslateY }] }]}
        >
          <Svg height="180" width="300" viewBox="0 0 300 180">
            <Rect width="300" height="180" rx="20" fill="url(#cardGrad)" />
            <Rect x="25" y="40" width="45" height="30" rx="5" fill="#fbbf24" />
            <Rect
              x="25"
              y="100"
              width="180"
              height="10"
              rx="5"
              fill="white"
              opacity="0.3"
            />
            <Rect
              x="25"
              y="120"
              width="120"
              height="10"
              rx="5"
              fill="white"
              opacity="0.3"
            />
            <Circle cx="240" cy="140" r="20" fill="white" opacity="0.2" />
            <Circle cx="260" cy="140" r="20" fill="white" opacity="0.2" />
          </Svg>
        </Animated.View>

        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          We're building a secure and seamless way for you to handle
          transactions.
        </Text>

        {/* PULSING DOTS */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.2],
                    outputRange: [0.4, 1],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#006442",
    marginBottom: 40,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 40,
  },
  title: { fontSize: 24, fontWeight: "600", color: "#333" },
  subtitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#006442",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 22,
    marginBottom: 30,
  },
  dotsContainer: { flexDirection: "row", marginBottom: 40 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#006442",
    marginHorizontal: 5,
  },
  button: {
    backgroundColor: "#006442",
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default PaymentComingSoon;
