import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Mail,
  ChevronLeft,
  User,
  ShoppingBag,
  Phone,
  AtSign,
  Gift,
  CheckCircle,
  Wrench,
} from "lucide-react-native";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { useTranslation } from "@/lib/languageStore";
import { LanguageTogglePill } from "@/components/LanguageTogglePill";
import { api } from "@/lib/api";
import {
  useReduceMotion,
  TIMING,
  EASE_OUT,
  EASE_PREMIUM,
  SPRING_RESPONSIVE,
  getStaggerDelay,
} from "@/lib/animations";
import type {
  CreateWaitlistSignupRequest,
  CreateWaitlistSignupResponse,
  InterestType,
} from "@/shared/contracts";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

function AnimatedFormSection({
  children,
  delay,
  reduceMotion,
}: {
  children: React.ReactNode;
  delay: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 8);

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

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function AnimatedSubmitButton({
  onPress,
  loading,
  disabled,
  label,
  reduceMotion,
}: {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const buttonWidth = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion && !disabled && !loading) {
      scale.value = withSpring(0.97, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RESPONSIVE);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  }, [disabled, loading, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, styles.submitButton]}
    >
      <LinearGradient
        colors={["#00FF88", "#00CC6A"]}
        style={styles.submitGradient}
      >
        {loading ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <Text style={styles.submitText}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

function InterestOption({
  value,
  label,
  icon,
  isSelected,
  onPress,
  reduceMotion,
}: {
  value: InterestType;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const borderColor = isSelected ? "#00FF88" : "#333";
  const backgroundColor = isSelected ? "#1a1a2e" : "transparent";

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.95, SPRING_RESPONSIVE);
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
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.interestOption,
        { borderColor, backgroundColor },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.interestOptionText,
          { color: isSelected ? "#fff" : "#999" },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function AnimatedCheckbox({
  checked,
  onPress,
  label,
  hasError,
  reduceMotion,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  hasError: boolean;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    checkScale.value = withTiming(checked ? 1 : 0, {
      duration: reduceMotion ? 0 : TIMING.micro,
      easing: EASE_PREMIUM,
    });
  }, [checked, reduceMotion, checkScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      scale.value = withSpring(0.95, SPRING_RESPONSIVE);
      setTimeout(() => {
        scale.value = withSpring(1, SPRING_RESPONSIVE);
      }, 100);
    }
    onPress();
  }, [reduceMotion, scale, onPress]);

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: checked ? "#00FF88" : "transparent",
    borderColor: hasError ? "#FF6B6B" : checked ? "#00FF88" : "#333",
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Pressable onPress={handlePress} style={styles.checkboxContainer}>
      <Animated.View style={[styles.checkbox, boxAnimatedStyle]}>
        <Animated.View style={checkAnimatedStyle}>
          <CheckCircle size={16} color="#000" />
        </Animated.View>
      </Animated.View>
      <Text style={styles.checkboxLabel}>{label} *</Text>
    </Pressable>
  );
}

