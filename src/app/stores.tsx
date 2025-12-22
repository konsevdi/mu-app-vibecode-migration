import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  ChevronRight,
  Shield,
  Star,
  Wrench,
  Mail,
  Globe,
} from "lucide-react-native";

// V1: Rhodes only stores
const STORES = [
  {
    id: "irepair-rhodes",
    name: "iRepair Rhodes",
    nameEl: "iRepair ΡΟΔΟΣ",
    address: "Αμμοχωστου 18, 85131, Ροδος, Ελλαδα",
    addressEn: "Ammochostou 18, 85131, Rhodes, Greece",
    phone: "+302241034175",
    email: "rhodes@irepair.gr",
    hours: "09:00 - 19:00",
    hoursSat: "09:00 - 15:00",
    hoursNote: "ΔΕΥ - ΠΑΡ 09:00-19:00, ΣΑΒ 09:00-15:00",
    hoursNoteEn: "MON-FRI 09:00-19:00, SAT 09:00-15:00",
    isPrimary: true,
    coords: { lat: 36.4349, lng: 28.2176 },
    services: ["ΔΙΑΓΝΩΣΤΙΚΑ", "ΕΠΙΣΚΕΥΕΣ", "ΑΞΙΟΛΟΓΗΣΗ", "ΠΩΛΗΣΕΙΣ"],
    website: "https://irepair.gr/rhodes",
    // Use the exact short links provided by user - these open the correct pins
    appleMapsUrl: "https://maps.apple.com/place?auid=14519752468660046668",
    googleMapsUrl: "https://maps.app.goo.gl/34kjfjbVnCZSGNCc9",
  },
  {
    id: "irepair-spot",
    name: "iRepair Spot",
    nameEl: "iRepair Spot @ Public + home Νεα Μαρινα",
    address: "Αυστραλιας 84-86, 85100, Ροδος, Ελλαδα",
    addressEn: "Australias 84-86, 85100, Rhodes, Greece",
    phone: "+302241077637",
    email: "publicrhodes@irepair.gr",
    hours: "09:00 - 17:00",
    hoursNote: "ΔΕΥ - ΠΑΡ 09:00-17:00",
    hoursNoteEn: "MON - FRI 09:00-17:00",
    isPrimary: false,
    coords: { lat: 36.4412, lng: 28.2234 },
    services: ["ΔΙΑΓΝΩΣΤΙΚΑ", "ΑΞΙΟΛΟΓΗΣΗ"],
    website: "https://irepair.gr/rhodes",
    // Use the exact short links provided by user - these open the correct pins
    appleMapsUrl: "https://maps.apple.com/place?auid=5765285026927199668",
    googleMapsUrl: "https://maps.app.goo.gl/S5tHHt7Lu6VBDT768",
  },
];

function openMaps(store: typeof STORES[0]) {
  if (Platform.OS === "ios") {
    // Use hardcoded Apple Maps link, fallback to Google Maps
    Linking.openURL(store.appleMapsUrl).catch(() => {
      Linking.openURL(store.googleMapsUrl);
    });
  } else {
    // Use hardcoded Google Maps link
    Linking.openURL(store.googleMapsUrl);
  }
}

