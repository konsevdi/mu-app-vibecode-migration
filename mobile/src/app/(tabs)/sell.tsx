import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Camera,
  Smartphone,
  Tablet,
  Laptop,
  Headphones,
  Check,
  X,
  ImagePlus,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { type CreateListingRequest, type CreateListingResponse, type Category, type Condition, type City } from "@/shared/contracts";
import { PANDAS_PRICING_URL } from "@/lib/constants";
import { useCityStore } from "@/lib/cityStore";
import { useTranslation, type TranslationKey } from "@/lib/languageStore";
import { CONDITIONS, type ConditionKey } from "@/lib/conditions";
import * as WebBrowser from "expo-web-browser";

// Category data - uses translations
const getCategoryData = (t: (key: TranslationKey) => string) => [
  { id: "phone" as Category, name: t("category_phone"), icon: Smartphone, color: "#FF00FF" },
  { id: "tablet" as Category, name: t("category_tablet"), icon: Tablet, color: "#00FF88" },
  { id: "laptop" as Category, name: t("category_laptop"), icon: Laptop, color: "#00BFFF" },
  { id: "accessory" as Category, name: t("category_accessory"), icon: Headphones, color: "#FFD700" },
];

// Condition data - uses translations and CONDITIONS from conditions.ts
const getConditionData = (t: (key: TranslationKey) => string) => [
  { id: "new" as Condition, name: t("condition_new"), description: t("condition_new_desc"), color: CONDITIONS.new.color, band: `${CONDITIONS.new.priceRangePercent.min}-${CONDITIONS.new.priceRangePercent.max}%` },
  { id: "like_new" as Condition, name: t("condition_like_new"), description: t("condition_like_new_desc"), color: CONDITIONS.like_new.color, band: `${CONDITIONS.like_new.priceRangePercent.min}-${CONDITIONS.like_new.priceRangePercent.max}%` },
  { id: "good" as Condition, name: t("condition_good"), description: t("condition_good_desc"), color: CONDITIONS.good.color, band: `${CONDITIONS.good.priceRangePercent.min}-${CONDITIONS.good.priceRangePercent.max}%` },
  { id: "fair" as Condition, name: t("condition_fair"), description: t("condition_fair_desc"), color: CONDITIONS.fair.color, band: `${CONDITIONS.fair.priceRangePercent.min}-${CONDITIONS.fair.priceRangePercent.max}%` },
  { id: "parts" as Condition, name: t("condition_parts"), description: t("condition_parts_desc"), color: CONDITIONS.parts.color, band: `${CONDITIONS.parts.priceRangePercent.min}-${CONDITIONS.parts.priceRangePercent.max}%` },
];

// Brand options per category - uses translations for "OTHER"
const getBrandOptions = (t: (key: TranslationKey) => string): Record<Category, string[]> => ({
  phone: ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google", "Huawei", "OPPO", "Realme", "Sony", "Nokia", "Motorola", "Nothing", t("other_brand")],
  tablet: ["Apple", "Samsung", "Xiaomi", "Lenovo", "Huawei", "Microsoft", "Amazon", t("other_brand")],
  laptop: ["Apple", "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Microsoft", "Razer", t("other_brand")],
  accessory: ["Apple", "Samsung", "Sony", "JBL", "Bose", "Anker", "Belkin", t("other_brand")],
});

// Model options per brand (simplified) - uses translations for "OTHER"
const getModelOptions = (t: (key: TranslationKey) => string): Record<string, string[]> => ({
  Apple: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini", "iPhone SE (2022)", "iPhone SE (2020)", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPad Pro 12.9", "iPad Pro 11", "iPad Air", "iPad mini", "iPad", "MacBook Pro 16", "MacBook Pro 14", "MacBook Pro 13", "MacBook Air M2", "MacBook Air M1", "AirPods Pro 2", "AirPods Pro", "AirPods 3", "AirPods 2", "AirPods Max", t("other_brand")],
  Samsung: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy Z Fold 4", "Galaxy Z Flip 4", "Galaxy A54", "Galaxy A34", "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab S8", "Galaxy Buds 2 Pro", "Galaxy Buds FE", t("other_brand")],
  Xiaomi: ["14 Ultra", "14 Pro", "14", "13T Pro", "13T", "13 Pro", "13", "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13", "Poco X6 Pro", "Poco X6", "Pad 6 Pro", "Pad 6", t("other_brand")],
  OnePlus: ["12", "12R", "11", "Open", "Nord 3", "Nord CE 3", "Buds Pro 2", t("other_brand")],
  Google: ["Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 7a", "Pixel Fold", "Pixel Buds Pro", t("other_brand")],
});

