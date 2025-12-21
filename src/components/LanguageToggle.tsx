import React from "react";
import { View, Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Globe } from "lucide-react-native";
import { useLanguageStore, type Language } from "@/lib/languageStore";
import * as Haptics from "expo-haptics";

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const handleToggle = (lang: Language) => {
    if (lang !== language) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLanguage(lang);
    }
  };

  if (compact) {
    return (
      <View className="flex-row items-center">
        <Pressable
          onPress={() => handleToggle(language === "el" ? "en" : "el")}
          className="flex-row items-center rounded-full px-3 py-2"
          style={{ backgroundColor: "#FF00FF20", borderWidth: 1, borderColor: "#FF00FF" }}
        >
          <Globe size={16} color="#FF00FF" />
          <Text className="ml-2 text-sm font-bold text-fuchsia-400">
            {language.toUpperCase()}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-center overflow-hidden rounded-xl" style={{ borderWidth: 2, borderColor: "#333" }}>
      <Pressable
        onPress={() => handleToggle("el")}
        className="flex-1"
      >
        <LinearGradient
          colors={language === "el" ? ["#FF00FF", "#CC00CC"] : ["#1a1a2e", "#0f0f23"]}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <Text className={`text-base font-bold ${language === "el" ? "text-white" : "text-gray-400"}`}>
            ΕΛ
          </Text>
        </LinearGradient>
      </Pressable>
      <View className="w-0.5 bg-gray-700" />
      <Pressable
        onPress={() => handleToggle("en")}
        className="flex-1"
      >
        <LinearGradient
          colors={language === "en" ? ["#FF00FF", "#CC00CC"] : ["#1a1a2e", "#0f0f23"]}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <Text className={`text-base font-bold ${language === "en" ? "text-white" : "text-gray-400"}`}>
            EN
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
