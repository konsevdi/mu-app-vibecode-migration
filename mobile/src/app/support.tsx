import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Phone, MapPin, MessageCircle, Clock, ExternalLink } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";

const CONTACT_INFO = {
  email: "info@irepair.gr",
  phone: "+30 22410 12345",
  address: "Ρόδος, Ελλάδα",
  hours: "Δευ-Σαβ: 09:00-21:00",
  website: "https://public.irepair.gr",
};

export default function SupportScreen() {
  const openEmail = () => Linking.openURL(`mailto:${CONTACT_INFO.email}?subject=Mobile Unit Support`);
  const openPhone = () => Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  const openWebsite = () => WebBrowser.openBrowserAsync(CONTACT_INFO.website);

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ title: "Υποστήριξη / Support", headerStyle: { backgroundColor: "#0a0a0a" }, headerTintColor: "#fff" }} />
      <LinearGradient colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-black text-white">Χρειάζεστε βοήθεια;</Text>
            <Text className="mt-1 text-base text-gray-400">Need help? We're here for you.</Text>
          </View>

          {/* Email */}
          <Pressable onPress={openEmail} className="mb-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#FF00FF" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              <View className="mr-4 rounded-xl p-3" style={{ backgroundColor: "#FF00FF20" }}>
                <Mail size={24} color="#FF00FF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Email</Text>
                <Text className="text-sm text-gray-400">{CONTACT_INFO.email}</Text>
              </View>
              <ExternalLink size={20} color="#666" />
            </LinearGradient>
          </Pressable>

          {/* Phone */}
          <Pressable onPress={openPhone} className="mb-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#00FF88" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              <View className="mr-4 rounded-xl p-3" style={{ backgroundColor: "#00FF8820" }}>
                <Phone size={24} color="#00FF88" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Τηλέφωνο / Phone</Text>
                <Text className="text-sm text-gray-400">{CONTACT_INFO.phone}</Text>
              </View>
              <ExternalLink size={20} color="#666" />
            </LinearGradient>
          </Pressable>

          {/* Location */}
          <View className="mb-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              <View className="mr-4 rounded-xl p-3" style={{ backgroundColor: "#FFD70020" }}>
                <MapPin size={24} color="#FFD700" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Τοποθεσία / Location</Text>
                <Text className="text-sm text-gray-400">{CONTACT_INFO.address}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Hours */}
          <View className="mb-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
            <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              <View className="mr-4 rounded-xl p-3" style={{ backgroundColor: "#00BFFF20" }}>
                <Clock size={24} color="#00BFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Ωράριο / Hours</Text>
                <Text className="text-sm text-gray-400">{CONTACT_INFO.hours}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Website */}
          <Pressable onPress={openWebsite} className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#00BFFF" }}>
            <LinearGradient colors={["#00BFFF", "#0099CC"]} style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={20} color="#000" />
              <Text className="ml-2 text-base font-black text-black">Επισκεφθείτε το iRepair.gr</Text>
            </LinearGradient>
          </Pressable>

          {/* FAQ Section */}
          <View className="mb-8">
            <Text className="mb-3 text-lg font-bold text-white">Συχνές Ερωτήσεις / FAQ</Text>
            <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
              <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
                <Text className="mb-2 text-sm font-bold text-white">Πώς επικοινωνώ με πωλητή;</Text>
                <Text className="mb-4 text-sm text-gray-400">Πατήστε "Επικοινωνία" στην αγγελία. Όλοι οι σύνδεσμοι αποκλείονται για ασφάλεια.</Text>

                <Text className="mb-2 text-sm font-bold text-white">Πώς αναφέρω ύποπτη συμπεριφορά;</Text>
                <Text className="text-sm text-gray-400">Χρησιμοποιήστε το κουμπί "Αναφορά" ή επικοινωνήστε μαζί μας.</Text>
              </LinearGradient>
            </View>
          </View>

          <View className="h-8" />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
