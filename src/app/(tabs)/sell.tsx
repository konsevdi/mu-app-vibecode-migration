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
import {
  Camera,
  Smartphone,
  Tablet,
  Headphones,
  Check,
  X,
  ImagePlus,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { type CreateListingRequest, type CreateListingResponse, type Category, type Condition } from "@/shared/contracts";

const categories: { id: Category; name: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { id: "phone", name: "Phone", icon: Smartphone },
  { id: "tablet", name: "Tablet", icon: Tablet },
  { id: "accessory", name: "Accessory", icon: Headphones },
];

const conditions: { id: Condition; name: string; description: string }[] = [
  { id: "new", name: "New", description: "Brand new, unused" },
  { id: "like_new", name: "Like New", description: "Barely used, perfect condition" },
  { id: "good", name: "Good", description: "Minor signs of wear" },
  { id: "fair", name: "Fair", description: "Visible wear, fully functional" },
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (data: CreateListingRequest) =>
      api.post<CreateListingResponse>("/api/listings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      Alert.alert("Success", "Your listing has been created!", [
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
      Alert.alert("Error", "Failed to create listing. Please try again.");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    if (!session?.user) {
      router.push("/login" as Href);
      return;
    }

    if (!title.trim() || !description.trim() || !price || !category || !condition) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
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
      <View className="flex-1 bg-slate-900">
        <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center px-8">
          <Camera size={64} color="#334155" />
          <Text className="mt-6 text-center text-xl font-bold text-white">
            Sign in to start selling
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-400">
            Create an account to list your devices on Mobile Unit
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
            <View className="px-5 pb-4 pt-4">
              <Text className="text-2xl font-bold text-white">Create Listing</Text>
              <Text className="mt-1 text-sm text-slate-400">
                Sell your device on Mobile Unit
              </Text>
            </View>

            {/* Images */}
            <View className="mb-6 px-5">
              <Text className="mb-3 text-sm font-semibold text-slate-300">
                Photos (up to 5)
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
                      className="h-24 w-24 rounded-xl"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => removeImage(index)}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1"
                    >
                      <X size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                {images.length < 5 && (
                  <Pressable
                    onPress={addPlaceholderImage}
                    className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-600"
                  >
                    <ImagePlus size={28} color="#64748B" />
                    <Text className="mt-1 text-xs text-slate-500">Add Photo</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Title */}
            <View className="mb-4 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Title *
              </Text>
              <TextInput
                className="rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                placeholder="e.g., iPhone 14 Pro Max 256GB"
                placeholderTextColor="#64748B"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category */}
            <View className="mb-4 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Category *
              </Text>
              <View className="flex-row">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      className={`mr-3 flex-1 items-center rounded-xl py-4 ${
                        isSelected ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <Icon size={24} color={isSelected ? "#FFFFFF" : "#94A3B8"} />
                      <Text
                        className={`mt-1 text-xs font-semibold ${
                          isSelected ? "text-white" : "text-slate-400"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Condition */}
            <View className="mb-4 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Condition *
              </Text>
              <View className="flex-row flex-wrap">
                {conditions.map((cond) => {
                  const isSelected = condition === cond.id;
                  return (
                    <Pressable
                      key={cond.id}
                      onPress={() => setCondition(cond.id)}
                      className={`mb-2 mr-2 flex-row items-center rounded-full px-4 py-2 ${
                        isSelected ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" />}
                      <Text
                        className={`${isSelected ? "ml-1" : ""} text-sm font-semibold ${
                          isSelected ? "text-white" : "text-slate-400"
                        }`}
                      >
                        {cond.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Price */}
            <View className="mb-4 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Price (€) *
              </Text>
              <TextInput
                className="rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                placeholder="0"
                placeholderTextColor="#64748B"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>

            {/* Brand & Model */}
            <View className="mb-4 flex-row px-5">
              <View className="mr-2 flex-1">
                <Text className="mb-2 text-sm font-semibold text-slate-300">
                  Brand
                </Text>
                <TextInput
                  className="rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                  placeholder="e.g., Apple"
                  placeholderTextColor="#64748B"
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View className="ml-2 flex-1">
                <Text className="mb-2 text-sm font-semibold text-slate-300">
                  Model
                </Text>
                <TextInput
                  className="rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                  placeholder="e.g., iPhone 14"
                  placeholderTextColor="#64748B"
                  value={model}
                  onChangeText={setModel}
                />
              </View>
            </View>

            {/* Location */}
            <View className="mb-4 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Location
              </Text>
              <TextInput
                className="rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                placeholder="e.g., Rhodes, Greece"
                placeholderTextColor="#64748B"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Description */}
            <View className="mb-6 px-5">
              <Text className="mb-2 text-sm font-semibold text-slate-300">
                Description *
              </Text>
              <TextInput
                className="min-h-[120px] rounded-xl bg-slate-800 px-4 py-3 text-base text-white"
                placeholder="Describe your device, including any scratches, accessories included, battery health, etc."
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <View className="mb-8 px-5">
              <Pressable
                onPress={handleSubmit}
                disabled={createMutation.isPending}
                className={`items-center rounded-xl py-4 ${
                  createMutation.isPending ? "bg-cyan-700" : "bg-cyan-500"
                }`}
              >
                <Text className="text-lg font-bold text-white">
                  {createMutation.isPending ? "Creating..." : "Create Listing"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
