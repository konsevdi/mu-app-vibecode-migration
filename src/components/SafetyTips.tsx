import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, MapPin, Eye, Link2Off, AlertTriangle } from "lucide-react-native";

interface SafetyTipsProps {
  showIRepairSuggestion?: boolean;
}

const TIPS_EL = [
  { icon: MapPin, text: "Συναντηθείτε σε δημόσιο, έμπιστο μέρος", color: "#00FF88" },
  { icon: Eye, text: "Ελέγξτε τη συσκευή πριν πληρώσετε", color: "#00BFFF" },
  { icon: Link2Off, text: "Μην μεταβείτε σε άλλη πλατφόρμα", color: "#FFD700" },
  { icon: AlertTriangle, text: "Αναφέρετε ύποπτη συμπεριφορά", color: "#FF6B6B" },
];

const TIPS_EN = [
  { icon: MapPin, text: "Meet at a trusted, public place", color: "#00FF88" },
  { icon: Eye, text: "Inspect the device before paying", color: "#00BFFF" },
  { icon: Link2Off, text: "Never move off-platform", color: "#FFD700" },
  { icon: AlertTriangle, text: "Report suspicious behavior", color: "#FF6B6B" },
];

export function SafetyTips({ showIRepairSuggestion = false }: SafetyTipsProps) {
  return (
    <View className="mb-5 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
        <View className="mb-3 flex-row items-center">
          <Shield size={20} color="#00FF88" />
          <Text className="ml-2 text-base font-bold uppercase tracking-wider text-white">
            Συμβουλές Ασφαλείας
          </Text>
        </View>

        {showIRepairSuggestion && (
          <View className="mb-3 rounded-xl p-3" style={{ backgroundColor: "#00FF8815" }}>
            <Text className="text-sm font-semibold text-emerald-400">
              💡 Προτεινόμενος τόπος: iRepair Ρόδος
            </Text>
            <Text className="mt-1 text-xs font-medium text-gray-400">
              Suggested meetup: iRepair Rhodes
            </Text>
          </View>
        )}

        {/* Greek Tips */}
        {TIPS_EL.map((tip, index) => (
          <View key={`el-${index}`} className="mb-2 flex-row items-center">
            <tip.icon size={16} color={tip.color} />
            <Text className="ml-3 flex-1 text-sm font-medium text-gray-300">{tip.text}</Text>
          </View>
        ))}

        <View className="my-3 h-px bg-gray-700" />

        {/* English Tips */}
        {TIPS_EN.map((tip, index) => (
          <View key={`en-${index}`} className="mb-2 flex-row items-center">
            <tip.icon size={16} color={tip.color} />
            <Text className="ml-3 flex-1 text-sm font-medium text-gray-500">{tip.text}</Text>
          </View>
        ))}

        <View className="mt-3 rounded-lg bg-gray-800 p-2">
          <Text className="text-center text-xs font-medium text-gray-500">
            🔒 Links are blocked for safety • Οι σύνδεσμοι αποκλείονται
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
