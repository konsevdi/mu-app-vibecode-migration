import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  Smartphone,
  Tablet,
  Laptop,
  Headphones,
  X,
  MapPin,
  SlidersHorizontal,
  Zap,
  Shield,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing, type Category } from "@/shared/contracts";

const categories: { id: Category | "all"; name: string; icon: React.ComponentType<{ size: number; color: string }>; color: string }[] = [
  { id: "all", name: "ΟΛΑ", icon: SlidersHorizontal, color: "#FF00FF" },
  { id: "phone", name: "ΚΙΝΗΤΑ", icon: Smartphone, color: "#FF00FF" },
  { id: "tablet", name: "TABLETS", icon: Tablet, color: "#00FF88" },
  { id: "laptop", name: "LAPTOPS", icon: Laptop, color: "#00BFFF" },
  { id: "accessory", name: "ΑΞΕΣΟΥΑΡ", icon: Headphones, color: "#FFD700" },
];

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Καινούργιο", color: "#00FF88" },
  like_new: { label: "Σαν Καινούργιο", color: "#00BFFF" },
  good: { label: "Καλό", color: "#FFD700" },
  fair: { label: "Μέτριο", color: "#FF6B6B" },
  parts: { label: "Ανταλλακτικά", color: "#888888" },
};

function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-4 w-[48%] overflow-hidden rounded-2xl"
      style={{ borderWidth: 2, borderColor: "#333" }}
    >
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
        <Image
          source={{
            uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
          }}
          className="h-36 w-full"
          resizeMode="cover"
        />
        <View className="p-4">
          <View className="mb-2 flex-row">
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: `${condition.color}20`, borderWidth: 1, borderColor: condition.color }}
            >
              <Text style={{ color: condition.color }} className="text-xs font-bold uppercase">
                {condition.label}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {listing.title}
          </Text>
          <Text className="mt-2 text-xl font-black text-fuchsia-400">
            €{listing.price.toFixed(0)}
          </Text>
          {listing.location && (
            <View className="mt-2 flex-row items-center">
              <MapPin size={12} color="#FF00FF" />
              <Text className="ml-1 text-xs font-medium text-gray-400" numberOfLines={1}>
                {listing.location}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    (params.category as Category) ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const buildQueryString = useCallback(() => {
    const queryParams: string[] = [];
    if (selectedCategory !== "all") {
      queryParams.push(`category=${selectedCategory}`);
    }
    if (searchQuery.trim()) {
      queryParams.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    }
    if (verifiedOnly) {
      queryParams.push("verifiedOnly=true");
    }
    queryParams.push("limit=50");
    return queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
  }, [selectedCategory, searchQuery, verifiedOnly]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "browse", selectedCategory, searchQuery, verifiedOnly],
    queryFn: () => api.get<GetListingsResponse>(`/api/listings${buildQueryString()}`),
  });

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="px-5 pb-4 pt-4">
          <View className="flex-row items-center">
            <Zap size={24} color="#FF00FF" fill="#FF00FF" />
            <Text className="ml-2 text-3xl font-black text-white">Αναζήτηση</Text>
          </View>
          <Text className="mt-1 text-base font-semibold text-gray-400">
            Βρες την επόμενη συσκευή σου
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mx-5 mb-4 flex-row items-center overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#FF00FF" }}>
          <LinearGradient
            colors={["#1a1a2e", "#0f0f23"]}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <Search size={22} color="#FF00FF" />
            <TextInput
              className="ml-3 flex-1 text-base font-semibold text-white"
              placeholder="Αναζήτηση συσκευών..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} className="rounded-full bg-gray-700 p-1">
                <X size={16} color="#FFF" />
              </Pressable>
            )}
          </LinearGradient>
        </View>

        {/* Category Filters */}
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            style={{ flexGrow: 0 }}
          >
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  className="mr-3 overflow-hidden rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: isSelected ? category.color : "#333"
                  }}
                >
                  <LinearGradient
                    colors={isSelected ? [category.color, category.color] : ["#1a1a2e", "#0f0f23"]}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}
                  >
                    <Icon size={18} color={isSelected ? "#000" : "#888"} />
                    <Text
                      className={`ml-2 text-sm font-bold uppercase ${
                        isSelected ? "text-black" : "text-gray-400"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Verified Only Filter */}
        <View className="mx-5 mb-4">
          <Pressable
            onPress={() => setVerifiedOnly(!verifiedOnly)}
            className="flex-row items-center overflow-hidden rounded-xl"
            style={{ borderWidth: 2, borderColor: verifiedOnly ? "#00FF88" : "#333" }}
          >
            <LinearGradient
              colors={verifiedOnly ? ["#00FF8820", "#0f0f23"] : ["#1a1a2e", "#0f0f23"]}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Shield size={18} color={verifiedOnly ? "#00FF88" : "#666"} />
              <Text className={`ml-2 text-sm font-bold ${verifiedOnly ? "text-emerald-400" : "text-gray-500"}`}>
                Μόνο πιστοποιημένα / Verified only
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Results */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF00FF"
            />
          }
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-lg font-bold text-gray-500">Φόρτωση...</Text>
            </View>
          ) : data?.listings && data.listings.length > 0 ? (
            <>
              <View className="mb-4 flex-row items-center">
                <View className="mr-2 h-2 w-2 rounded-full bg-fuchsia-500" />
                <Text className="text-base font-bold text-gray-400">
                  {data.total} {data.total === 1 ? "αποτέλεσμα" : "αποτελέσματα"}
                </Text>
              </View>
              <View className="flex-row flex-wrap justify-between pb-8">
                {data.listings.map((listing: Listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </View>
            </>
          ) : (
            <View className="items-center justify-center py-20">
              <View className="mb-4 rounded-3xl bg-gray-800/50 p-6">
                <Search size={56} color="#666" />
              </View>
              <Text className="mt-4 text-xl font-black text-white">
                Δεν βρέθηκαν αγγελίες
              </Text>
              <Text className="mt-2 text-center text-base font-medium text-gray-500">
                Δοκίμασε διαφορετικά φίλτρα ή αναζήτηση
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
