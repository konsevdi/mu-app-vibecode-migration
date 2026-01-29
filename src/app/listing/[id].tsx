import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Zap,
  Store,
  Flag,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingResponse } from "@/shared/contracts";
import { useCityStore } from "@/lib/cityStore";
import { V1_STORES } from "@/lib/stores";
import { VERIFICATION_LABEL, gradeLabels } from "@/lib/verification";
import { SafetyTips } from "@/components/SafetyTips";
import * as WebBrowser from "expo-web-browser";
import {
  useDimensions,
  getResponsivePadding,
  useMaxContentWidth,
  useResponsiveValue,
} from "@/lib/responsive";

const conditionLabels: Record<string, { label: string; color: string; description: string }> = {
  new: { label: "Καινούργιο", color: "#00FF88", description: "Αχρησιμοποίητο, στην αρχική συσκευασία" },
  like_new: { label: "Σαν Καινούργιο", color: "#00BFFF", description: "Ελάχιστη χρήση, άριστη κατάσταση" },
  good: { label: "Καλό", color: "#FFD700", description: "Μικρά σημάδια χρήσης" },
  fair: { label: "Μέτριο", color: "#FF6B6B", description: "Φανερή χρήση, πλήρως λειτουργικό" },
};

const categoryLabels: Record<string, string> = {
  phone: "Κινητό",
  tablet: "Tablet",
  accessory: "Αξεσουάρ",
};

