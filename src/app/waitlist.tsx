import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  ChevronLeft,
  User,
  ShoppingBag,
  Phone,
  AtSign,
  FileText,
  Gift,
  CheckCircle,
} from "lucide-react-native";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageToggle } from "@/components/LanguageToggle";
import { api } from "@/lib/api";
import type {
  CreateWaitlistSignupRequest,
  CreateWaitlistSignupResponse,
  InterestType,
} from "@/shared/contracts";

export default function WaitlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ city?: string; country?: string; ref?: string }>();
  const { t, language } = useTranslation();
  const pendingRefCode = useOnboardingStore((s) => s.pendingRefCode);
  const setWaitlistSignup = useOnboardingStore((s) => s.setWaitlistSignup);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);
  const selectedCity = useOnboardingStore((s) => s.selectedCity);

  // Form state
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(params.city ?? selectedCity?.name ?? "");
  const [country, setCountry] = useState(params.country ?? selectedCity?.country ?? "");
  const [interestType, setInterestType] = useState<InterestType>("both");
  const [phone, setPhone] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState(params.ref ?? pendingRefCode ?? "");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitMutation = useMutation({
    mutationFn: async (data: CreateWaitlistSignupRequest) => {
      return api.post<CreateWaitlistSignupResponse>("/api/waitlist", data);
    },
    onSuccess: (response) => {
      setWaitlistSignup(response.signup);
      setOnboardingCompleted(true);
      router.replace("/waitlist-success" as Href);
    },
    onError: (error: Error) => {
      console.error("Waitlist signup error:", error);
      setErrors({ submit: language === "el"
        ? "Κάτι πήγε στραβά. Δοκίμασε ξανά."
        : "Something went wrong. Please try again."
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = language === "el" ? "Απαιτείται έγκυρο email" : "Valid email required";
    }
    if (!city.trim()) {
      newErrors.city = language === "el" ? "Απαιτείται πόλη" : "City required";
    }
    if (!country.trim()) {
      newErrors.country = language === "el" ? "Απαιτείται χώρα" : "Country required";
    }
    if (!consent) {
      newErrors.consent = language === "el" ? "Απαιτείται συναίνεση" : "Consent required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    submitMutation.mutate({
      email: email.trim().toLowerCase(),
      city: city.trim(),
      country: country.trim(),
      interestType,
      consent,
      phone: phone.trim() || undefined,
      socialHandle: socialHandle.trim() || undefined,
      notes: notes.trim() || undefined,
      languagePref: language,
      referredByCode: referralCode.trim() || undefined,
    });
  };

  const interestOptions: { value: InterestType; label: string; icon: React.ReactNode }[] = [
    { value: "buyer", label: t("buyer"), icon: <ShoppingBag size={18} color="#00BFFF" /> },
    { value: "seller", label: t("seller"), icon: <User size={18} color="#FF00FF" /> },
    { value: "both", label: t("both"), icon: <CheckCircle size={18} color="#00FF88" /> },
  ];

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable onPress={() => router.back()} className="flex-row items-center">
            <ChevronLeft size={24} color="#999" />
            <Text className="ml-1 text-base font-medium text-gray-500">
              {language === "el" ? "Πίσω" : "Back"}
            </Text>
          </Pressable>
          <LanguageToggle />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View className="mt-4 items-center">
              <View
                className="mb-4 rounded-3xl p-4"
                style={{ backgroundColor: "#00BFFF20", borderWidth: 2, borderColor: "#00BFFF" }}
              >
                <Mail size={40} color="#00BFFF" />
              </View>
              <Text className="text-center text-2xl font-black text-white">
                {t("waitlist_title")}
              </Text>
              <Text className="mt-2 text-center text-base text-gray-400">
                {t("waitlist_subtitle")}
              </Text>
            </View>

            {/* Form */}
            <View className="mt-6">
              {/* Email */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("email_label")} *
                </Text>
                <View
                  className="flex-row items-center rounded-xl px-4"
                  style={{
                    backgroundColor: "#1a1a2e",
                    borderWidth: 1,
                    borderColor: errors.email ? "#FF6B6B" : "#333",
                  }}
                >
                  <Mail size={20} color="#666" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="ml-3 flex-1 py-3 text-base text-white"
                  />
                </View>
                {errors.email && (
                  <Text className="mt-1 text-sm text-red-400">{errors.email}</Text>
                )}
              </View>

              {/* City & Country */}
              <View className="mb-4 flex-row">
                <View className="mr-2 flex-1">
                  <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                    {t("city_label")} *
                  </Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder={language === "el" ? "Πόλη" : "City"}
                    placeholderTextColor="#666"
                    className="rounded-xl px-4 py-3 text-base text-white"
                    style={{
                      backgroundColor: "#1a1a2e",
                      borderWidth: 1,
                      borderColor: errors.city ? "#FF6B6B" : "#333",
                    }}
                  />
                </View>
                <View className="ml-2 flex-1">
                  <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                    {language === "el" ? "ΧΩΡΑ" : "COUNTRY"} *
                  </Text>
                  <TextInput
                    value={country}
                    onChangeText={setCountry}
                    placeholder={language === "el" ? "Χώρα" : "Country"}
                    placeholderTextColor="#666"
                    className="rounded-xl px-4 py-3 text-base text-white"
                    style={{
                      backgroundColor: "#1a1a2e",
                      borderWidth: 1,
                      borderColor: errors.country ? "#FF6B6B" : "#333",
                    }}
                  />
                </View>
              </View>

              {/* Interest Type */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("interest_label")}
                </Text>
                <View className="flex-row">
                  {interestOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setInterestType(option.value)}
                      className="mr-2 flex-1 flex-row items-center justify-center rounded-xl py-3"
                      style={{
                        backgroundColor: interestType === option.value ? "#1a1a2e" : "transparent",
                        borderWidth: 1,
                        borderColor: interestType === option.value ? "#00FF88" : "#333",
                      }}
                    >
                      {option.icon}
                      <Text
                        className="ml-2 text-sm font-medium"
                        style={{
                          color: interestType === option.value ? "#fff" : "#999",
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Phone (optional) */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("phone_label")}
                </Text>
                <View
                  className="flex-row items-center rounded-xl px-4"
                  style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                >
                  <Phone size={20} color="#666" />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+30 xxx xxx xxxx"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    className="ml-3 flex-1 py-3 text-base text-white"
                  />
                </View>
              </View>

              {/* Social Handle (optional) */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("social_label")}
                </Text>
                <View
                  className="flex-row items-center rounded-xl px-4"
                  style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                >
                  <AtSign size={20} color="#666" />
                  <TextInput
                    value={socialHandle}
                    onChangeText={setSocialHandle}
                    placeholder="@username"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    className="ml-3 flex-1 py-3 text-base text-white"
                  />
                </View>
              </View>

              {/* Notes (optional) */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("notes_label")}
                </Text>
                <View
                  className="rounded-xl px-4"
                  style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                >
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={language === "el" ? "Πες μας κάτι ακόμα..." : "Tell us more..."}
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="py-3 text-base text-white"
                    style={{ minHeight: 80 }}
                  />
                </View>
              </View>

              {/* Referral Code (optional) */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold uppercase text-gray-500">
                  {t("referral_code_label")}
                </Text>
                <View
                  className="flex-row items-center rounded-xl px-4"
                  style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#333" }}
                >
                  <Gift size={20} color="#666" />
                  <TextInput
                    value={referralCode}
                    onChangeText={setReferralCode}
                    placeholder="MU XXXXXX"
                    placeholderTextColor="#666"
                    autoCapitalize="characters"
                    className="ml-3 flex-1 py-3 text-base text-white"
                  />
                </View>
              </View>

              {/* Consent */}
              <Pressable
                onPress={() => setConsent(!consent)}
                className="mb-6 flex-row items-start"
              >
                <View
                  className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: consent ? "#00FF88" : "transparent",
                    borderWidth: 2,
                    borderColor: errors.consent ? "#FF6B6B" : consent ? "#00FF88" : "#333",
                  }}
                >
                  {consent && <CheckCircle size={16} color="#000" />}
                </View>
                <Text className="flex-1 text-sm text-gray-400">
                  {t("consent_label")} *
                </Text>
              </Pressable>

              {/* Error */}
              {errors.submit && (
                <Text className="mb-4 text-center text-sm text-red-400">{errors.submit}</Text>
              )}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitMutation.isPending}
                className="mb-8 overflow-hidden rounded-2xl"
                style={{
                  borderWidth: 2,
                  borderColor: "#00FF88",
                  opacity: submitMutation.isPending ? 0.7 : 1,
                }}
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
                  {submitMutation.isPending ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text className="text-xl font-black text-black">
                      {t("submit_waitlist")}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
