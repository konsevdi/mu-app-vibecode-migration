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
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing } from "@/shared/contracts";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;

const categories = [
  { id: "phone", name: "Phones", icon: Smartphone, color: "#06B6D4" },
  { id: "tablet", name: "Tablets", icon: Tablet, color: "#8B5CF6" },
  { id: "accessory", name: "Accessories", icon: Headphones, color: "#F97316" },
];

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "#22C55E" },
  like_new: { label: "Like New", color: "#06B6D4" },
  good: { label: "Good", color: "#F59E0B" },
  fair: { label: "Fair", color: "#94A3B8" },
};

function FeaturedListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mr-4 overflow-hidden rounded-2xl bg-slate-800"
      style={{ width: CARD_WIDTH }}
    >
      <Image
        source={{ uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" }}
        className="h-44 w-full"
        resizeMode="cover"
      />
      <View className="p-4">
        <View className="mb-2 flex-row items-center">
          <View
            className="mr-2 rounded-full px-2 py-1"
            style={{ backgroundColor: `${condition.color}20` }}
          >
            <Text style={{ color: condition.color }} className="text-xs font-semibold">
              {condition.label}
            </Text>
          </View>
          {listing.isFeatured && (
            <View className="flex-row items-center rounded-full bg-amber-500/20 px-2 py-1">
              <Sparkles size={12} color="#F59E0B" />
              <Text className="ml-1 text-xs font-semibold text-amber-500">Featured</Text>
            </View>
          )}
        </View>
        <Text className="text-lg font-bold text-white" numberOfLines={1}>
          {listing.title}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-cyan-400">
          {listing.price.toFixed(0)}
        </Text>
        {listing.location && (
          <View className="mt-2 flex-row items-center">
            <MapPin size={14} color="#64748B" />
            <Text className="ml-1 text-sm text-slate-400">{listing.location}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function CategoryCard({
  category,
}: {
  category: { id: string; name: string; icon: React.ComponentType<{ size: number; color: string }>; color: string };
}) {
  const router = useRouter();
  const Icon = category.icon;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/browse", params: { category: category.id } } as Href)}
      className="mr-3 items-center rounded-2xl bg-slate-800/80 px-6 py-4"
    >
      <View
        className="mb-2 rounded-xl p-3"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <Icon size={28} color={category.color} />
      </View>
      <Text className="text-sm font-semibold text-white">{category.name}</Text>
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
    <View className="flex-1 bg-slate-900">
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#0F172A"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#06B6D4"
            />
          }
        >
          {/* Header */}
          <View className="px-5 pb-4 pt-4">
            <Text className="text-3xl font-bold text-white">Mobile Unit</Text>
            <Text className="mt-1 text-base text-slate-400">
              Buy & sell devices in Greece
            </Text>
          </View>

          {/* iRepair Rhodes Banner */}
          <Pressable className="mx-5 mb-6 overflow-hidden rounded-2xl">
            <LinearGradient
              colors={["#06B6D4", "#0891B2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, flexDirection: "row", alignItems: "center" }}
            >
              <View className="mr-4 rounded-xl bg-white/20 p-3">
                <Shield size={28} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">
                  iRepair Rhodes
                </Text>
                <Text className="mt-1 text-sm text-cyan-100">
                  Get your device verified with our diagnostics
                </Text>
              </View>
              <ChevronRight size={24} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          {/* Categories */}
          <View className="mb-6">
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-xl font-bold text-white">Categories</Text>
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
          <View className="mb-6">
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-xl font-bold text-white">Featured</Text>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center"
              >
                <Text className="mr-1 text-sm font-semibold text-cyan-400">
                  See All
                </Text>
                <ChevronRight size={16} color="#06B6D4" />
              </Pressable>
            </View>
            {isLoading ? (
              <View className="h-64 items-center justify-center">
                <Text className="text-slate-400">Loading...</Text>
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
              <View className="mx-5 rounded-2xl bg-slate-800/50 p-8">
                <Text className="text-center text-slate-400">
                  No featured listings yet. Be the first to sell!
                </Text>
                <Pressable
                  onPress={() => router.push("/sell" as Href)}
                  className="mt-4 self-center rounded-full bg-cyan-500 px-6 py-3"
                >
                  <Text className="font-semibold text-white">Start Selling</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Recent Listings */}
          <View className="mb-8 px-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">Recently Added</Text>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center"
              >
                <Text className="mr-1 text-sm font-semibold text-cyan-400">
                  See All
                </Text>
                <ChevronRight size={16} color="#06B6D4" />
              </Pressable>
            </View>
            {recentData?.listings && recentData.listings.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {recentData.listings.map((listing: Listing) => (
                  <Pressable
                    key={listing.id}
                    onPress={() => router.push(`/listing/${listing.id}` as Href)}
                    className="mb-4 w-[48%] overflow-hidden rounded-xl bg-slate-800"
                  >
                    <Image
                      source={{
                        uri:
                          listing.images[0] ??
                          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
                      }}
                      className="h-28 w-full"
                      resizeMode="cover"
                    />
                    <View className="p-3">
                      <Text
                        className="text-sm font-semibold text-white"
                        numberOfLines={1}
                      >
                        {listing.title}
                      </Text>
                      <Text className="mt-1 text-base font-bold text-cyan-400">
                        {listing.price.toFixed(0)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="rounded-2xl bg-slate-800/50 p-6">
                <Text className="text-center text-slate-400">
                  No listings yet
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
