import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Platform,
  DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Smartphone,
  Tablet,
  Laptop,
  Headphones,
  MapPin,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing } from "@/shared/contracts";
import { isListingVerified } from "@/lib/verification";
import {
  useDimensions,
  useGridColumns,
  getCardWidth,
  useResponsiveValue,
  getResponsivePadding,
  useMaxContentWidth,
  isWeb,
} from "@/lib/responsive";
import { useTranslation } from "@/lib/languageStore";
import { CONDITIONS, normalizeConditionKey } from "@/lib/conditions";

const getCategoryData = (t: (key: any) => string) => [
  { id: "phone", name: t("phones"), icon: Smartphone, color: "#FF00FF", bgColor: "#FF00FF20" },
  { id: "tablet", name: t("tablets"), icon: Tablet, color: "#00FF88", bgColor: "#00FF8820" },
  { id: "laptop", name: t("laptops"), icon: Laptop, color: "#00BFFF", bgColor: "#00BFFF20" },
  { id: "accessory", name: t("accessories"), icon: Headphones, color: "#FFD700", bgColor: "#FFD70020" },
];

function SkeletonCard({ width }: { width: number }) {
  return (
    <View
      className="mr-4 overflow-hidden rounded-3xl"
      style={{ width }}
    >
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={{ borderRadius: 24 }}>
        <View className="h-48 w-full animate-pulse bg-gray-700/50" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />
        <View className="p-5">
          <View className="mb-3 h-6 w-24 rounded-full bg-gray-700/50" />
          <View className="mb-2 h-6 w-full rounded bg-gray-700/50" />
          <View className="h-8 w-20 rounded bg-gray-700/50" />
        </View>
      </LinearGradient>
    </View>
  );
}

function SkeletonGridCard() {
  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl"
      style={{ width: "48%", borderWidth: 2, borderColor: "#333" }}
    >
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
        <View className="h-32 w-full bg-gray-700/50" />
        <View className="p-4">
          <View className="mb-2 h-4 w-full rounded bg-gray-700/50" />
          <View className="h-6 w-16 rounded bg-gray-700/50" />
        </View>
      </LinearGradient>
    </View>
  );
}

function FeaturedListingCard({ listing, cardWidth, t }: { listing: Listing; cardWidth: number; t: (key: any) => string }) {
  const router = useRouter();
  const conditionKey = normalizeConditionKey(listing.condition);
  const conditionData = CONDITIONS[conditionKey];
  const conditionLabel = t(conditionData.translationKey as any);

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mr-4 overflow-hidden rounded-3xl"
      style={{ width: cardWidth }}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, €${listing.price}, ${conditionLabel}`}
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
          accessibilityLabel={`Image of ${listing.title}`}
        />
        <View className="p-5">
          <View className="mb-3 flex-row flex-wrap items-center gap-2">
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: `${conditionData.color}25`, borderWidth: 1, borderColor: conditionData.color }}
            >
              <Text style={{ color: conditionData.color }} className="text-xs font-bold uppercase">
                {conditionLabel}
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
                <Text className="ml-1 text-xs font-bold text-emerald-400">{t("verified")}</Text>
              </View>
            )}
          </View>
          <Text className="text-xl font-extrabold text-white" numberOfLines={2}>
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
      style={{ borderWidth: 2, borderColor: category.color, minWidth: 110 }}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category.name}`}
    >
      <LinearGradient
        colors={["#1a1a2e", "#0f0f23"]}
        style={{ paddingHorizontal: 28, paddingVertical: 20, alignItems: "center", width: "100%" }}
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

