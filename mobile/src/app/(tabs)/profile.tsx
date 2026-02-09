import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  User,
  Package,
  LogOut,
  ChevronRight,
  Zap,
  Eye,
  Sparkles,
  FileText,
  HelpCircle,
  Globe,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { type GetListingsResponse, type Listing } from "@/shared/contracts";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation, type TranslationKey } from "@/lib/languageStore";
import { CONDITIONS, normalizeConditionKey } from "@/lib/conditions";

function MyListingCard({ listing, t }: { listing: Listing; t: (key: TranslationKey) => string }) {
  const router = useRouter();
  const conditionKey = normalizeConditionKey(listing.condition);
  const conditionData = CONDITIONS[conditionKey];
  const conditionLabel = t(conditionData.translationKey as TranslationKey);

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-3 flex-row overflow-hidden rounded-2xl"
      style={{ borderWidth: 2, borderColor: "#333" }}
    >
      <LinearGradient
        colors={["#1a1a2e", "#0f0f23"]}
        style={{ flex: 1, flexDirection: "row" }}
      >
        <Image
          source={{
            uri: listing.images[0] ?? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
          }}
          className="h-24 w-24"
          resizeMode="cover"
        />
        <View className="flex-1 justify-center p-3">
          <View className="mb-1 flex-row items-center">
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${conditionData.color}20`, borderWidth: 1, borderColor: conditionData.color }}
            >
              <Text style={{ color: conditionData.color }} className="text-xs font-bold uppercase">
                {conditionLabel}
              </Text>
            </View>
            <View className="ml-2 flex-row items-center">
              <Eye size={12} color="#FF00FF" />
              <Text className="ml-1 text-xs font-semibold text-gray-400">
                {listing.views}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {listing.title}
          </Text>
          <Text className="mt-1 text-lg font-black text-fuchsia-400">
            {listing.price.toFixed(0)}
          </Text>
        </View>
        <View className="items-center justify-center pr-4">
          <ChevronRight size={22} color="#FF00FF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const { t, language } = useTranslation();

  const { data: myListings, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "my", session?.user?.id],
    queryFn: () =>
      api.get<GetListingsResponse>(`/api/listings?sellerId=${session?.user?.id}&limit=20`),
    enabled: !!session?.user?.id,
  });

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/" as Href);
  };

  if (isSessionLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-lg font-bold text-gray-500">{t("loading")}</Text>
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center px-8">
          {/* Language Toggle for non-logged-in users */}
          <View className="absolute right-5 top-4">
            <LanguageToggle compact />
          </View>
          <View className="mb-6 rounded-3xl p-8" style={{ backgroundColor: "#FF00FF20", borderWidth: 2, borderColor: "#FF00FF" }}>
            <User size={72} color="#FF00FF" />
          </View>
          <Text className="text-center text-3xl font-black text-white">
            {t("sign_in_to_profile")}
          </Text>
          <Text className="mt-3 text-center text-base font-medium text-gray-400">
            {t("manage_listings_desc")}
          </Text>
          <Pressable
            onPress={() => router.push("/login" as Href)}
            className="mt-8 overflow-hidden rounded-full"
            style={{ borderWidth: 2, borderColor: "#FF00FF" }}
          >
            <LinearGradient
              colors={["#FF00FF", "#CC00CC"]}
              style={{ paddingHorizontal: 40, paddingVertical: 18 }}
            >
              <Text className="text-xl font-black uppercase text-white">{t("sign_in")}</Text>
            </LinearGradient>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF00FF"
            />
          }
        >
          {/* Profile Header */}
          <View className="items-center px-5 pb-6 pt-8">
            <View
              className="h-28 w-28 items-center justify-center rounded-full"
              style={{ borderWidth: 3, borderColor: "#FF00FF", backgroundColor: "#FF00FF20" }}
            >
              {session.user.image ? (
                <Image
                  source={{ uri: session.user.image }}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <User size={48} color="#FF00FF" />
              )}
            </View>
            <Text className="mt-5 text-2xl font-black text-white">
              {session.user.name ?? t("user_fallback")}
            </Text>
            <Text className="mt-1 text-base font-medium text-gray-400">
              {session.user.email}
            </Text>
          </View>

          {/* Stats */}
          <View className="mx-5 mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
            <LinearGradient
              colors={["#1a1a2e", "#0f0f23"]}
              style={{ flexDirection: "row", padding: 20 }}
            >
              <View className="flex-1 items-center">
                <Text className="text-4xl font-black text-fuchsia-400">
                  {myListings?.total ?? 0}
                </Text>
                <Text className="mt-1 text-sm font-bold uppercase tracking-wider text-gray-400">{t("listings_count")}</Text>
              </View>
              <View className="mx-4 w-0.5 bg-gray-700" />
              <View className="flex-1 items-center">
                <Text className="text-4xl font-black text-emerald-400">
                  {myListings?.listings?.reduce((sum, l) => sum + l.views, 0) ?? 0}
                </Text>
                <Text className="mt-1 text-sm font-bold uppercase tracking-wider text-gray-400">{t("views_count")}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View className="mx-5 mb-6">
            <Pressable
              onPress={() => router.push("/sell" as Href)}
              className="overflow-hidden rounded-2xl"
              style={{ borderWidth: 2, borderColor: "#00FF88" }}
            >
              <LinearGradient
                colors={["#00FF88", "#00CC6A"]}
                style={{ flexDirection: "row", alignItems: "center", padding: 18 }}
              >
                <View className="mr-4 rounded-xl bg-black/20 p-3">
                  <Package size={28} color="#000" />
                </View>
                <Text className="flex-1 text-lg font-black uppercase text-black">
                  {t("create_new")}
                </Text>
                <ChevronRight size={24} color="#000" />
              </LinearGradient>
            </Pressable>
          </View>

          {/* My Listings */}
          <View className="px-5">
            <View className="mb-4 flex-row items-center">
              <Sparkles size={20} color="#FFD700" />
              <Text className="ml-2 text-xl font-black uppercase tracking-wider text-white">
                {t("my_listings")}
              </Text>
            </View>
            {myListings?.listings && myListings.listings.length > 0 ? (
              myListings.listings.map((listing: Listing) => (
                <MyListingCard key={listing.id} listing={listing} t={t} />
              ))
            ) : (
              <View className="items-center overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 32, alignItems: "center", width: "100%" }}
                >
                  <Package size={48} color="#666" />
                  <Text className="mt-4 text-lg font-bold text-gray-400">
                    {t("no_listings_yet")}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/sell" as Href)}
                    className="mt-4 overflow-hidden rounded-full"
                    style={{ borderWidth: 2, borderColor: "#FF00FF" }}
                  >
                    <LinearGradient
                      colors={["#FF00FF20", "#CC00CC20"]}
                      style={{ paddingHorizontal: 24, paddingVertical: 12 }}
                    >
                      <Text className="font-bold uppercase text-fuchsia-400">
                        {t("create_first")}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Language Toggle */}
          <View className="mx-5 mb-4 mt-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              {t("language_label")} / {language === "el" ? "LANGUAGE" : "ΓΛΩΣΣΑ"}
            </Text>
            <LanguageToggle />
          </View>

          {/* Settings Links */}
          <View className="mx-5 mb-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">{t("settings")}</Text>
            <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
              <Pressable
                onPress={() => router.push("/support" as Href)}
                className="flex-row items-center border-b border-gray-800 p-4"
              >
                <View className="mr-3 rounded-lg p-2" style={{ backgroundColor: "#00FF8820" }}>
                  <HelpCircle size={20} color="#00FF88" />
                </View>
                <Text className="flex-1 text-base font-semibold text-white">{t("support")}</Text>
                <ChevronRight size={20} color="#666" />
              </Pressable>
              <Pressable
                onPress={() => router.push("/legal" as Href)}
                className="flex-row items-center p-4"
              >
                <View className="mr-3 rounded-lg p-2" style={{ backgroundColor: "#FFD70020" }}>
                  <FileText size={20} color="#FFD700" />
                </View>
                <Text className="flex-1 text-base font-semibold text-white">{t("legal")}</Text>
                <ChevronRight size={20} color="#666" />
              </Pressable>
            </View>
          </View>

          {/* Sign Out */}
          <View className="mx-5 mb-8 mt-4">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center overflow-hidden rounded-2xl py-4"
              style={{ backgroundColor: "#FF6B6B20", borderWidth: 2, borderColor: "#FF6B6B" }}
            >
              <LogOut size={22} color="#FF6B6B" />
              <Text className="ml-2 text-lg font-black uppercase text-red-400">
                {t("sign_out")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
