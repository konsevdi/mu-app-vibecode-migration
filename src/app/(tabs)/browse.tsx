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
import {
  Search,
  Smartphone,
  Tablet,
  Headphones,
  X,
  MapPin,
  SlidersHorizontal,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing, type Category } from "@/shared/contracts";

const categories: { id: Category | "all"; name: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { id: "all", name: "All", icon: SlidersHorizontal },
  { id: "phone", name: "Phones", icon: Smartphone },
  { id: "tablet", name: "Tablets", icon: Tablet },
  { id: "accessory", name: "Accessories", icon: Headphones },
];

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "#22C55E" },
  like_new: { label: "Like New", color: "#06B6D4" },
  good: { label: "Good", color: "#F59E0B" },
  fair: { label: "Fair", color: "#94A3B8" },
};

function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-4 w-[48%] overflow-hidden rounded-xl bg-slate-800"
    >
      <Image
        source={{
          uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
        }}
        className="h-32 w-full"
        resizeMode="cover"
      />
      <View className="p-3">
        <View className="mb-1 flex-row">
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${condition.color}20` }}
          >
            <Text style={{ color: condition.color }} className="text-xs font-medium">
              {condition.label}
            </Text>
          </View>
        </View>
        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
          {listing.title}
        </Text>
        <Text className="mt-1 text-lg font-bold text-cyan-400">
          €{listing.price.toFixed(0)}
        </Text>
        {listing.location && (
          <View className="mt-1 flex-row items-center">
            <MapPin size={12} color="#64748B" />
            <Text className="ml-1 text-xs text-slate-400" numberOfLines={1}>
              {listing.location}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    (params.category as Category) ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const buildQueryString = useCallback(() => {
    const queryParams: string[] = [];
    if (selectedCategory !== "all") {
      queryParams.push(`category=${selectedCategory}`);
    }
    if (searchQuery.trim()) {
      queryParams.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    }
    queryParams.push("limit=50");
    return queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
  }, [selectedCategory, searchQuery]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "browse", selectedCategory, searchQuery],
    queryFn: () => api.get<GetListingsResponse>(`/api/listings${buildQueryString()}`),
  });

  return (
    <View className="flex-1 bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="px-5 pb-4 pt-4">
          <Text className="text-2xl font-bold text-white">Browse</Text>
          <Text className="mt-1 text-sm text-slate-400">
            Find your next device
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mx-5 mb-4 flex-row items-center rounded-xl bg-slate-800 px-4 py-3">
          <Search size={20} color="#64748B" />
          <TextInput
            className="ml-3 flex-1 text-base text-white"
            placeholder="Search devices..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <X size={20} color="#64748B" />
            </Pressable>
          )}
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
                  className={`mr-3 flex-row items-center rounded-full px-4 py-2 ${
                    isSelected ? "bg-cyan-500" : "bg-slate-800"
                  }`}
                >
                  <Icon size={16} color={isSelected ? "#FFFFFF" : "#94A3B8"} />
                  <Text
                    className={`ml-2 text-sm font-semibold ${
                      isSelected ? "text-white" : "text-slate-400"
                    }`}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Results */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#06B6D4"
            />
          }
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-slate-400">Loading...</Text>
            </View>
          ) : data?.listings && data.listings.length > 0 ? (
            <>
              <Text className="mb-4 text-sm text-slate-400">
                {data.total} {data.total === 1 ? "result" : "results"}
              </Text>
              <View className="flex-row flex-wrap justify-between pb-8">
                {data.listings.map((listing: Listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </View>
            </>
          ) : (
            <View className="items-center justify-center py-20">
              <Search size={48} color="#334155" />
              <Text className="mt-4 text-lg font-semibold text-slate-400">
                No listings found
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
