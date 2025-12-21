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
} from "lucide-react-native";

// V1: Rhodes only stores
const STORES = [
  {
    id: "irepair-rhodes",
    name: "iRepair Rhodes",
    nameEl: "iRepair ΡΟΔΟΣ",
    address: "Αμμοχωστου 18, 85131, Ροδος, Ελλαδα",
    addressEn: "Ammochostou 18, 85131, Rhodes, Greece",
    phone: "+30 22410 12345",
    hours: "09:00 - 21:00",
    hoursNote: "ΔΕΥΤΕΡΑ - ΣΑΒΒΑΤΟ",
    hoursNoteEn: "MON - SAT",
    isPrimary: true,
    coords: { lat: 36.4349, lng: 28.2176 },
    services: ["ΔΙΑΓΝΩΣΤΙΚΑ", "ΕΠΙΣΚΕΥΕΣ", "ΑΞΙΟΛΟΓΗΣΗ", "ΠΩΛΗΣΕΙΣ"],
  },
  {
    id: "irepair-spot",
    name: "iRepair Spot",
    nameEl: "iRepair Spot (Public Νεα Μαρινα)",
    address: "Αυστραλιας 84-86, 85100, Ροδος, Ελλαδα",
    addressEn: "Australias 84-86, 85100, Rhodes, Greece",
    phone: "+30 22410 67890",
    hours: "10:00 - 22:00",
    hoursNote: "ΚΑΘΗΜΕΡΙΝΑ",
    hoursNoteEn: "DAILY",
    isPrimary: false,
    coords: { lat: 36.4412, lng: 28.2234 },
    services: ["ΔΙΑΓΝΩΣΤΙΚΑ", "ΑΞΙΟΛΟΓΗΣΗ"],
  },
];

function openMaps(store: typeof STORES[0]) {
  const { lat, lng } = store.coords;
  const label = encodeURIComponent(store.name);

  // Try Apple Maps first on iOS, otherwise Google Maps
  const appleMapsUrl = `maps:0,0?q=${label}@${lat},${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  if (Platform.OS === "ios") {
    Linking.openURL(appleMapsUrl).catch(() => {
      Linking.openURL(googleMapsUrl);
    });
  } else {
    Linking.openURL(googleMapsUrl);
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
        <View className="mb-4 flex-row">
          <View className="mr-2 flex-1 flex-row items-center rounded-xl bg-black/30 p-3">
            <Clock size={16} color="#FFD700" />
            <View className="ml-2">
              <Text className="text-sm font-bold text-white">{store.hours}</Text>
              <Text className="text-xs text-gray-500">{store.hoursNote}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`tel:${store.phone}`)}
            className="flex-row items-center rounded-xl bg-black/30 px-4 py-3"
          >
            <Phone size={16} color="#00BFFF" />
            <Text className="ml-2 text-sm font-bold text-sky-400">ΚΛΗΣΗ</Text>
          </Pressable>
        </View>

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
