import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";
import {
  MapPin,
  Check,
  ChevronRight,
  Search,
  Globe,
} from "lucide-react-native";
import { useCityStore } from "@/lib/cityStore";
import { useOnboardingStore, CITIES, getAllCities } from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageToggle } from "@/components/LanguageToggle";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Assets
const MU_LOGO_DARK = require("../../assets/image-1766354330.png");
const RHODES_MAP = require("../../assets/image-1766354345.png");
const SHIELD_ICON = require("../../assets/image-1766354349.png");
const PIN_ICON = require("../../assets/image-1766354351.png");
const CHECKLIST_ICON = require("../../assets/image-1766354354.png");

type OnboardingView = "welcome" | "carousel" | "city-gate";

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const defaultCity = useCityStore((s) => s.defaultCity);
  const setDefaultCity = useCityStore((s) => s.setDefaultCity);
  const onboardingCompleted = useOnboardingStore((s) => s.onboardingCompleted);
  const isEligibleCity = useOnboardingStore((s) => s.isEligibleCity);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);
  const setIsEligibleCity = useOnboardingStore((s) => s.setIsEligibleCity);
  const setSelectedCity = useOnboardingStore((s) => s.setSelectedCity);

  const [currentView, setCurrentView] = useState<OnboardingView>("welcome");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // If onboarding completed and eligible, go to main app
  if (onboardingCompleted && isEligibleCity && defaultCity) {
    router.replace("/(tabs)" as Href);
    return null;
  }

  // If onboarding completed but not eligible, go to demo
  if (onboardingCompleted && !isEligibleCity) {
    router.replace("/demo-browse" as Href);
    return null;
  }

  const handleSelectRhodes = () => {
    setDefaultCity("rhodes");
    setSelectedCity({ name: "Rhodes", country: "Greece", isEligible: true });
    setIsEligibleCity(true);
    setOnboardingCompleted(true);
    router.replace("/(tabs)" as Href);
  };

  const handleSelectOtherCity = (city: { name: string; nameEl: string; country: string; countryEl: string }) => {
    const cityName = language === "el" ? city.nameEl : city.name;
    const countryName = language === "el" ? city.countryEl : city.country;
    setSelectedCity({ name: cityName, country: countryName, isEligible: false });
    setIsEligibleCity(false);
    // Navigate to waitlist
    router.push({
      pathname: "/waitlist",
      params: { city: city.name, country: city.country },
    });
  };

  const handleOtherLocation = () => {
    router.push("/waitlist" as Href);
  };

  const handleHaveAccount = () => {
    router.push("/login" as Href);
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

  // Welcome Screen
  if (currentView === "welcome") {
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
            {/* Logo */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Image
                source={MU_LOGO_DARK}
                style={{ width: 120, height: 120, borderRadius: 28 }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Title */}
            <Animated.Text
              entering={FadeInDown.delay(200).springify()}
              className="mt-8 text-center text-3xl font-black text-white"
            >
              {t("welcome_title")}
            </Animated.Text>

            {/* Subtitle */}
            <Animated.Text
              entering={FadeInDown.delay(300).springify()}
              className="mt-4 text-center text-lg text-gray-400"
            >
              {t("welcome_subtitle")}
            </Animated.Text>
          </View>

          {/* Buttons */}
          <View className="px-6 pb-8">
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <Pressable
                onPress={() => setCurrentView("carousel")}
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
                    {t("get_started")}
                  </Text>
                  <ChevronRight size={24} color="#000" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(500).springify()}>
              <Pressable
                onPress={handleHaveAccount}
                className="mt-4 items-center py-4"
              >
                <Text className="text-base font-semibold text-gray-400">
                  {t("have_account")}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Value Carousel Screen
  if (currentView === "carousel") {
    return (
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1">
          {/* Language Toggle + Skip */}
          <View className="flex-row items-center justify-between px-4 pt-2">
            <Pressable onPress={() => setCurrentView("city-gate")}>
              <Text className="text-base font-medium text-gray-500">
                {t("skip")}
              </Text>
            </Pressable>
            <LanguageToggle />
          </View>

          {/* Carousel */}
          <View className="flex-1 justify-center">
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setCarouselIndex(index);
              }}
            >
              {carouselData.map((item, index) => (
                <View
                  key={index}
                  style={{ width: SCREEN_WIDTH }}
                  className="items-center justify-center px-8"
                >
                  <Animated.View
                    entering={FadeIn.delay(200)}
                    className="mb-8 items-center"
                  >
                    <View
                      className="rounded-3xl p-6"
                      style={{
                        backgroundColor: `${item.color}20`,
                        borderWidth: 2,
                        borderColor: item.color,
                      }}
                    >
                      <Image
                        source={item.icon}
                        style={{ width: 80, height: 80 }}
                        resizeMode="contain"
                      />
                    </View>
                  </Animated.View>

                  <Text className="text-center text-2xl font-black text-white">
                    {item.title}
                  </Text>
                  <Text className="mt-4 text-center text-base text-gray-400">
                    {item.description}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Dots */}
            <View className="mt-8 flex-row items-center justify-center">
              {carouselData.map((_, index) => (
                <View
                  key={index}
                  className="mx-1 rounded-full"
                  style={{
                    width: carouselIndex === index ? 24 : 8,
                    height: 8,
                    backgroundColor:
                      carouselIndex === index ? "#00FF88" : "#333",
                  }}
                />
              ))}
            </View>
          </View>

          {/* Next Button */}
          <View className="px-6 pb-8">
            <Pressable
              onPress={() => {
                if (carouselIndex < carouselData.length - 1) {
                  scrollRef.current?.scrollTo({
                    x: (carouselIndex + 1) * SCREEN_WIDTH,
                    animated: true,
                  });
                  setCarouselIndex(carouselIndex + 1);
                } else {
                  setCurrentView("city-gate");
                }
              }}
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
                  {carouselIndex < carouselData.length - 1
                    ? t("next")
                    : t("select_city")}
                </Text>
                <ChevronRight size={24} color="#000" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // City Gate Screen
  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable onPress={() => setCurrentView("carousel")}>
            <Text className="text-base font-medium text-gray-500">
              {language === "el" ? "Πίσω" : "Back"}
            </Text>
          </Pressable>
          <LanguageToggle />
        </View>

        {/* Title */}
        <View className="items-center px-6 pt-4">
          <View
            className="mb-4 rounded-3xl p-4"
            style={{ backgroundColor: "#FF00FF20", borderWidth: 2, borderColor: "#FF00FF" }}
          >
            <MapPin size={40} color="#FF00FF" />
          </View>
          <Text className="text-center text-2xl font-black text-white">
            {t("select_city")}
          </Text>
          <Text className="mt-2 text-center text-base text-gray-400">
            {t("select_city_subtitle")}
          </Text>
        </View>

        {/* Search */}
        <View className="mx-6 mt-6">
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
          >
            <Search size={20} color="#666" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("search_placeholder")}
              placeholderTextColor="#666"
              className="ml-3 flex-1 py-3 text-base text-white"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Rhodes Map Banner */}
        <View className="mx-6 mt-6">
          <Pressable
            onPress={handleSelectRhodes}
            className="overflow-hidden rounded-2xl"
            style={{ borderWidth: 2, borderColor: "#00FF88" }}
          >
            <View className="relative">
              <Image
                source={RHODES_MAP}
                style={{ width: "100%", height: 120 }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 80,
                }}
              />
              <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-4">
                <View>
                  <Text className="text-xl font-black text-white">
                    {language === "el" ? "Ρόδος" : "Rhodes"}
                  </Text>
                  <View className="mt-1 flex-row items-center">
                    <View
                      className="mr-2 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: "#00FF88" }}
                    >
                      <Text className="text-xs font-bold text-black">
                        {t("available_now")}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  className="rounded-full p-2"
                  style={{ backgroundColor: "#00FF88" }}
                >
                  <Check size={24} color="#000" />
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* City List */}
        <ScrollView className="mt-4 flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Greek Cities */}
          {greekCities.length > 0 && (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                {language === "el" ? "Ελλάδα" : "Greece"}
              </Text>
              <View className="flex-row flex-wrap">
                {greekCities
                  .filter((c) => c.name !== "Rhodes")
                  .map((city) => (
                    <Pressable
                      key={city.name}
                      onPress={() => handleSelectOtherCity(city)}
                      className="mb-2 mr-2 rounded-full px-4 py-2"
                      style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                    >
                      <Text className="text-sm font-medium text-white">
                        {language === "el" ? city.nameEl : city.name}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          )}

          {/* European Cities */}
          {europeCities.length > 0 && (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                {language === "el" ? "Ευρώπη" : "Europe"}
              </Text>
              <View className="flex-row flex-wrap">
                {europeCities.map((city) => (
                  <Pressable
                    key={city.name}
                    onPress={() => handleSelectOtherCity(city)}
                    className="mb-2 mr-2 rounded-full px-4 py-2"
                    style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                  >
                    <Text className="text-sm font-medium text-white">
                      {city.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Other Location */}
          <Pressable
            onPress={handleOtherLocation}
            className="mb-8 flex-row items-center justify-center rounded-xl py-4"
            style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
          >
            <Globe size={20} color="#999" />
            <Text className="ml-2 text-base font-medium text-gray-400">
              {t("other_city")}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