function RecentListingCard({ listing, width }: { listing: Listing; width: DimensionValue }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-4 overflow-hidden rounded-2xl"
      style={{ width, borderWidth: 2, borderColor: "#333" }}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, €${listing.price}`}
    >
      <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
        <Image
          source={{
            uri:
              listing.images[0] ??
              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
          }}
          className="h-32 w-full"
          resizeMode="cover"
          accessibilityLabel={`Image of ${listing.title}`}
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
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { width } = useDimensions();
  const gridColumns = useGridColumns(2);
  const maxContentWidth = useMaxContentWidth();
  const padding = getResponsivePadding();
  const cardWidth = getCardWidth(0.75);

  // Get categories with translations
  const categories = getCategoryData(t);

  // Responsive header font size
  const headerFontSize = useResponsiveValue({
    default: 32,
    lg: 36,
    xl: 40,
  });

  // Calculate grid item width
  const gridGap = 16;
  const availableWidth = maxContentWidth ?? width;
  const gridItemWidth = `${((availableWidth - padding * 2 - gridGap * (gridColumns - 1)) / gridColumns / availableWidth) * 100}%`;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: () => api.get<GetListingsResponse>("/api/listings?featured=true&limit=10"),
  });

  const { data: recentData, isLoading: isLoadingRecent } = useQuery({
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
          contentContainerStyle={{
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? "center" : undefined,
            width: maxContentWidth ? "100%" : undefined,
          }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: padding, paddingBottom: 24, paddingTop: 16 }}>
            <View className="flex-row items-center">
              <Zap size={28} color="#FF00FF" fill="#FF00FF" />
              <Text
                className="ml-2 font-black text-white"
                style={{ fontSize: headerFontSize }}
                accessibilityRole="header"
              >
                Mobile Unit
              </Text>
            </View>
            <Text className="mt-2 text-lg font-semibold text-gray-400">
              {t("home_subtitle")}
            </Text>
          </View>

          {/* iRepair Rhodes Banner */}
          <Pressable
            onPress={() => router.push("/stores" as Href)}
            className="mb-8 overflow-hidden rounded-3xl"
            style={{ marginHorizontal: padding, borderWidth: 2, borderColor: "#00FF88" }}
            accessibilityRole="button"
            accessibilityLabel="Visit iRepair Rhodes for device certification"
          >
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
                  iRepair {t("rhodes")}
                </Text>
                <Text className="mt-1 text-base font-semibold text-black/70">
                  {language === "el" ? "Πιστοποιηση & Διαγνωστικα συσκευων" : "Device certification & diagnostics"}
                </Text>
              </View>
              <ChevronRight size={28} color="#000000" />
            </LinearGradient>
          </Pressable>

          {/* Categories */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between" style={{ paddingHorizontal: padding }}>
              <Text className="text-2xl font-black uppercase tracking-wider text-white" accessibilityRole="header">
                {t("category_label")}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: padding }}
              style={{ flexGrow: 0 }}
            >
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </ScrollView>
          </View>

          {/* Featured Listings */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between" style={{ paddingHorizontal: padding }}>
              <View className="flex-row items-center">
                <Sparkles size={22} color="#FFD700" />
                <Text className="ml-2 text-2xl font-black uppercase tracking-wider text-white" accessibilityRole="header">
                  {t("featured")}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center rounded-full bg-fuchsia-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#FF00FF", minHeight: 44, minWidth: 44 }}
                accessibilityRole="button"
                accessibilityLabel="View all listings"
              >
                <Text className="mr-1 text-sm font-bold uppercase text-fuchsia-400">
                  {t("see_all")}
                </Text>
                <ChevronRight size={16} color="#FF00FF" />
              </Pressable>
            </View>
            {isLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: padding }}
                style={{ flexGrow: 0 }}
              >
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} width={cardWidth} />
                ))}
              </ScrollView>
            ) : data?.listings && data.listings.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: padding }}
                style={{ flexGrow: 0 }}
              >
                {data.listings.map((listing: Listing) => (
                  <FeaturedListingCard key={listing.id} listing={listing} cardWidth={cardWidth} t={t} />
                ))}
              </ScrollView>
            ) : (
              <View className="overflow-hidden rounded-3xl" style={{ marginHorizontal: padding, borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 32, alignItems: "center" }}
                >
                  <Sparkles size={48} color="#666" />
                  <Text className="mt-4 text-center text-lg font-bold text-gray-400">
                    {language === "el" ? "Δεν υπαρχουν ακομα προτεινομενα. Γινε ο πρωτος!" : "No featured listings yet. Be the first!"}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/sell" as Href)}
                    className="mt-6 overflow-hidden rounded-full"
                    style={{ borderWidth: 2, borderColor: "#FF00FF", minHeight: 48 }}
                    accessibilityRole="button"
                    accessibilityLabel="Create a listing"
                  >
                    <LinearGradient
                      colors={["#FF00FF", "#CC00CC"]}
                      style={{ paddingHorizontal: 32, paddingVertical: 16 }}
                    >
                      <Text className="text-lg font-black uppercase text-white">{t("tab_sell")}</Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Recent Listings */}
          <View className="mb-8" style={{ paddingHorizontal: padding }}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-2xl font-black uppercase tracking-wider text-white" accessibilityRole="header">
                {t("recent_listings")}
              </Text>
              <Pressable
                onPress={() => router.push("/browse" as Href)}
                className="flex-row items-center rounded-full bg-emerald-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#00FF88", minHeight: 44, minWidth: 44 }}
                accessibilityRole="button"
                accessibilityLabel="View all recent listings"
              >
                <Text className="mr-1 text-sm font-bold uppercase text-emerald-400">
                  {t("see_all")}
                </Text>
                <ChevronRight size={16} color="#00FF88" />
              </Pressable>
            </View>
            {isLoadingRecent ? (
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonGridCard key={i} />
                ))}
              </View>
            ) : recentData?.listings && recentData.listings.length > 0 ? (
              <View
                className="flex-row flex-wrap"
                style={{ gap: gridGap, justifyContent: gridColumns > 2 ? "flex-start" : "space-between" }}
              >
                {recentData.listings.map((listing: Listing) => (
                  <RecentListingCard
                    key={listing.id}
                    listing={listing}
                    width={gridColumns > 2 ? (availableWidth - padding * 2 - gridGap * (gridColumns - 1)) / gridColumns : "48%"}
                  />
                ))}
              </View>
            ) : (
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 24, alignItems: "center" }}
                >
                  <Text className="text-center font-bold text-gray-500">
                    {t("no_listings")}
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
