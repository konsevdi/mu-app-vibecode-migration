import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Sun, Moon, Check, ExternalLink } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import * as WebBrowser from "expo-web-browser";

const EXTERNAL_BOOKING_URL = "https://public.irepair.gr/service-app";

// Generate next 14 days
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    // Skip Sundays
    if (date.getDay() !== 0) {
      dates.push(date);
    }
  }
  return dates;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" });
};

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | null>(null);

  const dates = generateDates();

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedSlot) throw new Error("Select date and time");
      return api.post("/api/appointments", {
        date: selectedDate.toISOString(),
        timeSlot: selectedSlot,
        listingId: listingId ?? null,
      });
    },
    onSuccess: () => {
      Alert.alert(
        "Ραντεβού Κλείστηκε!",
        "Θα λάβετε επιβεβαίωση σύντομα.\n\nAppointment booked! You'll receive confirmation shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: () => {
      Alert.alert("Σφάλμα", "Δοκιμάστε ξανά ή χρησιμοποιήστε το online booking.");
    },
  });

  const openExternalBooking = () => {
    WebBrowser.openBrowserAsync(EXTERNAL_BOOKING_URL);
  };

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ title: "Κλείσε Ραντεβού", headerStyle: { backgroundColor: "#0a0a0a" }, headerTintColor: "#fff" }} />
      <LinearGradient colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-black text-white">Βαθμολόγηση στο iRepair</Text>
            <Text className="mt-1 text-base text-gray-400">Get your device graded at iRepair Rhodes</Text>
          </View>

          {/* Date Selection */}
          <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
            <Calendar size={16} color="#FF00FF" /> Επιλέξτε Ημερομηνία
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" style={{ flexGrow: 0 }}>
            {dates.map((date, index) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDate(date)}
                  className="mr-3 overflow-hidden rounded-xl"
                  style={{ borderWidth: 2, borderColor: isSelected ? "#FF00FF" : "#333", minWidth: 80 }}
                >
                  <LinearGradient
                    colors={isSelected ? ["#FF00FF20", "#0f0f23"] : ["#1a1a2e", "#0f0f23"]}
                    style={{ padding: 12, alignItems: "center" }}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? "text-fuchsia-400" : "text-gray-500"}`}>
                      {date.toLocaleDateString("el-GR", { weekday: "short" })}
                    </Text>
                    <Text className={`text-lg font-black ${isSelected ? "text-white" : "text-gray-300"}`}>
                      {date.getDate()}
                    </Text>
                    <Text className={`text-xs ${isSelected ? "text-fuchsia-400" : "text-gray-500"}`}>
                      {date.toLocaleDateString("el-GR", { month: "short" })}
                    </Text>
                    {isSelected && <Check size={16} color="#FF00FF" style={{ marginTop: 4 }} />}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Time Slot Selection */}
          <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">Επιλέξτε Ώρα</Text>
          <View className="mb-6 flex-row">
            <Pressable
              onPress={() => setSelectedSlot("morning")}
              className="mr-3 flex-1 overflow-hidden rounded-xl"
              style={{ borderWidth: 2, borderColor: selectedSlot === "morning" ? "#00FF88" : "#333" }}
            >
              <LinearGradient
                colors={selectedSlot === "morning" ? ["#00FF8820", "#0f0f23"] : ["#1a1a2e", "#0f0f23"]}
                style={{ padding: 16, alignItems: "center" }}
              >
                <Sun size={24} color={selectedSlot === "morning" ? "#00FF88" : "#666"} />
                <Text className={`mt-2 text-base font-bold ${selectedSlot === "morning" ? "text-emerald-400" : "text-gray-400"}`}>
                  Πρωί
                </Text>
                <Text className="text-xs text-gray-500">09:00 - 14:00</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setSelectedSlot("afternoon")}
              className="flex-1 overflow-hidden rounded-xl"
              style={{ borderWidth: 2, borderColor: selectedSlot === "afternoon" ? "#FFD700" : "#333" }}
            >
              <LinearGradient
                colors={selectedSlot === "afternoon" ? ["#FFD70020", "#0f0f23"] : ["#1a1a2e", "#0f0f23"]}
                style={{ padding: 16, alignItems: "center" }}
              >
                <Moon size={24} color={selectedSlot === "afternoon" ? "#FFD700" : "#666"} />
                <Text className={`mt-2 text-base font-bold ${selectedSlot === "afternoon" ? "text-yellow-400" : "text-gray-400"}`}>
                  Απόγευμα
                </Text>
                <Text className="text-xs text-gray-500">14:00 - 21:00</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Book Button */}
          <Pressable
            onPress={() => bookMutation.mutate()}
            disabled={!selectedDate || !selectedSlot || bookMutation.isPending}
            className="mb-4 overflow-hidden rounded-2xl"
            style={{ borderWidth: 2, borderColor: selectedDate && selectedSlot ? "#00FF88" : "#333", opacity: selectedDate && selectedSlot ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={selectedDate && selectedSlot ? ["#00FF88", "#00CC6A"] : ["#333", "#222"]}
              style={{ padding: 18, alignItems: "center" }}
            >
              <Text className={`text-lg font-black ${selectedDate && selectedSlot ? "text-black" : "text-gray-500"}`}>
                {bookMutation.isPending ? "ΚΡΑΤΗΣΗ..." : "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ"}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* External Booking (Secondary) */}
          <Pressable onPress={openExternalBooking} className="mb-8 rounded-xl bg-gray-800 px-4 py-3">
            <View className="flex-row items-center justify-center">
              <Text className="text-sm font-bold text-gray-400">Ή κλείσε online στο iRepair.gr</Text>
              <ExternalLink size={14} color="#666" style={{ marginLeft: 8 }} />
            </View>
          </Pressable>

          <View className="h-8" />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