const placeholderImages = [
  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
  "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
  "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400",
];

export default function SellScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const defaultCity = useCityStore((s) => s.defaultCity);
  const { t } = useTranslation();

  // Get translated category and condition data
  const categories = getCategoryData(t);
  const conditions = getConditionData(t);
  const brandOptions = getBrandOptions(t);
  const modelOptions = getModelOptions(t);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [city, setCity] = useState<City | null>(defaultCity);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateListingRequest) =>
      api.post<CreateListingResponse>("/api/listings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      Alert.alert(
        t("submitted_for_approval"),
        t("submitted_for_approval_desc"),
        [{ text: "OK", onPress: () => router.push("/" as Href) }]
      );
      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory(null);
      setCondition(null);
      setBrand("");
      setModel("");
      setLocation("");
      setImages([]);
    },
    onError: (error) => {
      Alert.alert(t("error"), t("error"));
      console.error(error);
    },
  });

  const handleSubmit = () => {
    if (!session?.user) {
      router.push("/login" as Href);
      return;
    }

    if (!title.trim() || !description.trim() || !price || !category || !condition || !city) {
      Alert.alert(t("missing_fields"), t("missing_fields_desc"));
      return;
    }

    if (images.length < 3) {
      Alert.alert(t("photos_required"), t("photos_required_desc"));
      return;
    }

    const listingImages = images.length > 0 ? images : [placeholderImages[Math.floor(Math.random() * placeholderImages.length)] ?? placeholderImages[0]];

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      condition,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      location: location.trim() || undefined,
      images: listingImages,
      city,
    });
  };

  const addPlaceholderImage = () => {
    if (images.length < 10) {
      const randomImage = placeholderImages[Math.floor(Math.random() * placeholderImages.length)] ?? placeholderImages[0];
      setImages([...images, randomImage]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  if (!session?.user) {
    return (
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center px-8">
          <View className="mb-6 rounded-3xl p-8" style={{ backgroundColor: "#FF00FF20", borderWidth: 2, borderColor: "#FF00FF" }}>
            <Camera size={72} color="#FF00FF" />
          </View>
          <Text className="text-center text-3xl font-black text-white">
            {t("login_to_sell")}
          </Text>
          <Text className="mt-3 text-center text-base font-medium text-gray-400">
            {t("login_to_sell_desc")}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="px-5 pb-6 pt-4">
              <View className="flex-row items-center">
                <Sparkles size={24} color="#FFD700" />
                <Text className="ml-2 text-2xl font-black text-white">{t("sell_title")}</Text>
              </View>
              <Text className="mt-1 text-base font-semibold text-gray-400">
                {t("sell_subtitle")}
              </Text>
            </View>

            {/* Images */}
            <View className="mb-6 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                {t("photos_label")} *
              </Text>
              <Text className="mb-3 text-sm font-medium text-gray-400">
                {t("min_photos")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
              >
                {images.map((uri, index) => (
                  <View key={index} className="relative mr-3">
                    <Image
                      source={{ uri }}
                      className="h-28 w-28 rounded-2xl"
                      style={{ borderWidth: 2, borderColor: "#333" }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => removeImage(index)}
                      className="absolute -right-2 -top-2 rounded-full p-2"
                      style={{ backgroundColor: "#FF6B6B" }}
                    >
                      <X size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                {images.length < 10 && (
                  <Pressable
                    onPress={addPlaceholderImage}
                    className="h-28 w-28 items-center justify-center rounded-2xl"
                    style={{ borderWidth: 2, borderColor: images.length < 3 ? "#FF6B6B" : "#FF00FF", borderStyle: "dashed", backgroundColor: images.length < 3 ? "#FF6B6B10" : "#FF00FF10" }}
                  >
                    <ImagePlus size={32} color={images.length < 3 ? "#FF6B6B" : "#FF00FF"} />
                    <Text className={`mt-2 text-xs font-bold ${images.length < 3 ? "text-red-400" : "text-fuchsia-400"}`}>
                      {images.length < 3 ? `${3 - images.length} ${t("more_needed")}` : t("add")}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Title */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("title_label")} *
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="px-4 py-4 text-base font-semibold text-white"
                    placeholder="π.χ. iPhone 14 Pro Max 256GB"
                    placeholderTextColor="#666"
                    value={title}
                    onChangeText={setTitle}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Category */}
            <View className="mb-5 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                {t("category_label")} *
              </Text>
              <View className="flex-row">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      className="mr-3 flex-1 items-center overflow-hidden rounded-2xl"
                      style={{ borderWidth: 2, borderColor: isSelected ? cat.color : "#333" }}
                    >
                      <LinearGradient
                        colors={isSelected ? [cat.color, cat.color] : ["#1a1a2e", "#0f0f23"]}
                        style={{ paddingVertical: 18, alignItems: "center", width: "100%" }}
                      >
                        <Icon size={28} color={isSelected ? "#000" : cat.color} />
                        <Text
                          className={`mt-2 text-xs font-bold uppercase ${
                            isSelected ? "text-black" : "text-white"
                          }`}
                        >
                          {cat.name}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Condition */}
            <View className="mb-5 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                {t("condition_label")} *
              </Text>
              <View className="flex-row flex-wrap">
                {conditions.map((cond) => {
                  const isSelected = condition === cond.id;
                  return (
                    <Pressable
                      key={cond.id}
                      onPress={() => setCondition(cond.id)}
                      className="mb-3 mr-3 flex-row items-center overflow-hidden rounded-full"
                      style={{ borderWidth: 2, borderColor: isSelected ? cond.color : "#333" }}
                    >
                      <LinearGradient
                        colors={isSelected ? [cond.color, cond.color] : ["#1a1a2e", "#0f0f23"]}
                        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}
                      >
                        {isSelected && <Check size={16} color="#000" />}
                        <View className={isSelected ? "ml-1" : ""}>
                          <Text
                            className={`text-sm font-bold ${
                              isSelected ? "text-black" : "text-white"
                            }`}
                          >
                            {cond.name}
                          </Text>
                          <Text
                            className={`text-xs ${
                              isSelected ? "text-black/70" : "text-gray-400"
                            }`}
                          >
                            {cond.band}
                          </Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
              {/* Pricing Guidance */}
              {condition && (
                <View className="mt-2 rounded-xl p-3" style={{ backgroundColor: "#FFD70020", borderWidth: 1, borderColor: "#FFD700" }}>
                  <Text className="text-xs font-bold text-amber-400">
                    {t("pricing_guide")}
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-gray-300">
                    {conditions.find((c) => c.id === condition)?.name}: {conditions.find((c) => c.id === condition)?.band} {t("pricing_of_new")}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-400">
                    {t("vat_free")}
                  </Text>
                </View>
              )}
              {/* Pandas Pricing Link */}
              <Pressable
                onPress={() => WebBrowser.openBrowserAsync(PANDAS_PRICING_URL)}
                className="mt-3 flex-row items-center justify-center overflow-hidden rounded-xl"
                style={{ borderWidth: 1, borderColor: "#00BFFF" }}
              >
                <LinearGradient
                  colors={["#00BFFF20", "#00BFFF10"]}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, width: "100%", justifyContent: "center" }}
                >
                  <ExternalLink size={16} color="#00BFFF" />
                  <Text className="ml-2 text-sm font-bold text-sky-400">
                    {t("check_pricing")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* City */}
            <View className="mb-5 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                {t("city_label")} *
              </Text>
              <Pressable
                onPress={() => setCity("rhodes")}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: city === "rhodes" ? "#00FF88" : "#333" }}
              >
                <LinearGradient
                  colors={city === "rhodes" ? ["#00FF88", "#00CC6A"] : ["#1a1a2e", "#0f0f23"]}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
                >
                  {city === "rhodes" && <Check size={18} color="#000" />}
                  <Text className={`${city === "rhodes" ? "ml-2 text-black" : "text-white"} text-base font-bold`}>
                    {t("rhodes")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Price */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("price_label")} (€) *
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#00FF88" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="px-4 py-4 text-xl font-black text-emerald-400"
                    placeholder="0"
                    placeholderTextColor="#666"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Brand & Model */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("brand_label")}
              </Text>
              <Pressable
                onPress={() => category && setShowBrandPicker(!showBrandPicker)}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: showBrandPicker ? "#FF00FF" : "#333", opacity: category ? 1 : 0.5 }}
              >
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <View className="flex-row items-center justify-between px-4 py-4">
                    <Text className={`text-base font-semibold ${brand ? "text-white" : "text-gray-500"}`}>
                      {brand || (category ? t("select_brand") : t("select_category_first"))}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Brand Picker */}
              {showBrandPicker && category && (
                <View className="mt-2 max-h-48 rounded-2xl" style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {brandOptions[category].map((b) => (
                      <Pressable
                        key={b}
                        onPress={() => {
                          setBrand(b);
                          setModel(""); // Reset model when brand changes
                          setShowBrandPicker(false);
                        }}
                        className="border-b border-gray-800 px-4 py-3"
                      >
                        <Text className={`text-base ${brand === b ? "font-bold text-fuchsia-400" : "text-white"}`}>
                          {b}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("model_label")}
              </Text>
              <Pressable
                onPress={() => brand && modelOptions[brand] && setShowModelPicker(!showModelPicker)}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: showModelPicker ? "#FF00FF" : "#333", opacity: brand && modelOptions[brand] ? 1 : 0.5 }}
              >
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <View className="flex-row items-center justify-between px-4 py-4">
                    <Text className={`text-base font-semibold ${model ? "text-white" : "text-gray-500"}`}>
                      {model || (brand ? (modelOptions[brand] ? t("select_model") : t("type_model")) : t("select_brand_first"))}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Model Picker */}
              {showModelPicker && brand && modelOptions[brand] && (
                <View className="mt-2 max-h-48 rounded-2xl" style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {modelOptions[brand].map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => {
                          setModel(m);
                          setShowModelPicker(false);
                        }}
                        className="border-b border-gray-800 px-4 py-3"
                      >
                        <Text className={`text-base ${model === m ? "font-bold text-fuchsia-400" : "text-white"}`}>
                          {m}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Manual input if brand has no predefined models */}
              {brand && !modelOptions[brand] && (
                <View className="mt-2 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                  <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                    <TextInput
                      className="px-4 py-4 text-base font-semibold text-white"
                      placeholder="π.χ. Galaxy A54"
                      placeholderTextColor="#666"
                      value={model}
                      onChangeText={setModel}
                    />
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Location */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("location_label")}
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="px-4 py-4 text-base font-semibold text-white"
                    placeholder="π.χ. Ροδος, Ελλαδα"
                    placeholderTextColor="#666"
                    value={location}
                    onChangeText={setLocation}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Description */}
            <View className="mb-6 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                {t("description_label")} *
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="min-h-[140px] px-4 py-4 text-base font-semibold text-white"
                    placeholder={t("description_placeholder")}
                    placeholderTextColor="#666"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Submit Button */}
            <View className="mb-8 px-5">
              <Pressable
                onPress={handleSubmit}
                disabled={createMutation.isPending}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: createMutation.isPending ? "#666" : "#FF00FF" }}
              >
                <LinearGradient
                  colors={createMutation.isPending ? ["#333", "#222"] : ["#FF00FF", "#CC00CC"]}
                  style={{ alignItems: "center", paddingVertical: 18 }}
                >
                  <Text className="text-xl font-black uppercase text-white">
                    {createMutation.isPending ? t("creating") : t("publish_button")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
