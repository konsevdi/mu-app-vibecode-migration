import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { City } from "@/shared/contracts";

interface CityState {
  defaultCity: City | null;
  setDefaultCity: (city: City) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      defaultCity: null,
      setDefaultCity: (city) => set({ defaultCity: city }),
    }),
    {
      name: "city-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
