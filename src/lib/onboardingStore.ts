import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WaitlistSignup } from "@/shared/contracts";

export type OnboardingStep =
  | "welcome"
  | "value-carousel"
  | "city-gate"
  | "auth"
  | "waitlist"
  | "waitlist-success"
  | "completed";

export interface SelectedCity {
  name: string;
  country: string;
  isEligible: boolean;
}

interface OnboardingState {
  // Onboarding progress
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;

  // City selection
  selectedCity: SelectedCity | null;
  setSelectedCity: (city: SelectedCity | null) => void;

  // Onboarding completed flag (persisted)
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;

  // Eligibility
  isEligibleCity: boolean;
  setIsEligibleCity: (eligible: boolean) => void;

  // Deep link referral code
  pendingRefCode: string | null;
  setPendingRefCode: (code: string | null) => void;

  // Waitlist data (after signup)
  waitlistSignup: WaitlistSignup | null;
  setWaitlistSignup: (signup: WaitlistSignup | null) => void;

  // Reset onboarding
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: "welcome",
      setCurrentStep: (step) => set({ currentStep: step }),

      selectedCity: null,
      setSelectedCity: (city) => set({ selectedCity: city }),

      onboardingCompleted: false,
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

      isEligibleCity: false,
      setIsEligibleCity: (eligible) => set({ isEligibleCity: eligible }),

      pendingRefCode: null,
      setPendingRefCode: (code) => set({ pendingRefCode: code }),

      waitlistSignup: null,
      setWaitlistSignup: (signup) => set({ waitlistSignup: signup }),

      resetOnboarding: () => set({
        currentStep: "welcome",
        selectedCity: null,
        onboardingCompleted: false,
        isEligibleCity: false,
        pendingRefCode: null,
        waitlistSignup: null,
      }),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        isEligibleCity: state.isEligibleCity,
        selectedCity: state.selectedCity,
        waitlistSignup: state.waitlistSignup,
      }),
    }
  )
);

// Hook to check if the store has been hydrated from AsyncStorage
export const useOnboardingHydrated = () => {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Check if already hydrated
    const unsubFinishHydration = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If the store was already hydrated before this component mounted
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};

// City data with eligibility
export const CITIES = {
  greece: [
    { name: "Rhodes", nameEl: "Ρόδος", country: "Greece", countryEl: "Ελλάδα", isEligible: true },
    { name: "Athens", nameEl: "Αθήνα", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Thessaloniki", nameEl: "Θεσσαλονίκη", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Patras", nameEl: "Πάτρα", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Heraklion", nameEl: "Ηράκλειο", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Larissa", nameEl: "Λάρισα", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Volos", nameEl: "Βόλος", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Ioannina", nameEl: "Ιωάννινα", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
    { name: "Chania", nameEl: "Χανιά", country: "Greece", countryEl: "Ελλάδα", isEligible: false },
  ],
  europe: [
    { name: "London", nameEl: "London", country: "United Kingdom", countryEl: "Ηνωμένο Βασίλειο", isEligible: false },
    { name: "Berlin", nameEl: "Berlin", country: "Germany", countryEl: "Γερμανία", isEligible: false },
    { name: "Paris", nameEl: "Paris", country: "France", countryEl: "Γαλλία", isEligible: false },
    { name: "Amsterdam", nameEl: "Amsterdam", country: "Netherlands", countryEl: "Ολλανδία", isEligible: false },
    { name: "Rome", nameEl: "Rome", country: "Italy", countryEl: "Ιταλία", isEligible: false },
    { name: "Madrid", nameEl: "Madrid", country: "Spain", countryEl: "Ισπανία", isEligible: false },
  ],
} as const;

// Get all cities as a flat array
export const getAllCities = () => [...CITIES.greece, ...CITIES.europe];

// Check if a city is eligible (Rhodes only for now)
export const isCityEligible = (cityName: string): boolean => {
  const city = getAllCities().find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase() ||
           c.nameEl.toLowerCase() === cityName.toLowerCase()
  );
  return city?.isEligible ?? false;
};

// Tourist mode flag (OFF for now, enable in V2)
export const TOURIST_MODE_ENABLED = false;
