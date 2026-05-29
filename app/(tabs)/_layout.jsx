import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLanguage } from "../languages/LanguageContext";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#006442", // Your updated primary blue
  inactive: "#94A3B8",
  background: "#FFFFFF",
  line: "#F1F5F9",
  textHeader: "#0F172A",
};

// --- ARCHITECTURAL TAB ICON ---
const TabIcon = ({ name, label, focused, index }) => {
  return (
    <View style={styles.tabItemContainer}>
      <View
        style={[
          styles.indicatorBeam,
          { backgroundColor: focused ? COLORS.primary : "transparent" },
        ]}
      />

      <View style={styles.iconWrapper}>
        <Ionicons
          name={focused ? name : `${name}-outline`}
          size={22}
          color={focused ? COLORS.primary : COLORS.inactive}
        />
      </View>

      <Text
        style={[
          styles.tabLabel,
          { color: focused ? COLORS.textHeader : COLORS.inactive },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

// --- ARCHITECTURAL HEADER ---
const ModernHeader = ({ title }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={styles.userRefRow}>
            <View style={styles.activeStatusDot} />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.avatarFrame}>
          <Image
            source={{
              uri: "https://ui-avatars.com/api/?name=Devi&background=1aa4ffff&color=fff",
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.avatarBracket} />
        </View>
      </View>
      {/* Drafting Ruler Line */}
      <View style={styles.rulerLine}>
        <View style={styles.rulerNotch} />
        <View style={[styles.rulerNotch, { marginLeft: "auto" }]} />
      </View>
    </View>
  );
};

const AppLayout = () => {
  const { t } = useLanguage();

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Tabs
        screenOptions={{
          headerShown: true,
          header: ({ options }) => (
            <ModernHeader title={options.headerTitle || "DASHBOARD"} />
          ),
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: (t("home") || "HOME").toUpperCase(),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="grid" label={t("home") || "Home"} focused={focused} index={0} />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        <Tabs.Screen
          name="meter"
          options={{
            headerTitle: (t("meter") || "Meter").toUpperCase(),
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="speedometer"
                label={t("meter") || "Meter"}
                focused={focused}
                index={1}
              />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />
        <Tabs.Screen
          name="bill"
          options={{
            headerTitle: (t("billing") || "BILLING").toUpperCase(),
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="receipt"
                label={t("billing") || "Billing"}
                focused={focused}
                index={1}
              />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        <Tabs.Screen
          name="history"
          options={{
            headerTitle: (t("history") || "LEDGER_DATA").toUpperCase(),
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="layers"
                label={t("history") || "History"}
                focused={focused}
                index={2}
              />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        <Tabs.Screen
          name="account"
          options={{
            headerTitle: (t("profile") || "USER_PROFILE").toUpperCase(),
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="person-circle"
                label={t("profile") || "Profile"}
                focused={focused}
                index={3}
              />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />
      </Tabs>
    </>
  );
};

const styles = StyleSheet.create({
  // TAB BAR STYLES
  tabBar: {
    height: Platform.OS === "ios" ? 95 : 75,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    elevation: 0,
    paddingTop: 0,
  },
  tabItemContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: width / 4,
    height: "100%",
  },
  indicatorBeam: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  techNumber: {
    fontSize: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "bold",
    marginRight: 2,
    marginTop: -2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "900",
    marginTop: 6,
    letterSpacing: 1,
  },

  // HEADER STYLES
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 25,
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  userRefRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  userRefText: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.inactive,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textHeader,
    letterSpacing: -1,
  },
  avatarFrame: {
    padding: 4,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 0, // Architects prefer squares/rectangles
  },
  avatarBracket: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: COLORS.primary,
  },
  rulerLine: {
    height: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  rulerNotch: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.inactive,
  },
});

export default AppLayout;