import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  RefreshControl,
  DimensionValue,
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
import {
  useDimensions,
  useGridColumns,
  getResponsivePadding,
  useMaxContentWidth,
} from "@/lib/responsive";
import { useTranslation } from "@/lib/languageStore";
import { CONDITIONS, normalizeConditionKey } from "@/lib/conditions";

const getCategoryData = (t: (key: any) => string) => [
  { id: "all" as const, name: t("all_categories"), icon: SlidersHorizontal, color: "#FF00FF" },
  { id: "phone" as Category, name: t("phones"), icon: Smartphone, color: "#FF00FF" },
  { id: "tablet" as Category, name: t("tablets"), icon: Tablet, color: "#00FF88" },
  { id: "laptop" as Category, name: t("laptops"), icon: Laptop, color: "#00BFFF" },
  { id: "accessory" as Category, name: t("accessories"), icon: Headphones, color: "#FFD700" },
];

function SkeletonCard({ width }: { width: DimensionValue }) {
  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl"
      style={{ width, borderWidth: 2, borderColor: "#333" }}
    >
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
        <View className="h-36 w-full bg-gray-700/50" />
        <View className="p-4">
          <View className="mb-2 h-5 w-20 rounded-full bg-gray-700/50" />
          <View className="mb-2 h-4 w-full rounded bg-gray-700/50" />
          <View className="h-6 w-16 rounded bg-gray-700/50" />
        </View>
      </LinearGradient>
    </View>
  );
}

function ListingCard({ listing, width, t }: { listing: Listing; width: DimensionValue; t: (key: any) => string }) {
  const router = useRouter();
  const conditionKey = normalizeConditionKey(listing.condition);
  const conditionData = CONDITIONS[conditionKey];
  const conditionLabel = t(conditionData.translationKey as any);

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-4 overflow-hidden rounded-2xl"
      style={{ width, borderWidth: 2, borderColor: "#333" }}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, €${listing.price}, ${conditionLabel}`}
    >
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
        <Image
          source={{
            uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
          }}
          className="h-36 w-full"
          resizeMode="cover"
          accessibilityLabel={`Image of ${listing.title}`}
        />
        <View className="p-4">
          <View className="mb-2 flex-row">
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: `${conditionData.color}20`, borderWidth: 1, borderColor: conditionData.color }}
            >
              <Text style={{ color: conditionData.color }} className="text-xs font-bold uppercase">
                {conditionLabel}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-white" numberOfLines={2}>
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
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    (params.category as Category) ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { width } = useDimensions();
  const gridColumns = useGridColumns(2);
  const maxContentWidth = useMaxContentWidth();
  const padding = getResponsivePadding();

  // Get categories with translations
  const categories = getCategoryData(t);

  // Calculate grid item width
  const gridGap = 16;
  const availableWidth = maxContentWidth ?? width;
  const gridItemWidth = (availableWidth - padding * 2 - gridGap * (gridColumns - 1)) / gridColumns;

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF00FF"
            />
          }
          contentContainerStyle={{
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? "center" : undefined,
            width: maxContentWidth ? "100%" : undefined,
          }}
          stickyHeaderIndices={[0]}
        >
          {/* Header & Search - Sticky on scroll */}
          <View className="bg-black/90">
            {/* Header */}
            <View style={{ paddingHorizontal: padding, paddingBottom: 16, paddingTop: 16 }}>
              <View className="flex-row items-center">
                <Zap size={24} color="#FF00FF" fill="#FF00FF" />
                <Text className="ml-2 text-2xl font-black text-white" accessibilityRole="header">
                  {t("browse_title")}
                </Text>
              </View>
              <Text className="mt-1 text-base font-semibold text-gray-400">
                {t("browse_subtitle")}
              </Text>
            </View>

            {/* Search Bar */}
            <View
              className="mb-4 flex-row items-center overflow-hidden rounded-2xl"
              style={{ marginHorizontal: padding, borderWidth: 2, borderColor: "#FF00FF" }}
            >
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
              >
                <Search size={22} color="#FF00FF" />
                <TextInput
                  className="ml-3 flex-1 text-base font-semibold text-white"
                  placeholder={t("search_placeholder")}
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Search devices"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery("")}
                    className="rounded-full bg-gray-700 p-2"
                    style={{ minHeight: 36, minWidth: 36, alignItems: "center", justifyContent: "center" }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
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
                contentContainerStyle={{ paddingHorizontal: padding }}
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
                        borderColor: isSelected ? category.color : "#333",
                        minHeight: 44,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${category.name}`}
                      accessibilityState={{ selected: isSelected }}
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
            <View style={{ marginHorizontal: padding, marginBottom: 16 }}>
              <Pressable
                onPress={() => setVerifiedOnly(!verifiedOnly)}
                className="flex-row items-center overflow-hidden rounded-xl"
                style={{ borderWidth: 2, borderColor: verifiedOnly ? "#00FF88" : "#333", minHeight: 44 }}
                accessibilityRole="checkbox"
                accessibilityLabel="Show verified listings only"
                accessibilityState={{ checked: verifiedOnly }}
              >
                <LinearGradient
                  colors={verifiedOnly ? ["#00FF8820", "#0f0f23"] : ["#1a1a2e", "#0f0f23"]}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Shield size={18} color={verifiedOnly ? "#00FF88" : "#666"} />
                  <Text className={`ml-2 text-sm font-bold ${verifiedOnly ? "text-emerald-400" : "text-gray-500"}`}>
                    {t("verified_only")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* Results */}
          <View style={{ paddingHorizontal: padding }}>
            {isLoading ? (
              <View
                className="flex-row flex-wrap"
                style={{ gap: gridGap, justifyContent: gridColumns > 2 ? "flex-start" : "space-between" }}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard
                    key={i}
                    width={gridColumns > 2 ? gridItemWidth : "48%"}
                  />
                ))}
              </View>
            ) : data?.listings && data.listings.length > 0 ? (
              <>
                <View className="mb-4 flex-row items-center">
                  <View className="mr-2 h-2 w-2 rounded-full bg-fuchsia-500" />
                  <Text className="text-base font-bold text-gray-400">
                    {data.total} {data.total === 1 ? t("results_singular") : t("results_plural")}
                  </Text>
                </View>
                <View
                  className="flex-row flex-wrap pb-8"
                  style={{ gap: gridGap, justifyContent: gridColumns > 2 ? "flex-start" : "space-between" }}
                >
                  {data.listings.map((listing: Listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      width={gridColumns > 2 ? gridItemWidth : "48%"}
                      t={t}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View className="items-center justify-center py-20">
                <View className="mb-4 rounded-3xl bg-gray-800/50 p-6">
                  <Search size={56} color="#666" />
                </View>
                <Text className="mt-4 text-xl font-black text-white">
                  {t("no_listings")}
                </Text>
                <Text className="mt-2 text-center text-base font-medium text-gray-500">
                  {t("try_different_filters")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
