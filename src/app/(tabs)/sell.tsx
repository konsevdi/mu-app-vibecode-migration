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
  Headphones,
  Check,
  X,
  ImagePlus,
  Zap,
  Sparkles,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { type CreateListingRequest, type CreateListingResponse, type Category, type Condition, type City } from "@/shared/contracts";
import { useCityStore } from "@/lib/cityStore";

const categories: { id: Category; name: string; icon: React.ComponentType<{ size: number; color: string }>; color: string }[] = [
  { id: "phone", name: "Κινητό", icon: Smartphone, color: "#FF00FF" },
  { id: "tablet", name: "Tablet", icon: Tablet, color: "#00FF88" },
  { id: "accessory", name: "Αξεσουάρ", icon: Headphones, color: "#FFD700" },
];

const conditions: { id: Condition; name: string; description: string; color: string }[] = [
  { id: "new", name: "Καινούργιο", description: "Αχρησιμοποίητο", color: "#00FF88" },
  { id: "like_new", name: "Σαν Καινούργιο", description: "Ελάχιστη χρήση", color: "#00BFFF" },
  { id: "good", name: "Καλό", description: "Μικρά σημάδια χρήσης", color: "#FFD700" },
  { id: "fair", name: "Μέτριο", description: "Φανερή χρήση, λειτουργικό", color: "#FF6B6B" },
];

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

  const createMutation = useMutation({
    mutationFn: (data: CreateListingRequest) =>
      api.post<CreateListingResponse>("/api/listings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      Alert.alert("Επιτυχία!", "Η αγγελία σου δημιουργήθηκε!", [
        { text: "OK", onPress: () => router.push("/" as Href) },
      ]);
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
      Alert.alert("Σφάλμα", "Αποτυχία δημιουργίας αγγελίας. Προσπάθησε ξανά.");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    if (!session?.user) {
      router.push("/login" as Href);
      return;
    }

    if (!title.trim() || !description.trim() || !price || !category || !condition || !city) {
      Alert.alert("Λείπουν Στοιχεία", "Συμπλήρωσε όλα τα υποχρεωτικά πεδία.");
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
    if (images.length < 5) {
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
            Συνδέσου για να πουλήσεις
          </Text>
          <Text className="mt-3 text-center text-base font-medium text-gray-400">
            Δημιούργησε λογαριασμό για να καταχωρήσεις τις συσκευές σου στο Mobile Unit
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
              <Text className="text-xl font-black uppercase text-white">Σύνδεση</Text>
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
                <Text className="ml-2 text-3xl font-black text-white">Νέα Αγγελία</Text>
              </View>
              <Text className="mt-1 text-base font-semibold text-gray-400">
                Πούλησε τη συσκευή σου στο Mobile Unit
              </Text>
            </View>

            {/* Images */}
            <View className="mb-6 px-5">
              <Text className="mb-3 text-base font-bold uppercase tracking-wider text-white">
                Φωτογραφίες (έως 5)
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
                {images.length < 5 && (
                  <Pressable
                    onPress={addPlaceholderImage}
                    className="h-28 w-28 items-center justify-center rounded-2xl"
                    style={{ borderWidth: 2, borderColor: "#FF00FF", borderStyle: "dashed", backgroundColor: "#FF00FF10" }}
                  >
                    <ImagePlus size={32} color="#FF00FF" />
                    <Text className="mt-2 text-xs font-bold text-fuchsia-400">Προσθήκη</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Title */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                Τίτλος *
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
                Κατηγορία *
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
                Κατάσταση *
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
                        <Text
                          className={`${isSelected ? "ml-1" : ""} text-sm font-bold ${
                            isSelected ? "text-black" : "text-white"
                          }`}
                        >
                          {cond.name}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
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
                Τιμή (€) *
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
            <View className="mb-5 flex-row px-5">
              <View className="mr-2 flex-1">
                <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                  Μάρκα
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                  <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                    <TextInput
                      className="px-4 py-4 text-base font-semibold text-white"
                      placeholder="π.χ. Apple"
                      placeholderTextColor="#666"
                      value={brand}
                      onChangeText={setBrand}
                    />
                  </LinearGradient>
                </View>
              </View>
              <View className="ml-2 flex-1">
                <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                  Μοντέλο
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                  <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                    <TextInput
                      className="px-4 py-4 text-base font-semibold text-white"
                      placeholder="π.χ. iPhone 14"
                      placeholderTextColor="#666"
                      value={model}
                      onChangeText={setModel}
                    />
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Location */}
            <View className="mb-5 px-5">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">
                Τοποθεσία
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="px-4 py-4 text-base font-semibold text-white"
                    placeholder="π.χ. Ρόδος, Ελλάδα"
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
                Περιγραφή *
              </Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    className="min-h-[140px] px-4 py-4 text-base font-semibold text-white"
                    placeholder="Περίγραψε τη συσκευή σου, συμπεριλαμβανομένων τυχόν γρατζουνιών, αξεσουάρ, υγεία μπαταρίας κ.λπ."
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
                    {createMutation.isPending ? "Δημιουργία..." : "Δημοσίευση Αγγελίας"}
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
