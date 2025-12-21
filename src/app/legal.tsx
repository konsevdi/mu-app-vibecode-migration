import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FileText, Shield, Store } from "lucide-react-native";

export default function LegalScreen() {
  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ title: "Νομικά / Legal", headerStyle: { backgroundColor: "#0a0a0a" }, headerTintColor: "#fff" }} />
      <LinearGradient colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

          {/* Greek Section */}
          <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#FF00FF" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="mb-3 flex-row items-center">
                <FileText size={20} color="#FF00FF" />
                <Text className="ml-2 text-lg font-bold text-white">Αποποίηση Ευθύνης</Text>
              </View>
              <Text className="text-sm leading-6 text-gray-300">
                Η Mobile Unit λειτουργεί ως ενδιάμεσος και δεν φέρει καμία ευθύνη για τις ιδιωτικές πωλήσεις μεταξύ χρηστών. Όλες οι συναλλαγές γίνονται αποκλειστικά μεταξύ αγοραστή και πωλητή.
              </Text>
            </LinearGradient>
          </View>

          <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#00FF88" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="mb-3 flex-row items-center">
                <Store size={20} color="#00FF88" />
                <Text className="ml-2 text-lg font-bold text-white">Πωλήσεις iRepair</Text>
              </View>
              <Text className="text-sm leading-6 text-gray-300">
                Η iRepair είναι υπεύθυνη μόνο για τις αγγελίες με ένδειξη "Sold by iRepair". Αυτές οι συσκευές έχουν ελεγχθεί και καλύπτονται από εγγύηση.
              </Text>
            </LinearGradient>
          </View>

          {/* English Section */}
          <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="mb-3 flex-row items-center">
                <FileText size={20} color="#666" />
                <Text className="ml-2 text-lg font-bold text-gray-400">Disclaimer</Text>
              </View>
              <Text className="text-sm leading-6 text-gray-500">
                Mobile Unit operates as an intermediary and bears no liability for private sales between users. All transactions are conducted exclusively between buyer and seller.
              </Text>
            </LinearGradient>
          </View>

          <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="mb-3 flex-row items-center">
                <Store size={20} color="#666" />
                <Text className="ml-2 text-lg font-bold text-gray-400">iRepair Sales</Text>
              </View>
              <Text className="text-sm leading-6 text-gray-500">
                iRepair is responsible only for listings marked "Sold by iRepair". These devices have been inspected and are covered by warranty.
              </Text>
            </LinearGradient>
          </View>

          {/* Safety Notice */}
          <View className="mb-8 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#FFD700" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="mb-3 flex-row items-center">
                <Shield size={20} color="#FFD700" />
                <Text className="ml-2 text-lg font-bold text-white">Ασφάλεια / Safety</Text>
              </View>
              <Text className="text-sm leading-6 text-gray-300">
                Για την ασφάλειά σας, όλοι οι σύνδεσμοι αποκλείονται στη συνομιλία. Συναντηθείτε πάντα σε δημόσιο χώρο.
              </Text>
              <Text className="mt-2 text-sm leading-6 text-gray-500">
                For your safety, all links are blocked in chat. Always meet in a public place.
              </Text>
            </LinearGradient>
          </View>

          <View className="h-8" />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
