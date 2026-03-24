import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const MapSkeleton = () => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const SkeletonItem = ({ style, children }) => (
    <View
      style={[
        style,
        { backgroundColor: "#E2E8F0", borderRadius: 8, overflow: "hidden" },
      ]}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.3)",
          transform: [{ translateX }],
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      {children}
    </View>
  );

  return (
    <View style={[styles.loadingOverlay, { backgroundColor: "#F1F5F9" }]}>
      {/* Fake header */}
      <View
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          right: 20,
          zIndex: 10,
        }}
      >
        <SkeletonItem style={{ width: "100%", height: 56, borderRadius: 20 }} />
      </View>

      {/* Fake map tiles */}
      <View style={{ flex: 1, marginTop: 100 }}>
        {/* Grid lines */}
        <View style={{ flexDirection: "row", flex: 1 }}>
          <View
            style={{ flex: 1, borderRightWidth: 1, borderColor: "#CBD5E1" }}
          >
            <SkeletonItem
              style={{
                width: "90%",
                height: 80,
                margin: 10,
                alignSelf: "center",
              }}
            />
            <SkeletonItem
              style={{
                width: "70%",
                height: 60,
                margin: 10,
                alignSelf: "center",
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonItem
              style={{
                width: "80%",
                height: 100,
                margin: 10,
                alignSelf: "center",
              }}
            />
            <SkeletonItem
              style={{
                width: "60%",
                height: 50,
                margin: 10,
                alignSelf: "center",
              }}
            />
          </View>
        </View>

        {/* Fake marker clusters */}
        <View style={{ position: "absolute", top: "30%", left: "20%" }}>
          <SkeletonItem style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>
        <View style={{ position: "absolute", bottom: "25%", right: "30%" }}>
          <SkeletonItem style={{ width: 50, height: 50, borderRadius: 25 }} />
        </View>
        <View style={{ position: "absolute", top: "60%", left: "50%" }}>
          <SkeletonItem style={{ width: 35, height: 35, borderRadius: 18 }} />
        </View>

        {/* Bottom controls skeleton */}
        <View style={{ position: "absolute", bottom: 320, right: 20 }}>
          <SkeletonItem
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginBottom: 10,
            }}
          />
          <SkeletonItem
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginBottom: 10,
            }}
          />
          <SkeletonItem style={{ width: 50, height: 50, borderRadius: 25 }} />
        </View>

        {/* Floating card skeleton */}
        <View
          style={{ position: "absolute", bottom: 110, left: 20, right: 20 }}
        >
          <SkeletonItem
            style={{ width: "100%", height: 180, borderRadius: 28 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default MapSkeleton;
