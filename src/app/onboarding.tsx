import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  MapPin,
  Check,
  ChevronRight,
  Search,
  Globe,
  Wrench,
} from "lucide-react-native";
import { useCityStore } from "@/lib/cityStore";
import {
  useOnboardingStore,
  useOnboardingHydrated,
  getAllCities,
} from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageTogglePill } from "@/components/LanguageTogglePill";
import {
  useReduceMotion,
  TIMING,
  EASE_PREMIUM,
  EASE_OUT,
  SPRING_RESPONSIVE,
  getStaggerDelay,
} from "@/lib/animations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Assets
const MU_LOGO_DARK = require("../../assets/image-1766354330.png");
const RHODES_MAP = require("../../assets/image-1766354345.png");
const SHIELD_ICON = require("../../assets/image-1766354349.png");
const PIN_ICON = require("../../assets/image-1766354351.png");
const CHECKLIST_ICON = require("../../assets/image-1766354354.png");

type OnboardingView = "welcome" | "carousel" | "city-gate";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

function AnimatedLogo({
  reduceMotion,
  delay = 0,
}: {
  reduceMotion: boolean;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.96);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      scale.value = withDelay(
        delay,
        withTiming(1, { duration: TIMING.small, easing: EASE_PREMIUM })
      );
    }
  }, [delay, reduceMotion, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={MU_LOGO_DARK}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function AnimatedText({
  children,
  delay = 0,
  reduceMotion,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
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

  return <Animated.Text style={[animatedStyle, style]}>{children}</Animated.Text>;
}

function AnimatedCTA({
  onPress,
  label,
  delay = 0,
  reduceMotion,
  showChevron = true,
}: {
  onPress: () => void;
  label: string;
  delay?: number;
  reduceMotion: boolean;
  showChevron?: boolean;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.ctaContainer]}
    >
      <LinearGradient colors={["#00FF88", "#00CC6A"]} style={styles.ctaGradient}>
        <Text style={styles.ctaText}>{label}</Text>
        {showChevron && (
          <ChevronRight size={24} color="#000" style={{ marginLeft: 8 }} />
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

function AnimatedDot({
  isActive,
  reduceMotion,
}: {
  isActive: boolean;
  reduceMotion: boolean;
}) {
  const width = useSharedValue(isActive ? 24 : 8);

  useEffect(() => {
    width.value = withTiming(isActive ? 24 : 8, {
      duration: reduceMotion ? 0 : TIMING.micro,
      easing: EASE_PREMIUM,
    });
  }, [isActive, reduceMotion, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: isActive ? "#00FF88" : "#333",
  }));

  return <Animated.View style={animatedStyle} />;
}

function CarouselSlide({
  item,
  index,
  reduceMotion,
}: {
  item: {
    icon: number;
    title: string;
    description: string;
    color: string;
  };
  index: number;
  reduceMotion: boolean;
}) {
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(reduceMotion ? 1 : 0.9);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    // Icon animation
    iconOpacity.value = withDelay(
      100,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      iconScale.value = withDelay(
        100,
        withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
    // Text animation (staggered)
    textOpacity.value = withDelay(
      200,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      textTranslateY.value = withDelay(
        200,
        withTiming(0, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
  }, [reduceMotion, iconOpacity, iconScale, textOpacity, textTranslateY]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={[styles.carouselSlide, { width: SCREEN_WIDTH }]}>
      <Animated.View style={[iconAnimatedStyle, styles.carouselIconContainer]}>
        <View
          style={[
            styles.carouselIconBg,
            {
              backgroundColor: `${item.color}15`,
              borderColor: item.color,
            },
          ]}
        >
          <Image source={item.icon} style={styles.carouselIcon} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View style={textAnimatedStyle}>
        <Text style={styles.carouselTitle}>{item.title}</Text>
        <Text style={styles.carouselDescription}>{item.description}</Text>
      </Animated.View>
    </View>
  );
}

function CityChip({
  label,
  onPress,
  delay,
  reduceMotion,
}: {
  label: string;
  onPress: () => void;
  delay: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: TIMING.micro, easing: EASE_OUT })
    );
  }, [delay, opacity]);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.95, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RESPONSIVE);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.cityChip]}
    >
      <Text style={styles.cityChipText}>{label}</Text>
    </AnimatedPressable>
  );
}

