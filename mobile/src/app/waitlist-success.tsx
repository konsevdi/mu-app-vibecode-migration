import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Share,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  Check,
  Share2,
  Copy,
  Play,
  Gift,
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageCircle,
  Wrench,
} from "lucide-react-native";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageTogglePill } from "@/components/LanguageTogglePill";
import {
  useReduceMotion,
  TIMING,
  EASE_OUT,
  EASE_PREMIUM,
  SPRING_RESPONSIVE,
  getStaggerDelay,
} from "@/lib/animations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

function AnimatedSuccessIcon({ reduceMotion }: { reduceMotion: boolean }) {
  const scale = useSharedValue(reduceMotion ? 1 : 0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      100,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      scale.value = withDelay(
        100,
        withTiming(1, { duration: TIMING.small, easing: EASE_PREMIUM })
      );
    }
  }, [reduceMotion, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.successIconContainer, animatedStyle]}>
      <Check size={56} color="#00FF88" strokeWidth={3} />
    </Animated.View>
  );
}

function AnimatedText({
  children,
  delay,
  reduceMotion,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  reduceMotion: boolean;
  style?: object;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
  }, [delay, reduceMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[animatedStyle, style]}>{children}</Animated.Text>
  );
}

function AnimatedView({
  children,
  delay,
  reduceMotion,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  reduceMotion: boolean;
  style?: object;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
  }, [delay, reduceMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

function AnimatedActionButton({
  onPress,
  icon,
  label,
  variant,
  delay,
  reduceMotion,
  copied,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  variant: "primary" | "secondary" | "ghost";
  delay: number;
  reduceMotion: boolean;
  copied?: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 16);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
  }, [delay, reduceMotion, opacity, translateY]);

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
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.actionButton,
        isPrimary && styles.actionButtonPrimary,
        isSecondary && styles.actionButtonSecondary,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={["#00FF88", "#00CC6A"]}
          style={styles.actionButtonGradient}
        >
          {icon}
          <Text style={styles.actionButtonTextPrimary}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.actionButtonContent}>
          {copied ? <Check size={20} color="#00FF88" /> : icon}
          <Text
            style={[
              styles.actionButtonTextSecondary,
              copied && styles.actionButtonTextCopied,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

function VoteCityAccordion({
  reduceMotion,
  language,
}: {
  reduceMotion: boolean;
  language: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const height = useSharedValue(0);
  const rotation = useSharedValue(0);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
    height.value = withTiming(isExpanded ? 0 : 120, {
      duration: reduceMotion ? 0 : TIMING.small,
      easing: EASE_PREMIUM,
    });
    rotation.value = withTiming(isExpanded ? 0 : 180, {
      duration: reduceMotion ? 0 : TIMING.micro,
      easing: EASE_PREMIUM,
    });
  }, [isExpanded, reduceMotion, height, rotation]);

  const contentStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: height.value > 0 ? 1 : 0,
    overflow: "hidden",
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.accordionContainer}>
      <Pressable onPress={handleToggle} style={styles.accordionHeader}>
        <View style={styles.accordionHeaderContent}>
          <MapPin size={18} color="#FF00FF" />
          <Text style={styles.accordionTitle}>
            {language === "el" ? "Ψήφισε για την πόλη σου" : "Vote for your city"}
          </Text>
        </View>
        <Animated.View style={iconStyle}>
          <ChevronDown size={20} color="#666" />
        </Animated.View>
      </Pressable>

      <Animated.View style={contentStyle}>
        <View style={styles.accordionContent}>
          <Text style={styles.accordionDescription}>
            {language === "el"
              ? "Βοήθησε μας να επεκταθούμε στην πόλη σου! Κάθε ψήφος μετράει."
              : "Help us expand to your city! Every vote counts."}
          </Text>
          <Pressable style={styles.accordionCTA}>
            <Text style={styles.accordionCTAText}>
              {language === "el" ? "Ψήφισε τώρα" : "Vote now"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function AccessoriesCTA({
  reduceMotion,
  language,
}: {
  reduceMotion: boolean;
  language: string;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.98, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RESPONSIVE);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to accessories or contact
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.accessoriesCTA]}
    >
      <MessageCircle size={16} color="#666" />
      <Text style={styles.accessoriesCTAText}>
        {language === "el" ? "Ρώτα μας για αξεσουάρ" : "Ask us about accessories"}
      </Text>
    </AnimatedPressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WaitlistSuccessScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const reduceMotion = useReduceMotion();
  const waitlistSignup = useOnboardingStore((s) => s.waitlistSignup);
  const [copied, setCopied] = useState(false);

  // Generate referral link
  const referralCode = waitlistSignup?.referralCode ?? "MUXXXXXX";
  const referralLink = `mobileunit://waitlist?ref=${referralCode}`;
  const shareMessage =
    language === "el"
      ? `Κάνε εγγραφή στο Mobile Unit! Χρησιμοποίησε τον κωδικό μου ${referralCode} για να ανέβεις στη λίστα αναμονής. ${referralLink}`
      : `Join Mobile Unit! Use my code ${referralCode} to move up the waitlist. ${referralLink}`;

  const handleShare = async () => {
    try {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/demo-browse" as Href);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex}>
        {/* Language Toggle */}
        <View style={styles.languageToggle}>
          <LanguageTogglePill />
        </View>

        <View style={styles.content}>
          {/* Success Icon */}
          <AnimatedSuccessIcon reduceMotion={reduceMotion} />

          {/* Title */}
          <AnimatedText
            delay={getStaggerDelay(1, 100)}
            reduceMotion={reduceMotion}
            style={styles.title}
          >
            {t("waitlist_success_title")}
          </AnimatedText>

          {/* Subtitle */}
          <AnimatedText
            delay={getStaggerDelay(2, 100)}
            reduceMotion={reduceMotion}
            style={styles.subtitle}
          >
            {t("waitlist_success_subtitle")}
          </AnimatedText>

          {/* Referral Code Card */}
          <AnimatedView
            delay={getStaggerDelay(3, 100)}
            reduceMotion={reduceMotion}
            style={styles.referralCard}
          >
            <Text style={styles.referralLabel}>{t("your_referral_code")}</Text>
            <Text style={styles.referralCode}>{referralCode}</Text>

            {/* Referral bonus info */}
            <View style={styles.referralBonusContainer}>
              <Gift size={16} color="#FFD700" />
              <Text style={styles.referralBonusText}>{t("referral_bonus")}</Text>
            </View>
          </AnimatedView>

          {/* Share info */}
          <AnimatedText
            delay={getStaggerDelay(4, 100)}
            reduceMotion={reduceMotion}
            style={styles.shareInfo}
          >
            {t("share_referral")}
          </AnimatedText>

          {/* Vote for city accordion */}
          <AnimatedView
            delay={getStaggerDelay(5, 100)}
            reduceMotion={reduceMotion}
            style={styles.accordionWrapper}
          >
            <VoteCityAccordion reduceMotion={reduceMotion} language={language} />
          </AnimatedView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Share Button */}
          <AnimatedActionButton
            onPress={handleShare}
            icon={<Share2 size={24} color="#000" />}
            label={t("share_button")}
            variant="primary"
            delay={getStaggerDelay(5, 100)}
            reduceMotion={reduceMotion}
          />

          {/* Copy Link Button */}
          <AnimatedActionButton
            onPress={handleCopyLink}
            icon={<Copy size={20} color="#999" />}
            label={copied ? t("copied") : t("copy_link")}
            variant="secondary"
            delay={getStaggerDelay(6, 100)}
            reduceMotion={reduceMotion}
            copied={copied}
          />

          {/* View Demo Button */}
          <AnimatedActionButton
            onPress={handleViewDemo}
            icon={<Play size={20} color="#00BFFF" />}
            label={t("view_demo")}
            variant="ghost"
            delay={getStaggerDelay(7, 100)}
            reduceMotion={reduceMotion}
          />

          {/* Accessories CTA */}
          <AnimatedView
            delay={getStaggerDelay(8, 100)}
            reduceMotion={reduceMotion}
            style={styles.accessoriesWrapper}
          >
            <AccessoriesCTA reduceMotion={reduceMotion} language={language} />
          </AnimatedView>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  flex: {
    flex: 1,
  },
  languageToggle: {
    position: "absolute",
    right: 16,
    top: 8,
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 24,
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 255, 136, 0.12)",
    borderWidth: 2,
    borderColor: "#00FF88",
  },
  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
  },
  subtitle: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 16,
    color: "#9ca3af",
    lineHeight: 24,
  },
  referralCard: {
    marginTop: 32,
    width: "100%",
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  referralLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: 1,
  },
  referralCode: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#fff",
  },
  referralBonusContainer: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  referralBonusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFD700",
  },
  shareInfo: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
  },
  accordionWrapper: {
    marginTop: 16,
    width: "100%",
  },
  accordionContainer: {
    backgroundColor: "rgba(26, 26, 46, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accordionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  accordionDescription: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 20,
  },
  accordionCTA: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 0, 255, 0.15)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#FF00FF",
  },
  accordionCTAText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF00FF",
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionButtonPrimary: {
    borderWidth: 2,
    borderColor: "#00FF88",
  },
  actionButtonSecondary: {
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  actionButtonTextPrimary: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },
  actionButtonTextSecondary: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
  },
  actionButtonTextCopied: {
    color: "#00FF88",
  },
  accessoriesWrapper: {
    marginTop: 16,
    alignItems: "center",
  },
  accessoriesCTA: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  accessoriesCTAText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
});
