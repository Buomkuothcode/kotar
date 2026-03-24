import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// --- COLOR CONFIGURATION ---
const THEME = {
  primary: "#1e4b89", // MAIN BLUE
  primaryLight: "#2c62b0", // LIGHTER BLUE
  primaryPale: "#e8eff7", // PALE BLUE BACKGROUND
  white: "#FFFFFF",
  textDark: "#121212",
  textGrey: "#9CA3AF",
  accent: "#FFD700", // GOLD/YELLOW
};

export default function MadeyaFluidDesign() {
  const router = useRouter();

  // Animation references
  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const carXAnim = useRef(new Animated.Value(0)).current;
  const carYAnim = useRef(new Animated.Value(0)).current;
  const wheelSpinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const fuelPulseAnim = useRef(new Animated.Value(0)).current;
  const bgStarsAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;

  // Complex car movement - drive loop with bounce effect
  useEffect(() => {
    // Initial entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous car animation loop
    Animated.loop(
      Animated.sequence([
        // Drive forward with slight bounce
        Animated.parallel([
          Animated.timing(carXAnim, {
            toValue: width * 0.7,
            duration: 2500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(carYAnim, {
              toValue: -8,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(carYAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(wheelSpinAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),

        // Pause at station
        Animated.delay(800),

        // Drive off screen
        Animated.parallel([
          Animated.timing(carXAnim, {
            toValue: width + 200,
            duration: 1800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wheelSpinAnim, {
            toValue: 2,
            duration: 1800,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),

        // Reset position (instant)
        Animated.delay(300),
        Animated.timing(carXAnim, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(wheelSpinAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Radar pulse with glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    ).start();

    // Fuel pulse (accent color glow)
    Animated.loop(
      Animated.sequence([
        Animated.timing(fuelPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fuelPulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Background floating particles
    Animated.loop(
      Animated.timing(bgStarsAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Road movement
    Animated.loop(
      Animated.timing(roadAnim, {
        toValue: -width,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Gentle pulse for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Wheel spinning interpolation
  const wheelSpin = wheelSpinAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ["0deg", "720deg", "1440deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* --- ANIMATED BACKGROUND --- */}
      <View style={styles.background}>
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${(i * 7) % 100}%`,
                top: `${(i * 13) % 100}%`,
                opacity: 0.1 + (i % 3) * 0.1,
                transform: [
                  {
                    translateY: bgStarsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 50],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* --- TOP SECTION --- */}
      <View style={styles.topSection}>
        <LinearGradient
          colors={[THEME.primaryPale, THEME.white]}
          style={styles.gradientBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Animated Rings */}
        <Animated.View
          style={[
            styles.ring,
            styles.ring1,
            {
              transform: [
                {
                  scale: radarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={[styles.ring, styles.ring2]} />
        <View style={[styles.ring, styles.ring3]} />

        {/* Main Animation Area */}
        <View style={styles.animationArea}>
          {/* ROAD WITH MOVING LINES */}
          <View style={styles.roadContainer}>
            <Animated.View
              style={[
                styles.roadLines,
                {
                  transform: [{ translateX: roadAnim }],
                },
              ]}
            >
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.roadLine} />
              ))}
            </Animated.View>
          </View>

          {/* Fuel Station with Glowing Effect */}
          <View style={styles.stationContainer}>
            {/* Radar Waves */}
            <Animated.View
              style={[
                styles.radarWave,
                {
                  transform: [
                    {
                      scale: radarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 2],
                      }),
                    },
                  ],
                  opacity: radarAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.6, 0],
                  }),
                },
              ]}
            />

            {/* Fuel Pump with Pulsing Glow */}
            <Animated.View
              style={[
                styles.fuelPump,
                {
                  shadowOpacity: fuelPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.8],
                  }),
                  transform: [
                    {
                      scale: fuelPulseAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.05, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="speedometer" size={44} color={THEME.white} />
              <Animated.View
                style={[
                  styles.fuelGlow,
                  {
                    opacity: fuelPulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.8, 0.3],
                    }),
                  },
                ]}
              />
            </Animated.View>

            {/* Station Building */}
            <View style={styles.stationBuilding}>
              <View style={styles.stationRoof} />
              <View style={styles.stationBody}>
                <View style={styles.stationWindow} />
                <View style={styles.stationDoor} />
              </View>
            </View>
          </View>

          {/* THE CAR - COMPLEX ANIMATION */}
          <Animated.View
            style={[
              styles.carContainer,
              {
                transform: [{ translateX: carXAnim }, { translateY: carYAnim }],
              },
            ]}
          >
            {/* Car Body */}
            <View style={styles.carBody}>
              <LinearGradient
                colors={[THEME.primary, THEME.primaryLight]}
                style={styles.carGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {/* Car Details */}
                <View style={styles.carWindow} />
                <View style={styles.carHeadlight} />
                <View style={styles.carGrill}>
                  {[...Array(5)].map((_, i) => (
                    <View key={i} style={styles.grillLine} />
                  ))}
                </View>
              </LinearGradient>

              {/* Spinning Wheels */}
              <Animated.View
                style={[
                  styles.carWheel,
                  styles.wheelFront,
                  { transform: [{ rotate: wheelSpin }] },
                ]}
              >
                <View style={styles.wheelRim} />
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.wheelSpoke,
                      { transform: [{ rotate: `${i * 72}deg` }] },
                    ]}
                  />
                ))}
              </Animated.View>

              <Animated.View
                style={[
                  styles.carWheel,
                  styles.wheelBack,
                  { transform: [{ rotate: wheelSpin }] },
                ]}
              >
                <View style={styles.wheelRim} />
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.wheelSpoke,
                      { transform: [{ rotate: `${i * 72}deg` }] },
                    ]}
                  />
                ))}
              </Animated.View>
            </View>

            {/* Exhaust Particles */}
            <Animated.View style={styles.exhaustContainer}>
              {[...Array(3)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.exhaustPuff,
                    {
                      opacity: carXAnim.interpolate({
                        inputRange: [0, width * 0.7, width],
                        outputRange: [0, 0.4, 0],
                      }),
                      transform: [
                        {
                          translateX: carXAnim.interpolate({
                            inputRange: [0, width],
                            outputRange: [0, -i * 10],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </Animated.View>
          </Animated.View>

          {/* Speed Lines */}
          <Animated.View style={styles.speedLines}>
            {[...Array(6)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.speedLine,
                  {
                    opacity: carXAnim.interpolate({
                      inputRange: [0, width * 0.5, width],
                      outputRange: [0, 0.3 - i * 0.05, 0],
                    }),
                    transform: [
                      {
                        translateX: carXAnim.interpolate({
                          inputRange: [0, width],
                          outputRange: [0, -i * 50 - 100],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>

        {/* Brand Title */}
        <Animated.View style={[styles.brandContainer, { opacity: fadeAnim }]}>
          <Text style={styles.brandTitle}>MADEYA</Text>
          <Text style={styles.brandSubtitle}>FUEL INTELLIGENCE</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>
      </View>

      {/* --- BOTTOM SECTION --- */}
      <Animated.View
        style={[
          styles.bottomSection,
          { transform: [{ translateY: slideUpAnim }] },
        ]}
      >
        {/* Curved Top Edge */}
        <View style={styles.curveContainer}>
          <View style={styles.curve} />
          <View style={styles.curveShadow} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headlineContainer}>
            <Text style={styles.headline}>EFFORTLESS</Text>
            <Text style={[styles.headline, styles.headlineAccent]}>
              FUEL EXPERIENCE
            </Text>
          </View>

          {/* CTA Buttons */}
          <Animated.View
            style={[styles.ctaContainer, { transform: [{ scale: pulseAnim }] }]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("../Login/Login")}
              style={styles.primaryCTA}
            >
              <LinearGradient
                colors={[THEME.white, "#f8f9fa"]}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.ctaText}>IGNITE YOUR JOURNEY</Text>
                <View style={styles.ctaIcon}>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={28}
                    color={THEME.primary}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("../Account/account")}
              style={styles.secondaryCTA}
            >
              <Text style={styles.secondaryCTAText}>
                New to Madeya?{" "}
                <Text style={styles.secondaryCTAAccent}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.primaryLight,
  },
  topSection: {
    flex: 0.6,
    position: "relative",
    overflow: "hidden",
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: "absolute",
    borderRadius: 500,
    borderWidth: 1,
    borderColor: "rgba(30, 75, 137, 0.1)",
  },
  ring1: {
    top: -150,
    right: -100,
    width: 300,
    height: 300,
  },
  ring2: {
    top: -80,
    left: -120,
    width: 400,
    height: 400,
    borderColor: "rgba(30, 75, 137, 0.07)",
  },
  ring3: {
    top: 100,
    right: -150,
    width: 250,
    height: 250,
    borderColor: "rgba(30, 75, 137, 0.05)",
  },
  animationArea: {
    height: 250,
    marginTop: 40,
    position: "relative",
  },
  roadContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    height: 4,
    overflow: "hidden",
  },
  roadLines: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    left: 0,
  },
  roadLine: {
    width: 40,
    height: 4,
    backgroundColor: THEME.primaryLight,
    marginRight: 60,
    borderRadius: 2,
    opacity: 0.6,
  },
  stationContainer: {
    position: "absolute",
    top: 80,
    right: 40,
    alignItems: "center",
    zIndex: 10,
  },
  radarWave: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primaryLight,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  fuelPump: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    zIndex: 2,
  },
  fuelGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    backgroundColor: THEME.accent,
    zIndex: -1,
  },
  stationBuilding: {
    marginTop: 10,
    alignItems: "center",
  },
  stationRoof: {
    width: 60,
    height: 15,
    backgroundColor: THEME.primaryLight,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  stationBody: {
    width: 50,
    height: 40,
    backgroundColor: THEME.primary,
    borderRadius: 5,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stationWindow: {
    width: 15,
    height: 15,
    backgroundColor: THEME.accent,
    borderRadius: 3,
  },
  stationDoor: {
    width: 15,
    height: 20,
    backgroundColor: THEME.primaryLight,
    borderRadius: 3,
    alignSelf: "flex-end",
  },
  carContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    zIndex: 20,
  },
  carBody: {
    width: 140,
    height: 50,
    borderRadius: 25,
    position: "relative",
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  carGradient: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carWindow: {
    width: 40,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  carHeadlight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.accent,
    elevation: 5,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  carGrill: {
    position: "absolute",
    bottom: 10,
    left: 30,
    flexDirection: "row",
    gap: 2,
  },
  grillLine: {
    width: 2,
    height: 8,
    backgroundColor: THEME.primaryLight,
    borderRadius: 1,
  },
  carWheel: {
    position: "absolute",
    bottom: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#222",
  },
  wheelFront: {
    right: 10,
  },
  wheelBack: {
    left: 10,
  },
  wheelRim: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#888",
    borderWidth: 2,
    borderColor: "#aaa",
  },
  wheelSpoke: {
    position: "absolute",
    width: 2,
    height: 12,
    backgroundColor: "#aaa",
    top: 3,
  },
  exhaustContainer: {
    position: "absolute",
    right: -20,
    bottom: 10,
    flexDirection: "row",
    gap: 2,
  },
  exhaustPuff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666",
  },
  speedLines: {
    position: "absolute",
    right: 0,
    bottom: 40,
    flexDirection: "row",
    gap: 10,
  },
  speedLine: {
    width: 40,
    height: 3,
    backgroundColor: THEME.primary,
    borderRadius: 1.5,
  },
  brandContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: THEME.primary,
    letterSpacing: -1,
    textShadowColor: "rgba(30, 75, 137, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: THEME.primaryLight,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: -5,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: THEME.accent,
    marginTop: 5,
    borderRadius: 1.5,
  },
  bottomSection: {
    flex: 0.4,
    backgroundColor: THEME.primary,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  curveContainer: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 60,
    overflow: "hidden",
  },
  curve: {
    width: width * 1.5,
    height: 120,
    backgroundColor: THEME.primary,
    borderRadius: width,
    alignSelf: "center",
    top: 0,
  },
  curveShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    top: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headlineContainer: {
    marginBottom: 25,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.white,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headlineAccent: {
    position: "relative",
    color: THEME.white,
  },
  headlineSpark: {
    position: "absolute",
    right: -40,
    top: 0,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: "45%",
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  featureText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "600",
  },
  ctaContainer: {
    gap: 15,
  },
  primaryCTA: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ctaGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  ctaText: {
    color: THEME.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30, 75, 137, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCTA: {
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryCTAText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryCTAAccent: {
    color: THEME.white,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
