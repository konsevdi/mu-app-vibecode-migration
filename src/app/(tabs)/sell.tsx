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
import * as WebBrowser from "expo-web-browser";

const categories: { id: Category; name: string; icon: React.ComponentType<{ size: number; color: string }>; color: string }[] = [
  { id: "phone", name: "ΚΙΝΗΤΟ", icon: Smartphone, color: "#FF00FF" },
  { id: "tablet", name: "TABLET", icon: Tablet, color: "#00FF88" },
  { id: "laptop", name: "LAPTOP", icon: Laptop, color: "#00BFFF" },
  { id: "accessory", name: "ΑΞΕΣΟΥΑΡ", icon: Headphones, color: "#FFD700" },
];

const conditions: { id: Condition; name: string; description: string; color: string; band: string }[] = [
  { id: "new", name: "ΚΑΙΝΟΥΡΓΙΟ", description: "Αχρησιμοποιητο", color: "#00FF88", band: "85-95%" },
  { id: "like_new", name: "ΣΑΝ ΚΑΙΝΟΥΡΓΙΟ", description: "Ελαχιστη χρηση", color: "#00BFFF", band: "75-88%" },
  { id: "good", name: "ΚΑΛΟ", description: "Μικρα σημαδια χρησης", color: "#FFD700", band: "60-75%" },
  { id: "fair", name: "ΜΕΤΡΙΟ", description: "Φανερη χρηση, λειτουργικο", color: "#FF6B6B", band: "40-60%" },
  { id: "parts", name: "ΑΝΤΑΛΛΑΚΤΙΚΑ", description: "Για επισκευη μονο", color: "#888888", band: "10-35%" },
];

// Brand options per category
const brandOptions: Record<Category, string[]> = {
  phone: ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google", "Huawei", "OPPO", "Realme", "Sony", "Nokia", "Motorola", "Nothing", "Αλλο"],
  tablet: ["Apple", "Samsung", "Xiaomi", "Lenovo", "Huawei", "Microsoft", "Amazon", "Αλλο"],
  laptop: ["Apple", "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Microsoft", "Razer", "Αλλο"],
  accessory: ["Apple", "Samsung", "Sony", "JBL", "Bose", "Anker", "Belkin", "Αλλο"],
};

