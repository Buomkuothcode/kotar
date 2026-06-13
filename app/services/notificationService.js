import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { toEthiopian, toGregorian } from "../utils/ethiopianCalendar";

// Set up the default handler to display notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const LOCALIZED_REMINDERS = {
  en: {
    title: "Monthly Payment Reminder",
    body: "Your monthly payment period has started. Please make your payment between the 26th and 30th.",
  },
  am: {
    title: "የወር ክፍያ ማስታወቂያ",
    body: "የወር ክፍያ ጊዜዎ ተጀምሯል። እባክዎ ከ26 እስከ 30 ባለው ጊዜ ውስጥ ክፍያዎን ይፈጽሙ።",
  },
  or: {
    title: "Yaadachiisa Kafaltii Ji'aa",
    body: "Yeroon kafaltii ji'aa keessanii jalqabeera. Maaloo guyyaa 26 hanga 30tti kafaltii raawwadhaa.",
  },
};

/**
 * Requests push notification permissions from the operating system
 * and sets up notification channels on Android.
 * @returns {Promise<boolean>} True if permissions are granted, false otherwise.
 */
export async function requestPermissions() {
  if (Platform.OS === "web") return false;

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission not granted.");
      return false;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("payment-reminders", {
        name: "Payment Reminders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#006442", // Matches primary green theme
      });
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Calculates and schedules local notifications for the 26th to the 30th
 * of the current and next two Ethiopian months.
 */
export async function schedulePaymentNotifications() {
  if (Platform.OS === "web") return;

  try {
    // 1. Get saved language to decide which localization to use
    const savedLanguage = await AsyncStorage.getItem("user_language");
    const lang =
      savedLanguage === "am" || savedLanguage === "or" ? savedLanguage : "en";
    const content = LOCALIZED_REMINDERS[lang];

    // 2. Cancel any existing scheduled notifications to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Cancelled all existing scheduled notifications.");

    // 3. Get current Gregorian date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JS month is 0-indexed
    const currentDay = now.getDate();

    // 4. Convert today to Ethiopian date
    const currentEth = toEthiopian(currentYear, currentMonth, currentDay);
    console.log(
      `Current Ethiopian Date: Year ${currentEth.year}, Month ${currentEth.month}, Day ${currentEth.day}`,
    );

    const scheduleList = [];

    // 5. Loop through current month and the next 2 months (total of 3 Ethiopian months)
    for (let mOffset = 0; mOffset < 3; mOffset++) {
      let targetMonth = currentEth.month + mOffset;
      let targetYear = currentEth.year;

      if (targetMonth > 13) {
        targetMonth = targetMonth - 13;
        targetYear = targetYear + 1;
      }

      // Skip the 13th month (Pagume) as it only has 5 or 6 days (no days 26-30)
      if (targetMonth === 13) {
        continue;
      }

      // Schedule for days 26 to 30 of the target month
      for (let day = 26; day <= 30; day++) {
        // Convert target Ethiopian date to Gregorian
        const gregDate = toGregorian(targetYear, targetMonth, day);

        // Schedule reminder for 9:00 AM local time
        const reminderDate = new Date(
          gregDate.year,
          gregDate.month - 1,
          gregDate.day,
          9,
          0,
          0,
        );

        // Only schedule future dates
        if (reminderDate.getTime() > now.getTime()) {
          scheduleList.push({
            date: reminderDate,
            ethDate: `${targetMonth}/${day}/${targetYear}`,
          });
        }
      }
    }

    // Sort scheduled dates chronologically
    scheduleList.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Schedule up to the next 15 reminders (covering 3 months, 5 days each)
    const limit = Math.min(scheduleList.length, 15);
    for (let i = 0; i < limit; i++) {
      const item = scheduleList[i];
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId:
            Platform.OS === "android" ? "payment-reminders" : undefined,
        },
        trigger: {
          type: "date",
          date: item.date,
        },
      });
      console.log(
        `Scheduled notification ${identifier} for Ethiopian date ${item.ethDate} -> Gregorian: ${item.date.toString()}`,
      );
    }

    console.log(`Successfully scheduled ${limit} monthly payment reminders.`);
  } catch (error) {
    console.error("Error scheduling payment notifications:", error);
  }
}
