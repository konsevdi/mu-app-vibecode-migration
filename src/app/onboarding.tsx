import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Check } from "lucide-react-native";
import { useCityStore } from "@/lib/cityStore";
import type { City } from "@/shared/contracts";

export default function OnboardingScreen() {
  const router = useRouter();
  const defaultCity = useCityStore((s) => s.defaultCity);
  const setDefaultCity = useCityStore((s) => s.setDefaultCity);

  // If city already set, skip onboarding
  if (defaultCity) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSelectCity = (city: City) => {
    setDefaultCity(city);
    router.replace("/(tabs)" as Href);
  };

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1 justify-center px-6">
        <View className="mb-8 items-center">
          <View
            className="mb-6 rounded-3xl p-6"
            style={{ backgroundColor: "#FF00FF20", borderWidth: 2, borderColor: "#FF00FF" }}
          >
            <MapPin size={56} color="#FF00FF" />
          </View>
          <Text className="text-center text-3xl font-black text-white">
            ΕΠΙΛΕΞΕ ΠΟΛΗ
          </Text>
          <Text className="mt-3 text-center text-base font-medium text-gray-400">
            Για να δεις αγγελίες και προτάσεις συνάντησης κοντά σου
          </Text>
        </View>

        <Pressable
          onPress={() => handleSelectCity("rhodes")}
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 2, borderColor: "#00FF88" }}
        >
          <LinearGradient
            colors={["#00FF88", "#00CC6A"]}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18 }}
          >
            <Check size={24} color="#000" />
            <Text className="ml-3 text-xl font-black text-black">
              ΡΟΔΟΣ
            </Text>
          </LinearGradient>
        </Pressable>

        <Text className="mt-6 text-center text-sm font-medium text-gray-500">
          Περισσότερες πόλεις σύντομα
        </Text>
      </SafeAreaView>
    </View>
  );
}