// Model options per brand (simplified)
const modelOptions: Record<string, string[]> = {
  Apple: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini", "iPhone SE (2022)", "iPhone SE (2020)", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPad Pro 12.9", "iPad Pro 11", "iPad Air", "iPad mini", "iPad", "MacBook Pro 16", "MacBook Pro 14", "MacBook Pro 13", "MacBook Air M2", "MacBook Air M1", "AirPods Pro 2", "AirPods Pro", "AirPods 3", "AirPods 2", "AirPods Max", "Αλλο"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy Z Fold 4", "Galaxy Z Flip 4", "Galaxy A54", "Galaxy A34", "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab S8", "Galaxy Buds 2 Pro", "Galaxy Buds FE", "Αλλο"],
  Xiaomi: ["14 Ultra", "14 Pro", "14", "13T Pro", "13T", "13 Pro", "13", "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13", "Poco X6 Pro", "Poco X6", "Pad 6 Pro", "Pad 6", "Αλλο"],
  OnePlus: ["12", "12R", "11", "Open", "Nord 3", "Nord CE 3", "Buds Pro 2", "Αλλο"],
  Google: ["Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 7a", "Pixel Fold", "Pixel Buds Pro", "Αλλο"],
};

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
        "Υποβληθηκε για Εγκριση",
        "Η αγγελια σου υποβληθηκε και θα εγκριθει συντομα απο τη διαχειριση.\n\nYour listing is pending approval.",
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
      Alert.alert("Σφαλμα", "Αποτυχια δημιουργιας αγγελιας. Προσπαθησε ξανα.");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    if (!session?.user) {
      router.push("/login" as Href);
      return;
    }

    if (!title.trim() || !description.trim() || !price || !category || !condition || !city) {
      Alert.alert("Λειπουν Στοιχεια", "Συμπληρωσε ολα τα υποχρεωτικα πεδια.");
      return;
    }

    if (images.length < 3) {
      Alert.alert("Απαιτουνται Φωτογραφιες", "Προσθεσε τουλαχιστον 3 φωτογραφιες.\n\nMinimum 3 photos required.");
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
            Συνδεσου για να πουλησεις
          </Text>
          <Text className="mt-3 text-center text-base font-medium text-gray-400">
            Δημιουργησε λογαριασμο για να καταχωρησεις τις συσκευες σου στο Mobile Unit
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
              <Text className="text-xl font-black uppercase text-white">Συνδεση</Text>
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
                <Text className="ml-2 text-3xl font-black text-white">Νεα Αγγελια</Text>
              </View>
              <Text className="mt-1 text-base font-semibold text-gray-400">
                Πουλησε τη συσκευη σου στο Mobile Unit
              </Text>
            </View>

            {/* Images */}
            <View className="mb-6 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                ΦΩΤΟΓΡΑΦΙΕΣ (3-10) *
              </Text>
              <Text className="mb-3 text-sm font-medium text-gray-400">
                Ελαχιστο 3 φωτογραφιες / Minimum 3 photos required
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
                      {images.length < 3 ? `${3 - images.length} ακομα` : "Προσθηκη"}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Title */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                ΤΙΤΛΟΣ *
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
                ΚΑΤΗΓΟΡΙΑ *
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
                ΚΑΤΑΣΤΑΣΗ *
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
                    ΟΔΗΓΟΣ ΤΙΜΟΛΟΓΗΣΗΣ / PRICING GUIDE
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-gray-300">
                    {conditions.find((c) => c.id === condition)?.name}: {conditions.find((c) => c.id === condition)?.band} της τιμης καινουργιου
                  </Text>
                  <Text className="mt-1 text-xs text-gray-400">
                    Χωρις ΦΠΑ για μεταχειρισμενα / VAT-free for used items
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
                    Δες Τιμές Αγοράς Pandas / Check Pandas Pricing
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* City */}
            <View className="mb-5 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                ΠΟΛΗ *
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
                    ΡΟΔΟΣ
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Price */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                ΤΙΜΗ (€) *
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
                ΜΑΡΚΑ
              </Text>
              <Pressable
                onPress={() => category && setShowBrandPicker(!showBrandPicker)}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: showBrandPicker ? "#FF00FF" : "#333", opacity: category ? 1 : 0.5 }}
              >
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <View className="flex-row items-center justify-between px-4 py-4">
                    <Text className={`text-base font-semibold ${brand ? "text-white" : "text-gray-500"}`}>
                      {brand || (category ? "Επιλεξε μαρκα" : "Επιλεξε πρωτα κατηγορια")}
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
                ΜΟΝΤΕΛΟ
              </Text>
              <Pressable
                onPress={() => brand && modelOptions[brand] && setShowModelPicker(!showModelPicker)}
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 2, borderColor: showModelPicker ? "#FF00FF" : "#333", opacity: brand && modelOptions[brand] ? 1 : 0.5 }}
              >
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <View className="flex-row items-center justify-between px-4 py-4">
                    <Text className={`text-base font-semibold ${model ? "text-white" : "text-gray-500"}`}>
                      {model || (brand ? (modelOptions[brand] ? "Επιλεξε μοντελο" : "Γραψε μοντελο") : "Επιλεξε πρωτα μαρκα")}
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
                ΤΟΠΟΘΕΣΙΑ
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
                ΠΕΡΙΓΡΑΦΗ *
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="min-h-[140px] px-4 py-4 text-base font-semibold text-white"
                    placeholder="Περιγραψε τη συσκευη σου, συμπεριλαμβανομενων τυχον γρατζουνιων, αξεσουαρ, υγεια μπαταριας κ.λπ."
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
                    {createMutation.isPending ? "Δημιουργια..." : "Δημοσιευση Αγγελιας"}
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