function StoreCard({ store }: { store: typeof STORES[0] }) {
  const router = useRouter();

  return (
    <View className="mb-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: store.isPrimary ? "#00FF88" : "#333" }}>
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 20 }}>
        {/* Header */}
        <View className="mb-4 flex-row items-center">
          <View
            className="mr-3 rounded-xl p-3"
            style={{ backgroundColor: store.isPrimary ? "#00FF8820" : "#FF00FF20" }}
          >
            <Shield size={24} color={store.isPrimary ? "#00FF88" : "#FF00FF"} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-xl font-black text-white">{store.name}</Text>
              {store.isPrimary && (
                <View className="ml-2 rounded-full bg-emerald-500/20 px-2 py-1" style={{ borderWidth: 1, borderColor: "#00FF88" }}>
                  <Text className="text-xs font-bold text-emerald-400">ΚΥΡΙΟ</Text>
                </View>
              )}
            </View>
            <Text className="mt-1 text-sm text-gray-400">{store.nameEl}</Text>
          </View>
        </View>

        {/* Address */}
        <Pressable
          onPress={() => openMaps(store)}
          className="mb-3 flex-row items-start rounded-xl bg-black/30 p-3"
        >
          <MapPin size={18} color="#FF00FF" style={{ marginTop: 2 }} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-medium text-white">{store.address}</Text>
            <Text className="mt-1 text-xs text-gray-500">{store.addressEn}</Text>
          </View>
          <Navigation size={18} color="#00FF88" />
        </Pressable>

        {/* Hours & Phone */}
        <View className="mb-3 flex-row">
          <View className="mr-2 flex-1 rounded-xl bg-black/30 p-3">
            <View className="flex-row items-center">
              <Clock size={16} color="#FFD700" />
              <Text className="ml-2 text-xs font-bold text-gray-500">ΩΡΑΡΙΟ</Text>
            </View>
            <Text className="mt-1 text-xs text-white">{store.hoursNote}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`tel:${store.phone}`)}
            className="flex-row items-center rounded-xl bg-black/30 px-4 py-3"
          >
            <Phone size={16} color="#00BFFF" />
            <Text className="ml-2 text-sm font-bold text-sky-400">ΚΛΗΣΗ</Text>
          </Pressable>
        </View>

        {/* Email */}
        <Pressable
          onPress={() => Linking.openURL(`mailto:${store.email}`)}
          className="mb-4 flex-row items-center rounded-xl bg-black/30 p-3"
        >
          <Mail size={16} color="#FF00FF" />
          <Text className="ml-2 text-sm text-gray-300">{store.email}</Text>
        </Pressable>

        {/* Services */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">ΥΠΗΡΕΣΙΕΣ</Text>
          <View className="flex-row flex-wrap">
            {store.services.map((service, index) => (
              <View
                key={index}
                className="mb-2 mr-2 rounded-full bg-fuchsia-500/20 px-3 py-1"
                style={{ borderWidth: 1, borderColor: "#FF00FF40" }}
              >
                <Text className="text-xs font-bold text-fuchsia-400">{service}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row">
          <Pressable
            onPress={() => openMaps(store)}
            className="mr-2 flex-1 overflow-hidden rounded-xl"
            style={{ borderWidth: 2, borderColor: "#00FF88" }}
          >
            <LinearGradient
              colors={["#00FF88", "#00CC6A"]}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 }}
            >
              <Navigation size={18} color="#000" />
              <Text className="ml-2 text-base font-black text-black">ΟΔΗΓΙΕΣ</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push("/book-appointment" as Href)}
            className="flex-1 overflow-hidden rounded-xl"
            style={{ borderWidth: 2, borderColor: "#FF00FF" }}
          >
            <LinearGradient
              colors={["#FF00FF20", "#CC00CC20"]}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 }}
            >
              <Wrench size={18} color="#FF00FF" />
              <Text className="ml-2 text-base font-black text-fuchsia-400">ΡΑΝΤΕΒΟΥ</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Website Link */}
        <Pressable
          onPress={() => Linking.openURL(store.website)}
          className="mt-3 flex-row items-center justify-center rounded-xl bg-black/30 py-3"
        >
          <Globe size={16} color="#00BFFF" />
          <Text className="ml-2 text-sm font-bold text-sky-400">irepair.gr/rhodes</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

export default function StoresScreen() {
  return (
    <View className="flex-1 bg-black">
      <Stack.Screen
        options={{
          title: "ΚΑΤΑΣΤΗΜΑΤΑ",
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-center">
              <MapPin size={24} color="#FF00FF" />
              <Text className="ml-2 text-2xl font-black text-white">ΣΗΜΕΙΑ ΕΞΥΠΗΡΕΤΗΣΗΣ</Text>
            </View>
            <Text className="mt-2 text-base text-gray-400">
              iRepair Rhodes locations / Σημεια iRepair Ροδος
            </Text>
          </View>

          {/* Info Banner */}
          <View className="mb-6 overflow-hidden rounded-xl" style={{ borderWidth: 1, borderColor: "#FFD700" }}>
            <LinearGradient colors={["#FFD70020", "#0f0f23"]} style={{ padding: 16 }}>
              <View className="flex-row items-center">
                <Star size={20} color="#FFD700" />
                <Text className="ml-2 flex-1 text-sm font-medium text-gray-300">
                  Επισκεψου ενα καταστημα για βαθμολογηση συσκευης και πιστοποιηση πωλησης.
                </Text>
              </View>
              <Text className="mt-2 text-xs text-gray-500">
                Visit a store for device grading and verified listing certification.
              </Text>
            </LinearGradient>
          </View>

          {/* Stores List */}
          {STORES.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}

          <View className="h-8" />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