function SkeletonDetail() {
  return (
    <View className="flex-1 bg-black">
      <View className="h-80 w-full bg-gray-800/50" />
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 }}
      >
        <View className="mb-3 h-8 w-24 rounded-full bg-gray-700/50" />
        <View className="mb-3 h-8 w-full rounded bg-gray-700/50" />
        <View className="mb-5 h-10 w-32 rounded bg-gray-700/50" />
        <View className="mb-5 h-20 w-full rounded-2xl bg-gray-700/50" />
        <View className="h-32 w-full rounded-2xl bg-gray-700/50" />
      </LinearGradient>
    </View>
  );
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerCity = useCityStore((s) => s.defaultCity);

  const { width } = useDimensions();
  const maxContentWidth = useMaxContentWidth();
  const padding = getResponsivePadding();

  // Responsive image height
  const imageHeight = useResponsiveValue({
    default: 320,
    lg: 400,
    xl: 450,
  });

  // Content width for centering on web
  const contentWidth = maxContentWidth ?? width;

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.get<GetListingResponse>(`/api/listings/${id}`),
    enabled: !!id,
  });

  const condition = listing ? conditionLabels[listing.condition] ?? conditionLabels.good : conditionLabels.good;

  const handleContact = () => {
    if (listing?.seller?.email) {
      Linking.openURL(`mailto:${listing.seller.email}?subject=Ενδιαφέρομαι για ${listing.title}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("el-GR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openStorePage = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  const openInMaps = (store: typeof V1_STORES[number]) => {
    const { lat, lng } = store.coords;
    const appleMapsUrl = `maps://maps.apple.com/?q=${encodeURIComponent(store.name)}&ll=${lat},${lng}`;
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

    Linking.canOpenURL(appleMapsUrl).then((supported) => {
      if (supported) {
        Linking.openURL(appleMapsUrl);
      } else {
        Linking.openURL(googleMapsUrl);
      }
    });
  };

  const reportMutation = useMutation({
    mutationFn: () => api.post(`/api/listings/${id}/report`, {}),
    onSuccess: () => {
      Alert.alert(
        "Αναφορά Υποβλήθηκε",
        "Ευχαριστούμε για την αναφορά. Θα εξετάσουμε την αγγελία.\n\nReport submitted. We'll review this listing.",
        [{ text: "OK" }]
      );
    },
    onError: () => {
      Alert.alert("Σφάλμα", "Δοκιμάστε ξανά αργότερα.");
    },
  });

  const handleReport = () => {
    Alert.alert(
      "Αναφορά Αγγελίας",
      "Θέλετε να αναφέρετε αυτή την αγγελία ως ύποπτη;\n\nReport this listing as suspicious?",
      [
        { text: "Άκυρο", style: "cancel" },
        { text: "Αναφορά", style: "destructive", onPress: () => reportMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return <SkeletonDetail />;
  }

  if (!listing) {
    return (
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Text className="text-xl font-black text-white">Η αγγελία δεν βρέθηκε</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 overflow-hidden rounded-full"
            style={{ borderWidth: 2, borderColor: "#FF00FF", minHeight: 48 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <LinearGradient
              colors={["#FF00FF", "#CC00CC"]}
              style={{ paddingHorizontal: 32, paddingVertical: 16 }}
            >
              <Text className="font-black uppercase text-white">Πίσω</Text>
            </LinearGradient>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
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
        style={{ height: imageHeight, flexGrow: 0 }}
      >
        {listing.images.map((image: string, index: number) => (
          <Image
            key={index}
            source={{ uri: image }}
            style={{ width, height: imageHeight }}
            resizeMode="cover"
            accessibilityLabel={`Product image ${index + 1} of ${listing.images.length}`}
          />
        ))}
      </ScrollView>

      {/* Back Button */}
      <SafeAreaView
        edges={["top"]}
        className="absolute left-0 right-0 top-0"
        style={{ pointerEvents: "box-none" }}
      >
        <View
          className="flex-row items-center justify-between py-2"
          style={{
            paddingHorizontal: padding,
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? "center" : undefined,
            width: "100%",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", borderWidth: 2, borderColor: "#FF00FF" }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color="#FF00FF" />
          </Pressable>
          <View className="flex-row">
            <Pressable
              onPress={handleReport}
              className="mr-2 h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.7)", borderWidth: 2, borderColor: "#FF6B6B" }}
              accessibilityRole="button"
              accessibilityLabel="Report listing"
            >
              <Flag size={20} color="#FF6B6B" />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.7)", borderWidth: 2, borderColor: "#00FF88" }}
              accessibilityRole="button"
              accessibilityLabel="Share listing"
            >
              <Share2 size={20} color="#00FF88" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          maxWidth: maxContentWidth,
          alignSelf: maxContentWidth ? "center" : undefined,
          width: maxContentWidth ? "100%" : undefined,
        }}
      >
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 28, paddingHorizontal: padding }}
        >
          {/* Price & Title */}
          <View className="mb-5">
            <View className="mb-3 flex-row flex-wrap items-center gap-2">
              <View
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: `${condition.color}20`, borderWidth: 1, borderColor: condition.color }}
              >
                <Text style={{ color: condition.color }} className="text-sm font-bold uppercase">
                  {condition.label}
                </Text>
              </View>
              <View className="rounded-full bg-gray-800 px-3 py-2">
                <Text className="text-sm font-bold text-gray-400">
                  {categoryLabels[listing.category] ?? listing.category}
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-black text-white" accessibilityRole="header">
              {listing.title}
            </Text>
            <Text className="mt-3 text-4xl font-black text-fuchsia-400">
              €{listing.price.toFixed(0)}
            </Text>
          </View>

          {/* Meta Info */}
          <View className="mb-5 flex-row flex-wrap gap-2">
            <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: "#FF00FF20" }}>
              <MapPin size={16} color="#FF00FF" />
              <Text className="ml-2 text-sm font-bold text-fuchsia-400">ΠΑΡΑΛΑΒΗ ΜΟΝΟ</Text>
            </View>
            {listing.location && (
              <View className="flex-row items-center rounded-full bg-gray-800 px-3 py-2">
                <MapPin size={16} color="#FF00FF" />
                <Text className="ml-2 text-sm font-semibold text-gray-300">{listing.location}</Text>
              </View>
            )}
            <View className="flex-row items-center rounded-full bg-gray-800 px-3 py-2">
              <Eye size={16} color="#00FF88" />
              <Text className="ml-2 text-sm font-semibold text-gray-300">{listing.views} προβολές</Text>
            </View>
            <View className="flex-row items-center rounded-full bg-gray-800 px-3 py-2">
              <Calendar size={16} color="#FFD700" />
              <Text className="ml-2 text-sm font-semibold text-gray-300">
                {formatDate(listing.createdAt)}
              </Text>
            </View>
          </View>

          {/* Brand & Model */}
          {(listing.brand ?? listing.model) && (
            <View className="mb-5 flex-row overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ flex: 1, flexDirection: "row", padding: 16 }}
              >
                {listing.brand && (
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-500">Μάρκα</Text>
                    <Text className="mt-1 text-base font-bold text-white">{listing.brand}</Text>
                  </View>
                )}
                {listing.model && (
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-500">Μοντέλο</Text>
                    <Text className="mt-1 text-base font-bold text-white">{listing.model}</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Condition Details */}
          <View className="mb-5 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: condition.color }}>
            <LinearGradient
              colors={["#1a1a2e", "#0f0f23"]}
              style={{ padding: 16 }}
            >
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">Κατάσταση</Text>
              <View className="flex-row items-center">
                <View
                  className="mr-4 rounded-2xl p-3"
                  style={{ backgroundColor: `${condition.color}20` }}
                >
                  <Shield size={24} color={condition.color} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: condition.color }} className="text-lg font-black">
                    {condition.label}
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-gray-400">{condition.description}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Verified by iRepair */}
          {listing.grade && listing.checklistComplete && (
            <View className="mb-5 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#00FF88" }}>
              <LinearGradient
                colors={["#00FF8815", "#0f0f23"]}
                style={{ padding: 16 }}
              >
                <View className="flex-row items-center">
                  <View className="mr-4 rounded-2xl p-3" style={{ backgroundColor: "#00FF8820" }}>
                    <Shield size={24} color="#00FF88" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-emerald-400">
                      Verified by {VERIFICATION_LABEL}
                    </Text>
                    <Text className="mt-1 text-sm font-medium text-gray-400">
                      Βαθμός: {gradeLabels[listing.grade]?.label ?? listing.grade} • Checklist ολοκληρώθηκε
                    </Text>
                    {listing.inspectionDate && (
                      <Text className="mt-1 text-xs font-medium text-gray-500">
                        Ελέγχθηκε: {new Date(listing.inspectionDate).toLocaleDateString("el-GR")}
                      </Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Description */}
          <View className="mb-5">
            <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">Περιγραφή</Text>
            <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ padding: 16 }}
              >
                <Text className="text-base font-medium leading-7 text-gray-300">
                  {listing.description}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Safety Tips */}
          <SafetyTips showIRepairSuggestion={viewerCity === "rhodes" && listing.city === "rhodes"} />

          {/* Get Graded CTA */}
          {!listing.grade && (
            <View className="mb-5">
              <Pressable
                onPress={() => router.push(`/book-appointment?listingId=${listing.id}` as Href)}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: "#00FF88", minHeight: 56 }}
                accessibilityRole="button"
                accessibilityLabel="Get device graded at iRepair"
              >
                <LinearGradient
                  colors={["#00FF88", "#00CC6A"]}
                  style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
                >
                  <View className="mr-4 rounded-xl bg-black/20 p-3">
                    <Zap size={24} color="#000" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-black">
                      Βαθμολόγησε στο iRepair
                    </Text>
                    <Text className="mt-1 text-sm font-semibold text-black/70">
                      Get graded at iRepair Rhodes
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => WebBrowser.openBrowserAsync("https://public.irepair.gr/service-app")}
                className="mt-2 rounded-xl bg-gray-800 px-4 py-3"
                style={{ minHeight: 44 }}
                accessibilityRole="link"
                accessibilityLabel="Book appointment online"
              >
                <Text className="text-center text-sm font-bold text-gray-400">
                  Ή κλείσε ραντεβού online →
                </Text>
              </Pressable>
            </View>
          )}

          {/* Seller Info */}
          {listing.seller && (
            <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#FF00FF" }}>
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ padding: 16 }}
              >
                <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">Πωλητής</Text>
                <View className="flex-row items-center">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-full"
                    style={{ borderWidth: 2, borderColor: "#FF00FF", backgroundColor: "#FF00FF20" }}
                  >
                    {listing.seller.image ? (
                      <Image
                        source={{ uri: listing.seller.image }}
                        className="h-12 w-12 rounded-full"
                        accessibilityLabel={`${listing.seller.name ?? "User"} profile picture`}
                      />
                    ) : (
                      <User size={28} color="#FF00FF" />
                    )}
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-black text-white">
                      {listing.seller.name ?? "Χρήστης"}
                    </Text>
                    <Text className="text-sm font-medium text-gray-400">
                      Μέλος από {formatDate(listing.createdAt)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* iRepair Rhodes Banner */}
          <Pressable
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ borderWidth: 2, borderColor: "#00FF88", minHeight: 56 }}
            accessibilityRole="button"
            accessibilityLabel="Certify device at iRepair"
          >
            <LinearGradient
              colors={["#00FF88", "#00CC6A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, flexDirection: "row", alignItems: "center" }}
            >
              <View className="mr-4 rounded-xl bg-black/20 p-3">
                <Shield size={28} color="#000" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-black">
                  Πιστοποίησε τη συσκευή
                </Text>
                <Text className="mt-1 text-sm font-semibold text-black/70">
                  Επίσκεψη στο iRepair Ρόδος για διαγνωστικά
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Safe Meetup Suggestion */}
          {viewerCity === "rhodes" && listing.city === "rhodes" ? (
            <View className="mb-6">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                ΑΣΦΑΛΗΣ ΣΥΝΑΝΤΗΣΗ
              </Text>
              {V1_STORES.map((store) => (
                <View key={store.id} className="mb-3 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: store.isPrimary ? "#FFD700" : "#333" }}>
                  <LinearGradient colors={["#1a1a2e", "#0f0f23"]} style={{ padding: 16 }}>
                    <View className="flex-row items-center">
                      <View className="mr-4 rounded-xl p-3" style={{ backgroundColor: store.isPrimary ? "#FFD70020" : "#FF00FF20" }}>
                        <Store size={24} color={store.isPrimary ? "#FFD700" : "#FF00FF"} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-black text-white">{store.name}</Text>
                        {"subtitle" in store && <Text className="text-xs font-medium text-gray-500">{store.subtitle}</Text>}
                        <Text className="mt-1 text-sm font-medium text-gray-400">{store.address}</Text>
                      </View>
                    </View>
                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        onPress={() => openStorePage(store.storePageUrl)}
                        className="flex-1 rounded-xl bg-gray-800 px-3 py-3"
                        style={{ minHeight: 44 }}
                        accessibilityRole="link"
                        accessibilityLabel={`Visit ${store.name} website`}
                      >
                        <Text className="text-center text-sm font-bold text-white">ΣΕΛΙΔΑ</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openInMaps(store)}
                        className="flex-1 rounded-xl bg-gray-800 px-3 py-3"
                        style={{ minHeight: 44 }}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${store.name} in maps`}
                      >
                        <Text className="text-center text-sm font-bold text-white">ΧΑΡΤΗΣ</Text>
                      </Pressable>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>
          ) : !viewerCity ? (
            <View className="mb-6 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#666" }}>
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ padding: 16 }}
              >
                <Text className="text-sm font-medium text-gray-400">
                  Επίλεξε την πόλη σου για να δεις προτάσεις ασφαλούς συνάντησης.
                </Text>
              </LinearGradient>
            </View>
          ) : null}

          {/* Spacer for bottom button */}
          <View className="h-28" />
        </LinearGradient>
      </ScrollView>

      {/* Contact Button */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0"
      >
        <LinearGradient
          colors={["transparent", "#0a0a0a", "#0a0a0a"]}
          style={{
            paddingTop: 24,
            paddingHorizontal: padding,
            paddingBottom: 20,
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? "center" : undefined,
            width: "100%",
          }}
        >
          <Pressable
            onPress={handleContact}
            className="overflow-hidden rounded-2xl"
            style={{ borderWidth: 2, borderColor: "#FF00FF", minHeight: 56 }}
            accessibilityRole="button"
            accessibilityLabel="Contact seller"
          >
            <LinearGradient
              colors={["#FF00FF", "#CC00CC"]}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18 }}
            >
              <MessageCircle size={24} color="#FFFFFF" />
              <Text className="ml-3 text-xl font-black uppercase text-white">
                Επικοινωνία με Πωλητή
              </Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}
