import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Smartphone,
  Tablet,
  Headphones,
  MapPin,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing, VERIFICATION_LABEL } from "@/shared/contracts";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;

// Helper to check if listing is verified (has grade + checklist)
const isListingVerified = (listing: Listing) => listing.grade && listing.checklistComplete;

const categories = [
  { id: "phone", name: "Κινητά", icon: Smartphone, color: "#FF00FF", bgColor: "#FF00FF20" },
  { id: "tablet", name: "Tablets", icon: Tablet, color: "#00FF88", bgColor: "#00FF8820" },
  { id: "accessory", name: "Αξεσουάρ", icon: Headphones, color: "#FFD700", bgColor: "#FFD70020" },
];

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Καινούργιο", color: "#00FF88" },
  like_new: { label: "Σαν Καινούργιο", color: "#00BFFF" },
  good: { label: "Καλό", color: "#FFD700" },
  fair: { label: "Μέτριο", color: "#FF6B6B" },
};

function FeaturedListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mr-4 overflow-hidden rounded-3xl"
      style={{ width: CARD_WIDTH }}
    >
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={{ borderRadius: 24 }}
      >
        <Image
          source={{ uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" }}
          className="h-48 w-full"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          resizeMode="cover"
        />
        <View className="p-5">
          <View className="mb-3 flex-row items-center">
            <View
              className="mr-2 rounded-full px-3 py-1.5"
              style={{ backgroundColor: `${condition.color}25`, borderWidth: 1, borderColor: condition.color }}
            >
              <Text style={{ color: condition.color }} className="text-xs font-bold uppercase">
                {condition.label}
              </Text>
            </View>
            {listing.isFeatured && (
              <View className="flex-row items-center rounded-full bg-yellow-400/20 px-3 py-1.5" style={{ borderWidth: 1, borderColor: "#FFD700" }}>
                <Sparkles size={12} color="#FFD700" />
                <Text className="ml-1 text-xs font-bold uppercase text-yellow-400">Top</Text>
              </View>
            )}
            {isListingVerified(listing) && (
              <View className="flex-row items-center rounded-full bg-emerald-400/20 px-3 py-1.5" style={{ borderWidth: 1, borderColor: "#00FF88" }}>
                <Shield size={12} color="#00FF88" />
                <Text className="ml-1 text-xs font-bold text-emerald-400">Verified</Text>
              </View>
            )}
          </View>
          <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
            {listing.title}
          </Text>
          <Text className="mt-2 text-3xl font-black text-fuchsia-400">
            €{listing.price.toFixed(0)}
          </Text>
          {listing.location && (
            <View className="mt-3 flex-row items-center">
              <MapPin size={14} color="#FF00FF" />
              <Text className="ml-1 text-sm font-medium text-gray-400">{listing.location}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function CategoryCard({
  category,
}: {
  category: { id: string; name: string; icon: React.ComponentType<{ size: number; color: string }>; color: string; bgColor: string };
}) {
  const router = useRouter();
  const Icon = category.icon;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/browse", params: { category: category.id } } as Href)}
      className="mr-4 items-center overflow-hidden rounded-2xl"
      style={{ borderWidth: 2, borderColor: category.color }}
    >
      <LinearGradient
        colors={["#1a1a2e", "#0f0f23"]}
        style={{ paddingHorizontal: 28, paddingVertical: 20, alignItems: "center" }}
      >
        <View
          className="mb-3 rounded-2xl p-4"
          style={{ backgroundColor: category.bgColor }}
        >
          <Icon size={32} color={category.color} />
        </View>
        <Text className="text-base font-bold text-white">{category.name}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: () => api.get<GetListingsResponse>("/api/listings?featured=true&limit=10"),
  });

  const { data: recentData } = useQuery({
    queryKey: ["listings", "recent"],
    queryFn: () => api.get<GetListingsResponse>("/api/listings?limit=6"),
  });

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 350 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF00FF"
            />
          }
        >
          {/* Header */}
          <View className="px-5 pb-6 pt-4">
            <View className="flex-row items-center">
              <Zap size={28} color="#FF00FF" fill="#FF00FF" />
              <Text className="ml-2 text-4xl font-black text-white">Mobile Unit</Text>
            </View>
            <Text className="mt-2 text-lg font-semibold text-gray-400">
              Αγορά & Πώληση συσκευών στην Ελλάδα
            </Text>
          </View>

          {/* iRepair Rhodes Banner */}
          <Pressable className="mx-5 mb-8 overflow-hidden rounded-3xl" style={{ borderWidth: 2, borderColor: "#00FF88" }}>
            <LinearGradient
              colors={["#00FF88", "#00CC6A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24, flexDirection: "row", alignItems: "center" }}
            >
              <View className="mr-4 rounded-2xl bg-black/20 p-4">
                <Shield size={32} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-black text-black">
                  iRepair Ρόδος
                </Text>
                <Text className="mt-1 text-base font-semibold text-black/70">
                  Πιστοποίηση & Διαγνωστικά συσκευών
                </Text>
              </View>
              <ChevronRight size={28} color="#000000" />
            </LinearGradient>
          </Pressable>

          {/* Categories */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between px-5">
              <Text className="text-2xl font-black uppercase tracking-wider text-white">Κατηγορίες</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              style={{ flexGrow: 0 }}
            >
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </ScrollView>
          </View>

          {/* Featured Listings */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between px-5">
              <View className="flex-row items-center">
                <Sparkles size={22} color="#FFD700" />
                <Text className="ml-2 text-2xl font-black uppercase tracking-wider text-white">Προτεινόμενα</Text>
              </View>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center rounded-full bg-fuchsia-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#FF00FF" }}
              >
                <Text className="mr-1 text-sm font-bold uppercase text-fuchsia-400">
                  Όλα
                </Text>
                <ChevronRight size={16} color="#FF00FF" />
              </Pressable>
            </View>
            {isLoading ? (
              <View className="h-64 items-center justify-center">
                <Text className="text-lg font-bold text-gray-500">Φόρτωση...</Text>
              </View>
            ) : data?.listings && data.listings.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                style={{ flexGrow: 0 }}
              >
                {data.listings.map((listing: Listing) => (
                  <FeaturedListingCard key={listing.id} listing={listing} />
                ))}
              </ScrollView>
            ) : (
              <View className="mx-5 overflow-hidden rounded-3xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 32, alignItems: "center" }}
                >
                  <Sparkles size={48} color="#666" />
                  <Text className="mt-4 text-center text-lg font-bold text-gray-400">
                    Δεν υπάρχουν ακόμα προτεινόμενα. Γίνε ο πρώτος!
                  </Text>
                  <Pressable
                    onPress={() => router.push("/sell" as Href)}
                    className="mt-6 overflow-hidden rounded-full"
                    style={{ borderWidth: 2, borderColor: "#FF00FF" }}
                  >
                    <LinearGradient
                      colors={["#FF00FF", "#CC00CC"]}
                      style={{ paddingHorizontal: 32, paddingVertical: 16 }}
                    >
                      <Text className="text-lg font-black uppercase text-white">Πούλησε Τώρα</Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Recent Listings */}
          <View className="mb-8 px-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-2xl font-black uppercase tracking-wider text-white">Πρόσφατα</Text>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center rounded-full bg-emerald-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#00FF88" }}
              >
                <Text className="mr-1 text-sm font-bold uppercase text-emerald-400">
                  Όλα
                </Text>
                <ChevronRight size={16} color="#00FF88" />
              </Pressable>
            </View>
            {recentData?.listings && recentData.listings.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {recentData.listings.map((listing: Listing) => (
                  <Pressable
                    key={listing.id}
                    onPress={() => router.push(`/listing/${listing.id}` as Href)}
                    className="mb-4 w-[48%] overflow-hidden rounded-2xl"
                    style={{ borderWidth: 2, borderColor: "#333" }}
                  >
                    <LinearGradient
                      colors={["#1a1a2e", "#0f0f23"]}
                    >
                      <Image
                        source={{
                          uri:
                            listing.images[0] ??
                            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
                        }}
                        className="h-32 w-full"
                        resizeMode="cover"
                      />
                      <View className="p-4">
                        <Text
                          className="text-sm font-bold text-white"
                          numberOfLines={1}
                        >
                          {listing.title}
                        </Text>
                        <Text className="mt-2 text-xl font-black text-fuchsia-400">
                          €{listing.price.toFixed(0)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 24, alignItems: "center" }}
                >
                  <Text className="text-center font-bold text-gray-500">
                    Δεν υπάρχουν ακόμα αγγελίες
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
