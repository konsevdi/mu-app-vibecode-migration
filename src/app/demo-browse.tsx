import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
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
  Lock,
  AlertCircle,
  X,
  Wrench,
  MessageCircle,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { type GetListingsResponse, type Listing } from "@/shared/contracts";
import { isListingVerified } from "@/lib/verification";
import { useTranslation, type TranslationKey } from "@/lib/languageStore";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { LanguageTogglePill } from "@/components/LanguageTogglePill";
import {
  useReduceMotion,
  TIMING,
  EASE_OUT,
  EASE_PREMIUM,
  SPRING_RESPONSIVE,
} from "@/lib/animations";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const categories = [
  {
    id: "phone",
    name: "PHONES",
    nameEl: "ΚΙΝΗΤΑ",
    icon: Smartphone,
    color: "#FF00FF",
    bgColor: "#FF00FF20",
  },
  {
    id: "tablet",
    name: "TABLETS",
    nameEl: "TABLETS",
    icon: Tablet,
    color: "#00FF88",
    bgColor: "#00FF8820",
  },
  {
    id: "laptop",
    name: "LAPTOPS",
    nameEl: "LAPTOPS",
    icon: Laptop,
    color: "#00BFFF",
    bgColor: "#00BFFF20",
  },
  {
    id: "accessory",
    name: "ACCESSORIES",
    nameEl: "ΑΞΕΣΟΥΑΡ",
    icon: Headphones,
    color: "#FFD700",
    bgColor: "#FFD70020",
  },
];

const conditionLabels: Record<
  string,
  { label: string; labelEl: string; color: string }
> = {
  new: { label: "New", labelEl: "Καινούργιο", color: "#00FF88" },
  like_new: { label: "Like New", labelEl: "Σαν Καινούργιο", color: "#00BFFF" },
  good: { label: "Good", labelEl: "Καλό", color: "#FFD700" },
  fair: { label: "Fair", labelEl: "Μέτριο", color: "#FF6B6B" },
};

// ============================================================================
// PREMIUM DEMO LOCKED MODAL
// ============================================================================