function RepairUpsellCard({
  reduceMotion,
  onPress,
  language,
}: {
  reduceMotion: boolean;
  onPress: () => void;
  language: string;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      300,
      withTiming(1, { duration: TIMING.small, easing: EASE_OUT })
    );
    if (!reduceMotion) {
      translateY.value = withDelay(
        300,
        withTiming(0, { duration: TIMING.small, easing: EASE_OUT })
      );
    }
  }, [reduceMotion, opacity, translateY]);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.98, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RESPONSIVE);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.repairCard]}
    >
      <View style={styles.repairCardContent}>
        <View style={styles.repairIconContainer}>
          <Wrench size={20} color="#FFD700" />
        </View>
        <View style={styles.repairTextContainer}>
          <Text style={styles.repairTitle}>
            {language === "el"
              ? "Έχει θέμα η συσκευή σου;"
              : "Device needs repair?"}
          </Text>
          <Text style={styles.repairSubtitle}>
            {language === "el"
              ? "Ζήτα προσφορά επισκευής"
              : "Get a repair quote"}
          </Text>
        </View>
        <ChevronRight size={18} color="#666" />
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const defaultCity = useCityStore((s) => s.defaultCity);
  const setDefaultCity = useCityStore((s) => s.setDefaultCity);
  const onboardingCompleted = useOnboardingStore((s) => s.onboardingCompleted);
  const isEligibleCity = useOnboardingStore((s) => s.isEligibleCity);
  const setOnboardingCompleted = useOnboardingStore(
    (s) => s.setOnboardingCompleted
  );
  const setIsEligibleCity = useOnboardingStore((s) => s.setIsEligibleCity);
  const setSelectedCity = useOnboardingStore((s) => s.setSelectedCity);
  const isHydrated = useOnboardingHydrated();

  const [currentView, setCurrentView] = useState<OnboardingView>("welcome");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Screen transition animation
  const screenOpacity = useSharedValue(1);
  const screenTranslateX = useSharedValue(0);

  // Wait for store hydration before making redirect decisions
  useEffect(() => {
    if (!isHydrated) return;

    if (onboardingCompleted && isEligibleCity && defaultCity) {
      setIsRedirecting(true);
      router.replace("/(tabs)" as Href);
      return;
    }

    if (onboardingCompleted && !isEligibleCity) {
      setIsRedirecting(true);
      router.replace("/demo-browse" as Href);
      return;
    }
  }, [isHydrated, onboardingCompleted, isEligibleCity, defaultCity, router]);

  const transitionToView = useCallback(
    (view: OnboardingView) => {
      if (reduceMotion) {
        setCurrentView(view);
        return;
      }

      // Animate out
      screenOpacity.value = withTiming(0, {
        duration: TIMING.medium,
        easing: EASE_PREMIUM,
      });
      screenTranslateX.value = withTiming(
        -20,
        { duration: TIMING.medium, easing: EASE_PREMIUM },
        () => {
          runOnJS(setCurrentView)(view);
          // Reset position
          screenTranslateX.value = 20;
          // Animate in
          screenOpacity.value = withTiming(1, {
            duration: TIMING.medium,
            easing: EASE_OUT,
          });
          screenTranslateX.value = withTiming(0, {
            duration: TIMING.medium,
            easing: EASE_OUT,
          });
        }
      );
    },
    [reduceMotion, screenOpacity, screenTranslateX]
  );

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateX: screenTranslateX.value }],
  }));

  // Show loading while hydrating or redirecting
  if (!isHydrated || isRedirecting) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={StyleSheet.absoluteFill}
        />
        <Image source={MU_LOGO_DARK} style={styles.loadingLogo} resizeMode="contain" />
      </View>
    );
  }

  const handleSelectRhodes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDefaultCity("rhodes");
    setSelectedCity({ name: "Rhodes", country: "Greece", isEligible: true });
    setIsEligibleCity(true);
    setOnboardingCompleted(true);
    router.replace("/(tabs)" as Href);
  };

  const handleSelectOtherCity = (city: {
    name: string;
    nameEl: string;
    country: string;
    countryEl: string;
  }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cityName = language === "el" ? city.nameEl : city.name;
    const countryName = language === "el" ? city.countryEl : city.country;
    setSelectedCity({ name: cityName, country: countryName, isEligible: false });
    setIsEligibleCity(false);
    router.push({
      pathname: "/waitlist",
      params: { city: city.name, country: city.country },
    });
  };

  const handleOtherLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/waitlist" as Href);
  };

  const handleHaveAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/login" as Href);
  };

  const handleRepairCTA = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to repair lead form or waitlist with repair intent
    router.push({
      pathname: "/waitlist",
      params: { intent: "repair" },
    });
  };

  const carouselData = [
    {
      icon: SHIELD_ICON,
      title: t("value_approved_title"),
      description: t("value_approved_desc"),
      color: "#00FF88",
    },
    {
      icon: PIN_ICON,
      title: t("value_pickup_title"),
      description: t("value_pickup_desc"),
      color: "#00BFFF",
    },
    {
      icon: CHECKLIST_ICON,
      title: t("value_inspection_title"),
      description: t("value_inspection_desc"),
      color: "#FFD700",
    },
  ];

  const filteredCities = getAllCities().filter((city) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      city.name.toLowerCase().includes(query) ||
      city.nameEl.toLowerCase().includes(query) ||
      city.country.toLowerCase().includes(query) ||
      city.countryEl.toLowerCase().includes(query)
    );
  });

  const greekCities = filteredCities.filter((c) => c.country === "Greece");
  const europeCities = filteredCities.filter((c) => c.country !== "Greece");

  // ============================================================================
  // WELCOME SCREEN
  // ============================================================================
  if (currentView === "welcome") {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.flex}>
          {/* Language Toggle - top right floating pill */}
          <View style={[styles.languageToggleContainer, { top: insets.top + 8 }]}>
            <LanguageTogglePill />
          </View>

          <Animated.View style={[styles.welcomeContent, screenAnimatedStyle]}>
            {/* Logo */}
            <AnimatedLogo reduceMotion={reduceMotion} delay={100} />

            {/* Title */}
            <AnimatedText
              delay={getStaggerDelay(1, 100)}
              reduceMotion={reduceMotion}
              style={styles.welcomeTitle}
            >
              {t("welcome_title")}
            </AnimatedText>

            {/* Subtitle */}
            <AnimatedText
              delay={getStaggerDelay(2, 100)}
              reduceMotion={reduceMotion}
              style={styles.welcomeSubtitle}
            >
              {t("welcome_subtitle")}
            </AnimatedText>
          </Animated.View>

          {/* Buttons */}
          <View style={styles.welcomeButtons}>
            <AnimatedCTA
              onPress={() => transitionToView("carousel")}
              label={t("get_started")}
              delay={getStaggerDelay(3, 100)}
              reduceMotion={reduceMotion}
            />

            <AnimatedText
              delay={getStaggerDelay(4, 100)}
              reduceMotion={reduceMotion}
              style={styles.haveAccountText}
            >
              <Pressable onPress={handleHaveAccount}>
                <Text style={styles.haveAccountLink}>{t("have_account")}</Text>
              </Pressable>
            </AnimatedText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================================
  // VALUE CAROUSEL SCREEN
  // ============================================================================
  if (currentView === "carousel") {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.flex}>
          {/* Header: Skip + Language Toggle */}
          <View style={styles.carouselHeader}>
            <Pressable
              onPress={() => transitionToView("city-gate")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>{t("skip")}</Text>
            </Pressable>
            <LanguageTogglePill />
          </View>

          <Animated.View style={[styles.flex, screenAnimatedStyle]}>
            {/* Carousel */}
            <View style={styles.carouselContainer}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                bounces={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                  );
                  setCarouselIndex(index);
                }}
              >
                {carouselData.map((item, index) => (
                  <CarouselSlide
                    key={index}
                    item={item}
                    index={index}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </ScrollView>

              {/* Dots */}
              <View style={styles.dotsContainer}>
                {carouselData.map((_, index) => (
                  <AnimatedDot
                    key={index}
                    isActive={carouselIndex === index}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </View>
            </View>

            {/* Repair Upsell Card - subtle, after last carousel slide */}
            {carouselIndex === carouselData.length - 1 && (
              <RepairUpsellCard
                reduceMotion={reduceMotion}
                onPress={handleRepairCTA}
                language={language}
              />
            )}
          </Animated.View>

          {/* Next Button */}
          <View style={styles.carouselButton}>
            <AnimatedCTA
              onPress={() => {
                if (carouselIndex < carouselData.length - 1) {
                  scrollRef.current?.scrollTo({
                    x: (carouselIndex + 1) * SCREEN_WIDTH,
                    animated: true,
                  });
                  setCarouselIndex(carouselIndex + 1);
                } else {
                  transitionToView("city-gate");
                }
              }}
              label={
                carouselIndex < carouselData.length - 1
                  ? t("next")
                  : t("select_city")
              }
              delay={0}
              reduceMotion={reduceMotion}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================================
  // CITY GATE SCREEN
  // ============================================================================
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.carouselHeader}>
          <Pressable
            onPress={() => transitionToView("carousel")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>
              {language === "el" ? "Πίσω" : "Back"}
            </Text>
          </Pressable>
          <LanguageTogglePill />
        </View>

        <Animated.View style={[styles.flex, screenAnimatedStyle]}>
          {/* Title */}
          <View style={styles.cityGateHeader}>
            <View style={styles.mapPinIcon}>
              <MapPin size={32} color="#FF00FF" />
            </View>
            <Text style={styles.cityGateTitle}>{t("select_city")}</Text>
            <Text style={styles.cityGateSubtitle}>{t("select_city_subtitle")}</Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={20} color="#666" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("search_placeholder")}
                placeholderTextColor="#666"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Rhodes Map Banner */}
          <Pressable onPress={handleSelectRhodes} style={styles.rhodesCard}>
            <View style={styles.rhodesCardInner}>
              <Image source={RHODES_MAP} style={styles.rhodesImage} resizeMode="cover" />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={styles.rhodesGradient}
              />
              <View style={styles.rhodesContent}>
                <View>
                  <Text style={styles.rhodesTitle}>
                    {language === "el" ? "Ρόδος" : "Rhodes"}
                  </Text>
                  <View style={styles.rhodesBadge}>
                    <Text style={styles.rhodesBadgeText}>{t("available_now")}</Text>
                  </View>
                </View>
                <View style={styles.rhodesCheck}>
                  <Check size={24} color="#000" />
                </View>
              </View>
            </View>
          </Pressable>

          {/* City List */}
          <ScrollView
            style={styles.cityList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Greek Cities */}
            {greekCities.length > 0 && (
              <View style={styles.citySection}>
                <Text style={styles.citySectionTitle}>
                  {language === "el" ? "Ελλάδα" : "Greece"}
                </Text>
                <View style={styles.cityChipsContainer}>
                  {greekCities
                    .filter((c) => c.name !== "Rhodes")
                    .map((city, index) => (
                      <CityChip
                        key={city.name}
                        label={language === "el" ? city.nameEl : city.name}
                        onPress={() => handleSelectOtherCity(city)}
                        delay={getStaggerDelay(index, 100)}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                </View>
              </View>
            )}

            {/* European Cities */}
            {europeCities.length > 0 && (
              <View style={styles.citySection}>
                <Text style={styles.citySectionTitle}>
                  {language === "el" ? "Ευρώπη" : "Europe"}
                </Text>
                <View style={styles.cityChipsContainer}>
                  {europeCities.map((city, index) => (
                    <CityChip
                      key={city.name}
                      label={city.name}
                      onPress={() => handleSelectOtherCity(city)}
                      delay={getStaggerDelay(index, 200)}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Other Location */}
            <Pressable onPress={handleOtherLocation} style={styles.otherLocationBtn}>
              <Globe size={20} color="#999" />
              <Text style={styles.otherLocationText}>{t("other_city")}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  languageToggleContainer: {
    position: "absolute",
    right: 16,
    top: 0,
    zIndex: 10,
  },
  welcomeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
  },
  welcomeSubtitle: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 18,
    color: "#9ca3af",
  },
  welcomeButtons: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  haveAccountText: {
    marginTop: 16,
    textAlign: "center",
  },
  haveAccountLink: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 16,
  },
  ctaContainer: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#00FF88",
    overflow: "hidden",
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },
  carouselHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  carouselSlide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  carouselIconContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  carouselIconBg: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
  },
  carouselIcon: {
    width: 72,
    height: 72,
  },
  carouselTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
  },
  carouselDescription: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
    color: "#9ca3af",
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  carouselButton: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  repairCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "rgba(26, 26, 46, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  repairCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  repairIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  repairTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  repairTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  repairSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  cityGateHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  mapPinIcon: {
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255, 0, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "#FF00FF",
  },
  cityGateTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
  },
  cityGateSubtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 16,
    color: "#9ca3af",
  },
  searchContainer: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  rhodesCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#00FF88",
    overflow: "hidden",
  },
  rhodesCardInner: {
    position: "relative",
  },
  rhodesImage: {
    width: "100%",
    height: 120,
  },
  rhodesGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  rhodesContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rhodesTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
  },
  rhodesBadge: {
    marginTop: 4,
    backgroundColor: "#00FF88",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  rhodesBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
  },
  rhodesCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00FF88",
    alignItems: "center",
    justifyContent: "center",
  },
  cityList: {
    flex: 1,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  citySection: {
    marginBottom: 16,
  },
  citySectionTitle: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  cityChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cityChip: {
    marginBottom: 8,
    marginRight: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  otherLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  otherLocationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#9ca3af",
  },
});
