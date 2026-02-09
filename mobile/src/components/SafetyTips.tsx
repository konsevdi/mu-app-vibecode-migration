import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, MapPin, Eye, Link2Off, AlertTriangle, type LucideIcon } from "lucide-react-native";
import { useTranslation } from "@/lib/languageStore";

interface SafetyTipsProps {
  showIRepairSuggestion?: boolean;
}

interface TipItem {
  icon: LucideIcon;
  textEl: string;
  textEn: string;
  color: string;
}

const TIPS: TipItem[] = [
  { icon: MapPin, textEl: "Συναντηθείτε σε δημόσιο, έμπιστο μέρος", textEn: "Meet at a trusted, public place", color: "#00FF88" },
  { icon: Eye, textEl: "Ελέγξτε τη συσκευή πριν πληρώσετε", textEn: "Inspect the device before paying", color: "#00BFFF" },
  { icon: Link2Off, textEl: "Μην μεταβείτε σε άλλη πλατφόρμα", textEn: "Never move off-platform", color: "#FFD700" },
  { icon: AlertTriangle, textEl: "Αναφέρετε ύποπτη συμπεριφορά", textEn: "Report suspicious behavior", color: "#FF6B6B" },
];

export function SafetyTips({ showIRepairSuggestion = false }: SafetyTipsProps) {
  const { t, language } = useTranslation();

  return (
    <View className="mb-5 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
        <View className="mb-3 flex-row items-center">
          <Shield size={20} color="#00FF88" />
          <Text className="ml-2 text-base font-bold uppercase tracking-wider text-white">
            {t("safety_tips_title")}
          </Text>
        </View>

        {showIRepairSuggestion && (
          <View className="mb-3 rounded-xl p-3" style={{ backgroundColor: "#00FF8815" }}>
            <Text className="text-sm font-semibold text-emerald-400">
              {language === "el" ? "💡 Προτεινόμενος τόπος: iRepair Ρόδος" : "💡 Suggested meetup: iRepair Rhodes"}
            </Text>
          </View>
        )}

        {/* Tips based on language */}
        {TIPS.map((tip, index) => (
          <View key={index} className="mb-2 flex-row items-center">
            <tip.icon size={16} color={tip.color} />
            <Text className="ml-3 flex-1 text-sm font-medium text-gray-300">
              {language === "el" ? tip.textEl : tip.textEn}
            </Text>
          </View>
        ))}

        <View className="mt-3 rounded-lg bg-gray-800 p-2">
          <Text className="text-center text-xs font-medium text-gray-500">
            {language === "el"
              ? "🔒 Οι σύνδεσμοι αποκλείονται για ασφάλεια"
              : "🔒 Links are blocked for safety"}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
