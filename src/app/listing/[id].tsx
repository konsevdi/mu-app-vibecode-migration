import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  MapPin,
  Eye,
  Calendar,
  User,
  MessageCircle,
  Shield,
  Share2,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingResponse } from "@/shared/contracts";

const { width } = Dimensions.get("window");

const conditionLabels: Record<string, { label: string; color: string; description: string }> = {
  new: { label: "New", color: "#22C55E", description: "Brand new, never used" },
  like_new: { label: "Like New", color: "#06B6D4", description: "Barely used, perfect condition" },
  good: { label: "Good", color: "#F59E0B", description: "Minor signs of wear" },
  fair: { label: "Fair", color: "#94A3B8", description: "Visible wear, fully functional" },
};

const categoryLabels: Record<string, string> = {
  phone: "Phone",
  tablet: "Tablet",
  accessory: "Accessory",
};

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.get<GetListingResponse>(`/api/listings/${id}`),
    enabled: !!id,
  });

  const condition = listing ? conditionLabels[listing.condition] ?? conditionLabels.good : conditionLabels.good;

  const handleContact = () => {
    if (listing?.seller?.email) {
      Linking.openURL(`mailto:${listing.seller.email}?subject=Inquiry about ${listing.title}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Text className="text-slate-400">Loading...</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Text className="text-slate-400">Listing not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-full bg-cyan-500 px-6 py-3"
        >
          <Text className="font-semibold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Image Gallery */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        className="h-80"
        style={{ flexGrow: 0 }}
      >
        {listing.images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image }}
            style={{ width, height: 320 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Back Button */}
      <SafeAreaView
        edges={["top"]}
        className="absolute left-0 right-0 top-0"
        style={{ pointerEvents: "box-none" }}
      >
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
            <Share2 size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="-mt-6 rounded-t-3xl bg-slate-900 px-5 pt-6">
          {/* Price & Title */}
          <View className="mb-4">
            <View className="mb-2 flex-row items-center">
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: `${condition.color}20` }}
              >
                <Text style={{ color: condition.color }} className="text-sm font-semibold">
                  {condition.label}
                </Text>
              </View>
              <Text className="ml-3 text-sm text-slate-400">
                {categoryLabels[listing.category] ?? listing.category}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-white">{listing.title}</Text>
            <Text className="mt-2 text-3xl font-bold text-cyan-400">
              €{listing.price.toFixed(0)}
            </Text>
          </View>

          {/* Meta Info */}
          <View className="mb-4 flex-row flex-wrap">
            {listing.location && (
              <View className="mb-2 mr-4 flex-row items-center">
                <MapPin size={16} color="#64748B" />
                <Text className="ml-1 text-sm text-slate-400">{listing.location}</Text>
              </View>
            )}
            <View className="mb-2 mr-4 flex-row items-center">
              <Eye size={16} color="#64748B" />
              <Text className="ml-1 text-sm text-slate-400">{listing.views} views</Text>
            </View>
            <View className="mb-2 flex-row items-center">
              <Calendar size={16} color="#64748B" />
              <Text className="ml-1 text-sm text-slate-400">
                {formatDate(listing.createdAt)}
              </Text>
            </View>
          </View>

          {/* Brand & Model */}
          {(listing.brand ?? listing.model) && (
            <View className="mb-4 flex-row rounded-xl bg-slate-800 p-4">
              {listing.brand && (
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Brand</Text>
                  <Text className="text-sm font-semibold text-white">{listing.brand}</Text>
                </View>
              )}
              {listing.model && (
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Model</Text>
                  <Text className="text-sm font-semibold text-white">{listing.model}</Text>
                </View>
              )}
            </View>
          )}

          {/* Condition Details */}
          <View className="mb-4 rounded-xl bg-slate-800 p-4">
            <Text className="mb-2 text-sm font-semibold text-white">Condition</Text>
            <View className="flex-row items-center">
              <View
                className="mr-3 rounded-full p-2"
                style={{ backgroundColor: `${condition.color}20` }}
              >
                <Shield size={20} color={condition.color} />
              </View>
              <View>
                <Text style={{ color: condition.color }} className="font-semibold">
                  {condition.label}
                </Text>
                <Text className="text-sm text-slate-400">{condition.description}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-white">Description</Text>
            <Text className="text-sm leading-6 text-slate-300">
              {listing.description}
            </Text>
          </View>

          {/* Seller Info */}
          {listing.seller && (
            <View className="mb-6 rounded-xl bg-slate-800 p-4">
              <Text className="mb-3 text-sm font-semibold text-white">Seller</Text>
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-700">
                  {listing.seller.image ? (
                    <Image
                      source={{ uri: listing.seller.image }}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <User size={24} color="#94A3B8" />
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-white">
                    {listing.seller.name ?? "User"}
                  </Text>
                  <Text className="text-sm text-slate-400">
                    Member since {formatDate(listing.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* iRepair Rhodes Banner */}
          <Pressable className="mb-6 overflow-hidden rounded-xl">
            <LinearGradient
              colors={["#06B6D4", "#0891B2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
            >
              <View className="mr-3 rounded-lg bg-white/20 p-2">
                <Shield size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-white">
                  Get this device verified
                </Text>
                <Text className="mt-0.5 text-xs text-cyan-100">
                  Visit iRepair Rhodes for full diagnostics
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Spacer for bottom button */}
          <View className="h-24" />
        </View>
      </ScrollView>

      {/* Contact Button */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0"
      >
        <LinearGradient
          colors={["transparent", "#0F172A"]}
          style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <Pressable
            onPress={handleContact}
            className="flex-row items-center justify-center rounded-xl bg-cyan-500 py-4"
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text className="ml-2 text-lg font-bold text-white">
              Contact Seller
            </Text>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}
