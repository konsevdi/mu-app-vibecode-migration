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
import {
  User,
  Settings,
  Package,
  LogOut,
  ChevronRight,
  MapPin,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { type GetListingsResponse, type Listing } from "@/shared/contracts";

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "#22C55E" },
  like_new: { label: "Like New", color: "#06B6D4" },
  good: { label: "Good", color: "#F59E0B" },
  fair: { label: "Fair", color: "#94A3B8" },
};

function MyListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      className="mb-3 flex-row overflow-hidden rounded-xl bg-slate-800"
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
            style={{ backgroundColor: `${condition.color}20` }}
          >
            <Text style={{ color: condition.color }} className="text-xs font-medium">
              {condition.label}
            </Text>
          </View>
          <Text className="ml-2 text-xs text-slate-500">
            {listing.views} views
          </Text>
        </View>
        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
          {listing.title}
        </Text>
        <Text className="mt-1 text-base font-bold text-cyan-400">
          €{listing.price.toFixed(0)}
        </Text>
      </View>
      <View className="items-center justify-center pr-4">
        <ChevronRight size={20} color="#64748B" />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

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
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Text className="text-slate-400">Loading...</Text>
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View className="flex-1 bg-slate-900">
        <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center px-8">
          <User size={64} color="#334155" />
          <Text className="mt-6 text-center text-xl font-bold text-white">
            Sign in to view your profile
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-400">
            Manage your listings and account settings
          </Text>
          <Pressable
            onPress={() => router.push("/login" as Href)}
            className="mt-8 rounded-full bg-cyan-500 px-8 py-4"
          >
            <Text className="text-lg font-semibold text-white">Sign In</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#06B6D4"
            />
          }
        >
          {/* Profile Header */}
          <View className="items-center px-5 pb-6 pt-8">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-700">
              {session.user.image ? (
                <Image
                  source={{ uri: session.user.image }}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <User size={40} color="#94A3B8" />
              )}
            </View>
            <Text className="mt-4 text-xl font-bold text-white">
              {session.user.name ?? "User"}
            </Text>
            <Text className="mt-1 text-sm text-slate-400">
              {session.user.email}
            </Text>
          </View>

          {/* Stats */}
          <View className="mx-5 mb-6 flex-row rounded-xl bg-slate-800 p-4">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-cyan-400">
                {myListings?.total ?? 0}
              </Text>
              <Text className="mt-1 text-xs text-slate-400">Listings</Text>
            </View>
            <View className="mx-4 w-px bg-slate-700" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-cyan-400">
                {myListings?.listings?.reduce((sum, l) => sum + l.views, 0) ?? 0}
              </Text>
              <Text className="mt-1 text-xs text-slate-400">Total Views</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mx-5 mb-6">
            <Pressable
              onPress={() => router.push("/sell" as Href)}
              className="mb-3 flex-row items-center rounded-xl bg-cyan-500 p-4"
            >
              <Package size={24} color="#FFFFFF" />
              <Text className="ml-3 flex-1 text-base font-semibold text-white">
                Create New Listing
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* My Listings */}
          <View className="px-5">
            <Text className="mb-4 text-lg font-bold text-white">
              My Listings
            </Text>
            {myListings?.listings && myListings.listings.length > 0 ? (
              myListings.listings.map((listing: Listing) => (
                <MyListingCard key={listing.id} listing={listing} />
              ))
            ) : (
              <View className="items-center rounded-xl bg-slate-800/50 py-8">
                <Package size={40} color="#334155" />
                <Text className="mt-3 text-slate-400">
                  No listings yet
                </Text>
                <Pressable
                  onPress={() => router.push("/sell" as Href)}
                  className="mt-4 rounded-full bg-cyan-500/20 px-6 py-2"
                >
                  <Text className="font-semibold text-cyan-400">
                    Create your first listing
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Sign Out */}
          <View className="mx-5 mb-8 mt-8">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center rounded-xl bg-red-500/10 py-4"
            >
              <LogOut size={20} color="#EF4444" />
              <Text className="ml-2 text-base font-semibold text-red-500">
                Sign Out
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
