// V1 Rhodes stores only
export const V1_STORES = [
  {
    id: "irepair-rhodes",
    name: "iRepair Rhodes",
    address: "Αμμοχώστου 18, 85131, Ρόδος",
    storePageUrl: "https://irepair.gr/stores/irepair-%CF%81%CF%8C%CE%B4%CE%BF%CF%82",
    coords: { lat: 36.4349, lng: 28.2176 },
    isPrimary: true,
  },
  {
    id: "irepair-spot",
    name: "iRepair Spot",
    subtitle: "Public Νέα Μαρίνα",
    address: "Αυστραλίας 84-86, 85100, Ρόδος",
    storePageUrl: "https://irepair.gr/stores/irepair-public-home-%CF%81%CF%8C%CE%B4%CE%BF%CF%82",
    coords: { lat: 36.4412, lng: 28.2234 },
    isPrimary: false,
  },
] as const;

export type Store = typeof V1_STORES[number];
