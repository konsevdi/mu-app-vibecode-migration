import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  PartyPopper,
  Share2,
  Copy,
  Check,
  Play,
  Gift,
} from "lucide-react-native";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function WaitlistSuccessScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const waitlistSignup = useOnboardingStore((s) => s.waitlistSignup);
  const [copied, setCopied] = useState(false);

  // Generate referral link
  const referralCode = waitlistSignup?.referralCode ?? "MUXXXXXX";
  const referralLink = `mobileunit://waitlist?ref=${referralCode}`;
  const shareMessage = language === "el"
    ? `Κάνε εγγραφή στο Mobile Unit! Χρησιμοποίησε τον κωδικό μου ${referralCode} για να ανέβεις στη λίστα αναμονής. ${referralLink}`
    : `Join Mobile Unit! Use my code ${referralCode} to move up the waitlist. ${referralLink}`;

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: shareMessage,
        title: "Mobile Unit",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const handleViewDemo = () => {
    router.replace("/demo-browse" as Href);
  };

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1">
        {/* Language Toggle */}
        <View className="absolute right-4 top-4 z-10">
          <LanguageToggle />
        </View>

        <View className="flex-1 items-center justify-center px-6">
          {/* Success Icon */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View
              className="mb-6 rounded-full p-6"
              style={{ backgroundColor: "#00FF8820", borderWidth: 2, borderColor: "#00FF88" }}
            >
              <PartyPopper size={64} color="#00FF88" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.Text
            entering={FadeInDown.delay(200).springify()}
            className="text-center text-3xl font-black text-white"
          >
            {t("waitlist_success_title")}
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text
            entering={FadeInDown.delay(300).springify()}
            className="mt-4 text-center text-base text-gray-400"
          >
            {t("waitlist_success_subtitle")}
          </Animated.Text>

          {/* Referral Code Card */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mt-8 w-full rounded-2xl p-6"
            style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
          >
            <Text className="text-center text-sm font-bold uppercase text-gray-500">
              {t("your_referral_code")}
            </Text>
            <Text className="mt-2 text-center text-4xl font-black tracking-widest text-white">
              {referralCode}
            </Text>

            {/* Referral bonus info */}
            <View className="mt-4 flex-row items-center justify-center">
              <Gift size={16} color="#FFD700" />
              <Text className="ml-2 text-sm font-medium text-yellow-400">
                {t("referral_bonus")}
              </Text>
            </View>
          </Animated.View>

          {/* Share info */}
          <Animated.Text
            entering={FadeInDown.delay(500).springify()}
            className="mt-4 text-center text-sm text-gray-500"
          >
            {t("share_referral")}
          </Animated.Text>
        </View>

        {/* Action Buttons */}
        <View className="px-6 pb-8">
          {/* Share Button */}
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <Pressable
              onPress={handleShare}
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
                <Share2 size={24} color="#000" />
                <Text className="ml-3 text-xl font-black text-black">
                  {t("share_button")}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Copy Link Button */}
          <Animated.View entering={FadeInUp.delay(700).springify()}>
            <Pressable
              onPress={handleCopyLink}
              className="mt-3 flex-row items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
            >
              {copied ? (
                <>
                  <Check size={20} color="#00FF88" />
                  <Text className="ml-2 text-base font-semibold text-green-400">
                    {t("copied")}
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={20} color="#999" />
                  <Text className="ml-2 text-base font-semibold text-gray-400">
                    {t("copy_link")}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* View Demo Button */}
          <Animated.View entering={FadeInUp.delay(800).springify()}>
            <Pressable
              onPress={handleViewDemo}
              className="mt-3 flex-row items-center justify-center py-4"
            >
              <Play size={20} color="#00BFFF" />
              <Text className="ml-2 text-base font-semibold text-cyan-400">
                {t("view_demo")}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
