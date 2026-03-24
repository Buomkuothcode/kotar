import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import "react-native-url-polyfill/auto";

export const supabase = createClient(
  "https://apwvpnpdwkavrujqefxf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwd3ZwbnBkd2thdnJ1anFlZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTU3NTAsImV4cCI6MjA4MjEzMTc1MH0.78Imt1wKpF7aTfqFLy3IMewzGd6oPsLWutvsAPLa3Go",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