function DemoLockedModal({
  visible,
  onClose,
  onJoinWaitlist,
  onRepairQuote,
  onAskAccessories,
  language,
  t,
  reduceMotion,
}: {
  visible: boolean;
  onClose: () => void;
  onJoinWaitlist: () => void;
  onRepairQuote: () => void;
  onAskAccessories: () => void;
  language: string;
  t: (key: TranslationKey) => string;
  reduceMotion: boolean;
}) {
  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(reduceMotion ? 1 : 0.95);
  const modalTranslateY = useSharedValue(reduceMotion ? 0 : 20);
  const modalOpacity = useSharedValue(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Animate in
      backdropOpacity.value = withTiming(1, {
        duration: TIMING.micro,
        easing: EASE_OUT,
      });
      modalOpacity.value = withDelay(
        50,
        withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
      );
      if (!reduceMotion) {
        modalScale.value = withDelay(
          50,
          withTiming(1, { duration: TIMING.small, easing: EASE_PREMIUM })
        );
        modalTranslateY.value = withDelay(
          50,
          withTiming(0, { duration: TIMING.small, easing: EASE_PREMIUM })
        );
      }
    } else if (isVisible) {
      // Animate out
      modalOpacity.value = withTiming(0, {
        duration: TIMING.micro,
        easing: EASE_OUT,
      });
      if (!reduceMotion) {
        modalTranslateY.value = withTiming(20, {
          duration: TIMING.micro,
          easing: EASE_OUT,
        });
      }
      backdropOpacity.value = withTiming(
        0,
        { duration: TIMING.micro, easing: EASE_OUT },
        () => {
          runOnJS(setIsVisible)(false);
        }
      );
    }
  }, [
    visible,
    isVisible,
    reduceMotion,
    backdropOpacity,
    modalOpacity,
    modalScale,
    modalTranslateY,
  ]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [
      { scale: modalScale.value },
      { translateY: modalTranslateY.value },
    ],
  }));

  if (!isVisible && !visible) return null;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalBackdrop, backdropStyle]}>
        <Pressable style={styles.modalBackdropPressable} onPress={handleClose}>
          <Animated.View style={[styles.modalContainer, modalStyle]}>
            <Pressable
              onPress={handleClose}
              style={styles.modalCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#666" />
            </Pressable>

            <View style={styles.modalContent}>
              {/* Lock Icon */}
              <View style={styles.modalIcon}>
                <Lock size={36} color="#FF00FF" />
              </View>

              <Text style={styles.modalTitle}>{t("demo_locked_title")}</Text>

              <Text style={styles.modalSubtitle}>
                {t("demo_locked_subtitle")}
              </Text>

              {/* Primary CTA - Join Waitlist */}
              <AnimatedModalButton
                onPress={onJoinWaitlist}
                label={t("demo_locked_cta")}
                variant="primary"
                reduceMotion={reduceMotion}
              />

              {/* Secondary CTA - Repair Quote */}
              <AnimatedModalButton
                onPress={onRepairQuote}
                label={
                  language === "el" ? "Ζήτα προσφορά επισκευής" : "Get repair quote"
                }
                variant="secondary"
                icon={<Wrench size={18} color="#FFD700" />}
                reduceMotion={reduceMotion}
              />

              {/* Tertiary CTA - Accessories */}
              <Pressable onPress={onAskAccessories} style={styles.modalLinkCTA}>
                <MessageCircle size={14} color="#666" />
                <Text style={styles.modalLinkText}>
                  {language === "el" ? "Ρώτα μας" : "Ask us"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function AnimatedModalButton({
  onPress,
  label,
  variant,
  icon,
  reduceMotion,
}: {
  onPress: () => void;
  label: string;
  variant: "primary" | "secondary";
  icon?: React.ReactNode;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.97, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RESPONSIVE);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(
      variant === "primary"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    onPress();
  }, [variant, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.modalButton,
        isPrimary ? styles.modalButtonPrimary : styles.modalButtonSecondary,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={["#00FF88", "#00CC6A"]}
          style={styles.modalButtonGradient}
        >
          <Text style={styles.modalButtonTextPrimary}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.modalButtonContent}>
          {icon}
          <Text style={styles.modalButtonTextSecondary}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// EXISTING COMPONENTS (unchanged logic, just using LanguageTogglePill)
// ============================================================================

function FeaturedListingCard({
  listing,
  onPress,
  language,
}: {
  listing: Listing;
  onPress: () => void;
  language: string;
}) {
  const condition = conditionLabels[listing.condition] ?? conditionLabels.good;

  return (
    <Pressable
      onPress={onPress}
      className="mr-4 overflow-hidden rounded-3xl"
      style={{ width: CARD_WIDTH }}
    >
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={{ borderRadius: 24 }}>
        <Image
          source={{
            uri:
              listing.images[0] ??
              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
          }}
          className="h-48 w-full"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          resizeMode="cover"
        />
        <View className="p-5">
          <View className="mb-3 flex-row items-center">
            <View
              className="mr-2 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: `${condition.color}25`,
                borderWidth: 1,
                borderColor: condition.color,
              }}
            >
              <Text
                style={{ color: condition.color }}
                className="text-xs font-bold uppercase"
              >
                {language === "el" ? condition.labelEl : condition.label}
              </Text>
            </View>
            {listing.isFeatured && (
              <View
                className="flex-row items-center rounded-full bg-yellow-400/20 px-3 py-1.5"
                style={{ borderWidth: 1, borderColor: "#FFD700" }}
              >
                <Sparkles size={12} color="#FFD700" />
                <Text className="ml-1 text-xs font-bold uppercase text-yellow-400">
                  Top
                </Text>
              </View>
            )}
            {isListingVerified(listing) && (
              <View
                className="flex-row items-center rounded-full bg-emerald-400/20 px-3 py-1.5"
                style={{ borderWidth: 1, borderColor: "#00FF88" }}
              >
                <Shield size={12} color="#00FF88" />
                <Text className="ml-1 text-xs font-bold text-emerald-400">
                  Verified
                </Text>
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
              <Text className="ml-1 text-sm font-medium text-gray-400">
                {listing.location}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function CategoryCard({
  category,
  onPress,
  language,
}: {
  category: (typeof categories)[0];
  onPress: () => void;
  language: string;
}) {
  const Icon = category.icon;

  return (
    <Pressable
      onPress={onPress}
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
        <Text className="text-base font-bold text-white">
          {language === "el" ? category.nameEl : category.name}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DemoBrowseScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const reduceMotion = useReduceMotion();
  const selectedCity = useOnboardingStore((s) => s.selectedCity);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: () =>
      api.get<GetListingsResponse>("/api/listings?featured=true&limit=10"),
  });

  const { data: recentData } = useQuery({
    queryKey: ["listings", "recent"],
    queryFn: () => api.get<GetListingsResponse>("/api/listings?limit=6"),
  });

  const handleLockedAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLockedModal(true);
  };

  const handleJoinWaitlist = () => {
    setShowLockedModal(false);
    router.push({
      pathname: "/waitlist",
      params: {
        city: selectedCity?.name ?? "",
        country: selectedCity?.country ?? "",
      },
    });
  };

  const handleRepairQuote = () => {
    setShowLockedModal(false);
    router.push({
      pathname: "/waitlist",
      params: {
        city: selectedCity?.name ?? "",
        country: selectedCity?.country ?? "",
        intent: "repair",
      },
    });
  };

  const handleAskAccessories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLockedModal(false);
    // TODO: Open contact/chat
  };

  const handleListingPress = (listingId: string) => {
    router.push(`/listing/${listingId}` as Href);
  };

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 350 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Demo Banner */}
        <View
          className="mx-4 mt-2 flex-row items-center justify-between rounded-full px-4 py-2"
          style={{
            backgroundColor: "#FFD70020",
            borderWidth: 1,
            borderColor: "#FFD700",
          }}
        >
          <View className="flex-row items-center">
            <AlertCircle size={18} color="#FFD700" />
            <Text className="ml-2 text-sm font-bold text-yellow-400">
              {t("demo_banner")}
            </Text>
          </View>
          <LanguageTogglePill />
        </View>

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
              <Text className="ml-2 text-4xl font-black text-white">
                Mobile Unit
              </Text>
            </View>
            <Text className="mt-2 text-lg font-semibold text-gray-400">
              {language === "el"
                ? "Αγορά & Πώληση συσκευών στην Ελλάδα"
                : "Buy & Sell devices in Greece"}
            </Text>
          </View>

          {/* iRepair Rhodes Banner (Locked) */}
          <Pressable
            onPress={handleLockedAction}
            className="mx-5 mb-8 overflow-hidden rounded-3xl"
            style={{ borderWidth: 2, borderColor: "#333" }}
          >
            <LinearGradient
              colors={["#333", "#222"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 24,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View className="mr-4 rounded-2xl bg-black/20 p-4">
                <Lock size={32} color="#666" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-black text-gray-500">
                  iRepair {language === "el" ? "ΡΟΔΟΣ" : "RHODES"}
                </Text>
                <Text className="mt-1 text-base font-semibold text-gray-600">
                  {language === "el"
                    ? "Πιστοποιηση & Διαγνωστικα συσκευων"
                    : "Device certification & diagnostics"}
                </Text>
              </View>
              <Lock size={24} color="#666" />
            </LinearGradient>
          </Pressable>

          {/* Categories */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between px-5">
              <Text className="text-2xl font-black uppercase tracking-wider text-white">
                {language === "el" ? "ΚΑΤΗΓΟΡΙΕΣ" : "CATEGORIES"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              style={{ flexGrow: 0 }}
            >
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onPress={handleLockedAction}
                  language={language}
                />
              ))}
            </ScrollView>
          </View>

          {/* Featured Listings */}
          <View className="mb-8">
            <View className="mb-5 flex-row items-center justify-between px-5">
              <View className="flex-row items-center">
                <Sparkles size={22} color="#FFD700" />
                <Text className="ml-2 text-2xl font-black uppercase tracking-wider text-white">
                  {language === "el" ? "ΠΡΟΤΕΙΝΟΜΕΝΑ" : "FEATURED"}
                </Text>
              </View>
              <Pressable
                onPress={handleLockedAction}
                className="flex-row items-center rounded-full bg-fuchsia-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#FF00FF" }}
              >
                <Text className="mr-1 text-sm font-bold uppercase text-fuchsia-400">
                  {language === "el" ? "ΟΛΑ" : "ALL"}
                </Text>
                <ChevronRight size={16} color="#FF00FF" />
              </Pressable>
            </View>
            {isLoading ? (
              <View className="h-64 items-center justify-center">
                <Text className="text-lg font-bold text-gray-500">
                  {language === "el" ? "Φόρτωση..." : "Loading..."}
                </Text>
              </View>
            ) : data?.listings && data.listings.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                style={{ flexGrow: 0 }}
              >
                {data.listings.map((listing: Listing) => (
                  <FeaturedListingCard
                    key={listing.id}
                    listing={listing}
                    onPress={() => handleListingPress(listing.id)}
                    language={language}
                  />
                ))}
              </ScrollView>
            ) : (
              <View
                className="mx-5 overflow-hidden rounded-3xl"
                style={{ borderWidth: 2, borderColor: "#333" }}
              >
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 32, alignItems: "center" }}
                >
                  <Sparkles size={48} color="#666" />
                  <Text className="mt-4 text-center text-lg font-bold text-gray-400">
                    {language === "el"
                      ? "Δεν υπάρχουν ακόμα προτεινόμενα"
                      : "No featured listings yet"}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Recent Listings */}
          <View className="mb-8 px-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-2xl font-black uppercase tracking-wider text-white">
                {language === "el" ? "ΠΡΟΣΦΑΤΑ" : "RECENT"}
              </Text>
              <Pressable
                onPress={handleLockedAction}
                className="flex-row items-center rounded-full bg-emerald-500/20 px-4 py-2"
                style={{ borderWidth: 1, borderColor: "#00FF88" }}
              >
                <Text className="mr-1 text-sm font-bold uppercase text-emerald-400">
                  {language === "el" ? "ΟΛΑ" : "ALL"}
                </Text>
                <ChevronRight size={16} color="#00FF88" />
              </Pressable>
            </View>
            {recentData?.listings && recentData.listings.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {recentData.listings.map((listing: Listing) => (
                  <Pressable
                    key={listing.id}
                    onPress={() => handleListingPress(listing.id)}
                    className="mb-4 w-[48%] overflow-hidden rounded-2xl"
                    style={{ borderWidth: 2, borderColor: "#333" }}
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
              <View
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: "#333" }}
              >
                <LinearGradient
                  colors={["#1a1a2e", "#0f0f23"]}
                  style={{ padding: 24, alignItems: "center" }}
                >
                  <Text className="text-center font-bold text-gray-500">
                    {language === "el"
                      ? "Δεν υπάρχουν ακόμα αγγελίες"
                      : "No listings yet"}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Join Waitlist CTA */}
          <View className="mx-5 mb-8">
            <Pressable
              onPress={() => router.push("/waitlist" as Href)}
              className="overflow-hidden rounded-2xl"
              style={{ borderWidth: 2, borderColor: "#00FF88" }}
            >
              <LinearGradient
                colors={["#00FF88", "#00CC6A"]}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 18,
                }}
              >
                <Text className="text-xl font-black text-black">
                  {t("join_waitlist")}
                </Text>
                <ChevronRight size={24} color="#000" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Premium Locked Modal */}
      <DemoLockedModal
        visible={showLockedModal}
        onClose={() => setShowLockedModal(false)}
        onJoinWaitlist={handleJoinWaitlist}
        onRepairQuote={handleRepairQuote}
        onAskAccessories={handleAskAccessories}
        language={language}
        t={t}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  modalBackdropPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: "#1a1a2e",
    borderWidth: 1.5,
    borderColor: "#FF00FF",
    overflow: "hidden",
  },
  modalCloseButton: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
  modalContent: {
    alignItems: "center",
    padding: 28,
    paddingTop: 32,
  },
  modalIcon: {
    marginBottom: 20,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 0, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "#FF00FF",
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  modalSubtitle: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    color: "#9ca3af",
    lineHeight: 22,
  },
  modalButton: {
    marginTop: 16,
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  modalButtonPrimary: {
    borderWidth: 2,
    borderColor: "#00FF88",
  },
  modalButtonSecondary: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  modalButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  modalButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  modalButtonTextPrimary: {
    fontSize: 17,
    fontWeight: "900",
    color: "#000",
  },
  modalButtonTextSecondary: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFD700",
  },
  modalLinkCTA: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  modalLinkText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
  },
});