function AnimatedError({
  message,
  reduceMotion,
}: {
  message: string;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: reduceMotion ? 0 : 150,
      easing: EASE_OUT,
    });
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.errorText, animatedStyle]}>
      {message}
    </Animated.Text>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WaitlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    city?: string;
    country?: string;
    ref?: string;
    intent?: string;
  }>();
  const { t, language } = useTranslation();
  const reduceMotion = useReduceMotion();
  const pendingRefCode = useOnboardingStore((s) => s.pendingRefCode);
  const setWaitlistSignup = useOnboardingStore((s) => s.setWaitlistSignup);
  const setOnboardingCompleted = useOnboardingStore(
    (s) => s.setOnboardingCompleted
  );
  const selectedCity = useOnboardingStore((s) => s.selectedCity);

  // Check if this is a repair intent
  const isRepairIntent = params.intent === "repair";

  // Form state
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(params.city ?? selectedCity?.name ?? "");
  const [country, setCountry] = useState(
    params.country ?? selectedCity?.country ?? ""
  );
  const [interestType, setInterestType] = useState<InterestType>(
    isRepairIntent ? "seller" : "both"
  );
  const [phone, setPhone] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [notes, setNotes] = useState(
    isRepairIntent
      ? language === "el"
        ? "Ενδιαφέρομαι για επισκευή συσκευής"
        : "Interested in device repair"
      : ""
  );
  const [referralCode, setReferralCode] = useState(
    params.ref ?? pendingRefCode ?? ""
  );
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
      setErrors({
        submit:
          language === "el"
            ? "Κάτι πήγε στραβά. Δοκίμασε ξανά."
            : "Something went wrong. Please try again.",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email =
        language === "el" ? "Απαιτείται έγκυρο email" : "Valid email required";
    }
    if (!city.trim()) {
      newErrors.city = language === "el" ? "Απαιτείται πόλη" : "City required";
    }
    if (!country.trim()) {
      newErrors.country =
        language === "el" ? "Απαιτείται χώρα" : "Country required";
    }
    if (!consent) {
      newErrors.consent =
        language === "el" ? "Απαιτείται συναίνεση" : "Consent required";
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

  const interestOptions: {
    value: InterestType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "buyer",
      label: t("buyer"),
      icon: <ShoppingBag size={18} color="#00BFFF" />,
    },
    {
      value: "seller",
      label: t("seller"),
      icon: <User size={18} color="#FF00FF" />,
    },
    {
      value: "both",
      label: t("both"),
      icon: <CheckCircle size={18} color="#00FF88" />,
    },
  ];

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#999" />
            <Text style={styles.backText}>
              {language === "el" ? "Πίσω" : "Back"}
            </Text>
          </Pressable>
          <LanguageTogglePill />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <AnimatedFormSection delay={0} reduceMotion={reduceMotion}>
              <View style={styles.titleContainer}>
                <View
                  style={[
                    styles.titleIcon,
                    isRepairIntent && styles.titleIconRepair,
                  ]}
                >
                  {isRepairIntent ? (
                    <Wrench size={40} color="#FFD700" />
                  ) : (
                    <Mail size={40} color="#00BFFF" />
                  )}
                </View>
                <Text style={styles.title}>
                  {isRepairIntent
                    ? language === "el"
                      ? "Ζήτα Προσφορά"
                      : "Get a Quote"
                    : t("waitlist_title")}
                </Text>
                <Text style={styles.subtitle}>
                  {isRepairIntent
                    ? language === "el"
                      ? "Συμπλήρωσε τα στοιχεία σου για να λάβεις προσφορά επισκευής"
                      : "Fill in your details to receive a repair quote"
                    : t("waitlist_subtitle")}
                </Text>
              </View>
            </AnimatedFormSection>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <AnimatedFormSection
                delay={getStaggerDelay(0, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("email_label")} *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.email && styles.inputError,
                    ]}
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
                      style={styles.input}
                    />
                  </View>
                  {errors.email && (
                    <AnimatedError
                      message={errors.email}
                      reduceMotion={reduceMotion}
                    />
                  )}
                </View>
              </AnimatedFormSection>

              {/* City & Country */}
              <AnimatedFormSection
                delay={getStaggerDelay(1, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.rowContainer}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>{t("city_label")} *</Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder={language === "el" ? "Πόλη" : "City"}
                      placeholderTextColor="#666"
                      style={[
                        styles.inputSimple,
                        errors.city && styles.inputError,
                      ]}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>
                      {language === "el" ? "ΧΩΡΑ" : "COUNTRY"} *
                    </Text>
                    <TextInput
                      value={country}
                      onChangeText={setCountry}
                      placeholder={language === "el" ? "Χώρα" : "Country"}
                      placeholderTextColor="#666"
                      style={[
                        styles.inputSimple,
                        errors.country && styles.inputError,
                      ]}
                    />
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Interest Type */}
              <AnimatedFormSection
                delay={getStaggerDelay(2, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("interest_label")}</Text>
                  <View style={styles.interestContainer}>
                    {interestOptions.map((option) => (
                      <InterestOption
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        icon={option.icon}
                        isSelected={interestType === option.value}
                        onPress={() => setInterestType(option.value)}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Phone (optional) */}
              <AnimatedFormSection
                delay={getStaggerDelay(3, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("phone_label")}</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={20} color="#666" />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+30 xxx xxx xxxx"
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Social Handle (optional) */}
              <AnimatedFormSection
                delay={getStaggerDelay(4, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("social_label")}</Text>
                  <View style={styles.inputWrapper}>
                    <AtSign size={20} color="#666" />
                    <TextInput
                      value={socialHandle}
                      onChangeText={setSocialHandle}
                      placeholder="@username"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Notes (optional) */}
              <AnimatedFormSection
                delay={getStaggerDelay(5, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("notes_label")}</Text>
                  <View style={styles.textareaWrapper}>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={
                        language === "el"
                          ? "Πες μας κάτι ακόμα..."
                          : "Tell us more..."
                      }
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={styles.textarea}
                    />
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Referral Code (optional) */}
              <AnimatedFormSection
                delay={getStaggerDelay(6, 100)}
                reduceMotion={reduceMotion}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    {t("referral_code_label")}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Gift size={20} color="#666" />
                    <TextInput
                      value={referralCode}
                      onChangeText={setReferralCode}
                      placeholder="MU XXXXXX"
                      placeholderTextColor="#666"
                      autoCapitalize="characters"
                      style={styles.input}
                    />
                  </View>
                </View>
              </AnimatedFormSection>

              {/* Consent */}
              <AnimatedFormSection
                delay={getStaggerDelay(7, 100)}
                reduceMotion={reduceMotion}
              >
                <AnimatedCheckbox
                  checked={consent}
                  onPress={() => setConsent(!consent)}
                  label={t("consent_label")}
                  hasError={!!errors.consent}
                  reduceMotion={reduceMotion}
                />
              </AnimatedFormSection>

              {/* Error */}
              {errors.submit && (
                <AnimatedFormSection delay={0} reduceMotion={reduceMotion}>
                  <Text style={styles.submitError}>{errors.submit}</Text>
                </AnimatedFormSection>
              )}

              {/* Submit */}
              <AnimatedFormSection
                delay={getStaggerDelay(8, 100)}
                reduceMotion={reduceMotion}
              >
                <AnimatedSubmitButton
                  onPress={handleSubmit}
                  loading={submitMutation.isPending}
                  disabled={submitMutation.isPending}
                  label={t("submit_waitlist")}
                  reduceMotion={reduceMotion}
                />
              </AnimatedFormSection>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  titleIcon: {
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "#00BFFF",
  },
  titleIconRepair: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderColor: "#FFD700",
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 16,
    color: "#9ca3af",
  },
  form: {
    marginTop: 24,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  inputSimple: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  rowContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
    marginHorizontal: 4,
  },
  interestContainer: {
    flexDirection: "row",
  },
  interestOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
  },
  interestOptionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  textareaWrapper: {
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  textarea: {
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    minHeight: 80,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    color: "#FF6B6B",
  },
  submitError: {
    marginBottom: 16,
    textAlign: "center",
    fontSize: 14,
    color: "#FF6B6B",
  },
  submitButton: {
    marginBottom: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#00FF88",
    overflow: "hidden",
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  submitText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },
});
