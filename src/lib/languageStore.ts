import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "el" | "en";

// Translations - Greek in ALL CAPS without accents per spec
export const translations = {
  el: {
    // Browse
    browse_title: "ΑΓΟΡΑ",
    browse_subtitle: "Ανακάλυψε συσκευές κοντά σου",
    search_placeholder: "Αναζήτηση...",
    all_categories: "ΟΛΑ",
    phones: "ΚΙΝΗΤΑ",
    tablets: "TABLETS",
    laptops: "LAPTOPS",
    accessories: "ΑΞΕΣΟΥΑΡ",
    verified_only: "ΜΟΝΟ ΠΙΣΤΟΠΟΙΗΜΕΝΑ",
    no_listings: "Δεν βρέθηκαν αγγελίες",
    // Conditions
    condition_new: "ΚΑΙΝΟΥΡΓΙΟ",
    condition_like_new: "ΣΑΝ ΚΑΙΝΟΥΡΓΙΟ",
    condition_good: "ΚΑΛΟ",
    condition_fair: "ΜΕΤΡΙΟ",
    condition_parts: "ΑΝΤΑΛΛΑΚΤΙΚΑ",
    // Sell
    sell_title: "ΝΕΑ ΑΓΓΕΛΙΑ",
    sell_subtitle: "Πούλησε τη συσκευή σου στο Mobile Unit",
    photos_label: "ΦΩΤΟΓΡΑΦΙΕΣ (3-10)",
    min_photos: "Ελάχιστο 3 φωτογραφίες",
    title_label: "ΤΙΤΛΟΣ",
    category_label: "ΚΑΤΗΓΟΡΙΑ",
    condition_label: "ΚΑΤΑΣΤΑΣΗ",
    city_label: "ΠΟΛΗ",
    price_label: "ΤΙΜΗ",
    brand_label: "ΜΑΡΚΑ",
    model_label: "ΜΟΝΤΕΛΟ",
    location_label: "ΤΟΠΟΘΕΣΙΑ",
    description_label: "ΠΕΡΙΓΡΑΦΗ",
    publish_button: "ΔΗΜΟΣΙΕΥΣΗ ΑΓΓΕΛΙΑΣ",
    creating: "ΔΗΜΙΟΥΡΓΙΑ...",
    pricing_guide: "ΟΔΗΓΟΣ ΤΙΜΟΛΟΓΗΣΗΣ",
    vat_free: "Χωρίς ΦΠΑ για μεταχειρισμένα",
    check_pricing: "Δες Τιμές Αγοράς Pandas",
    // Profile
    profile_title: "ΠΡΟΦΙΛ",
    my_listings: "ΟΙ ΑΓΓΕΛΙΕΣ ΜΟΥ",
    listings_count: "ΑΓΓΕΛΙΕΣ",
    views_count: "ΠΡΟΒΟΛΕΣ",
    create_new: "ΔΗΜΙΟΥΡΓΗΣΕ ΝΕΑ ΑΓΓΕΛΙΑ",
    no_listings_yet: "Δεν έχεις ακόμα αγγελίες",
    create_first: "Δημιούργησε την πρώτη σου",
    settings: "ΡΥΘΜΙΣΕΙΣ",
    support: "ΥΠΟΣΤΗΡΙΞΗ",
    legal: "ΝΟΜΙΚΑ",
    sign_out: "ΑΠΟΣΥΝΔΕΣΗ",
    sign_in: "ΣΥΝΔΕΣΗ",
    sign_in_to_profile: "Συνδέσου στο προφίλ σου",
    // Service
    service_title: "ΥΠΗΡΕΣΙΕΣ",
    grading_cta: "ΒΑΘΜΟΛΟΓΗΣΗ ΣΤΟ IREPAIR",
    book_appointment: "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ",
    diagnostic_fee: "ΔΙΑΓΝΩΣΤΙΚΟ ΤΕΛΟΣ",
    refunded_on_purchase: "Επιστρέφεται αν αγοράσετε",
    // Common
    loading: "ΦΟΡΤΩΣΗ...",
    error: "ΣΦΑΛΜΑ",
    success: "ΕΠΙΤΥΧΙΑ",
    cancel: "ΑΚΥΡΩΣΗ",
    confirm: "ΕΠΙΒΕΒΑΙΩΣΗ",
    rhodes: "ΡΟΔΟΣ",
    add: "ΠΡΟΣΘΗΚΗ",
    remove: "ΑΦΑΙΡΕΣΗ",
    // Onboarding
    welcome_title: "Καλώς ήρθες στο Mobile Unit",
    welcome_subtitle: "Επιλεγμένες αγγελίες. Ασφαλής παραλαβή. Τοπικά.",
    get_started: "Ξεκίνα",
    have_account: "Έχω ήδη λογαριασμό",
    skip: "Παράλειψη",
    next: "Επόμενο",
    // Value props
    value_approved_title: "Εγκεκριμένες Αγγελίες",
    value_approved_desc: "Κάθε αγγελία ελέγχεται από την ομάδα μας",
    value_pickup_title: "Ασφαλής Παραλαβή",
    value_pickup_desc: "Συναντήσεις σε επιλεγμένα σημεία",
    value_inspection_title: "Έλεγχος & Βαθμολόγηση",
    value_inspection_desc: "Προαιρετικός έλεγχος από τεχνικούς",
    // City Gate
    select_city: "Επέλεξε Πόλη",
    select_city_subtitle: "Για να δεις αγγελίες κοντά σου",
    available_now: "Διαθέσιμο τώρα",
    coming_soon: "Σύντομα",
    other_city: "Άλλη πόλη / Εξωτερικό",
    use_location: "Χρήση τοποθεσίας μου",
    // Waitlist
    join_waitlist: "Μπες στη λίστα αναμονής",
    waitlist_title: "Λίστα Αναμονής",
    waitlist_subtitle: "Θα σε ειδοποιήσουμε όταν είμαστε διαθέσιμοι στην περιοχή σου",
    email_label: "EMAIL",
    interest_label: "ΕΝΔΙΑΦΕΡΟΝ",
    buyer: "Αγοραστής",
    seller: "Πωλητής",
    both: "Και τα δύο",
    phone_label: "ΤΗΛΕΦΩΝΟ (προαιρετικό)",
    social_label: "INSTAGRAM/SOCIAL (προαιρετικό)",
    notes_label: "ΣΗΜΕΙΩΣΕΙΣ (προαιρετικό)",
    referral_code_label: "ΚΩΔΙΚΟΣ ΠΡΟΣΚΛΗΣΗΣ (προαιρετικό)",
    consent_label: "Συμφωνώ να λαμβάνω ειδοποιήσεις",
    submit_waitlist: "Εγγραφή",
    // Waitlist Success
    waitlist_success_title: "Είσαι στη λίστα!",
    waitlist_success_subtitle: "Θα σε ειδοποιήσουμε όταν ανοίξουμε στην περιοχή σου",
    your_referral_code: "Ο κωδικός πρόσκλησής σου",
    share_referral: "Μοιράσου και ανέβα στη λίστα",
    share_button: "Κοινοποίηση",
    copy_link: "Αντιγραφή link",
    copied: "Αντιγράφηκε!",
    view_demo: "Δες Demo",
    referral_bonus: "+3 θέσεις για κάθε φίλο",
    // Demo Mode
    demo_banner: "Demo Mode",
    demo_locked_title: "Διαθέσιμο μόνο στη Ρόδο",
    demo_locked_subtitle: "Προς το παρόν είμαστε διαθέσιμοι μόνο στη Ρόδο",
    demo_locked_cta: "Μπες στη λίστα αναμονής",
    // Cities
    city_rhodes: "Ρόδος",
    city_athens: "Αθήνα",
    city_thessaloniki: "Θεσσαλονίκη",
    city_patras: "Πάτρα",
    city_heraklion: "Ηράκλειο",
    city_larissa: "Λάρισα",
    city_volos: "Βόλος",
    city_ioannina: "Ιωάννινα",
    city_chania: "Χανιά",
    city_london: "London",
    city_berlin: "Berlin",
    city_paris: "Paris",
    city_amsterdam: "Amsterdam",
    city_rome: "Rome",
    city_madrid: "Madrid",
    // Countries
    country_greece: "Ελλάδα",
    country_uk: "United Kingdom",
    country_germany: "Germany",
    country_france: "France",
    country_netherlands: "Netherlands",
    country_italy: "Italy",
    country_spain: "Spain",
    country_other: "Άλλη χώρα",
  },
  en: {
    // Browse
    browse_title: "BROWSE",
    browse_subtitle: "Discover devices near you",
    search_placeholder: "Search...",
    all_categories: "ALL",
    phones: "PHONES",
    tablets: "TABLETS",
    laptops: "LAPTOPS",
    accessories: "ACCESSORIES",
    verified_only: "VERIFIED ONLY",
    no_listings: "No listings found",
    // Conditions
    condition_new: "NEW",
    condition_like_new: "LIKE NEW",
    condition_good: "GOOD",
    condition_fair: "FAIR",
    condition_parts: "FOR PARTS",
    // Sell
    sell_title: "NEW LISTING",
    sell_subtitle: "Sell your device on Mobile Unit",
    photos_label: "PHOTOS (3-10)",
    min_photos: "Minimum 3 photos required",
    title_label: "TITLE",
    category_label: "CATEGORY",
    condition_label: "CONDITION",
    city_label: "CITY",
    price_label: "PRICE",
    brand_label: "BRAND",
    model_label: "MODEL",
    location_label: "LOCATION",
    description_label: "DESCRIPTION",
    publish_button: "PUBLISH LISTING",
    creating: "CREATING...",
    pricing_guide: "PRICING GUIDE",
    vat_free: "VAT-free for used items",
    check_pricing: "Check Pandas Pricing",
    // Profile
    profile_title: "PROFILE",
    my_listings: "MY LISTINGS",
    listings_count: "LISTINGS",
    views_count: "VIEWS",
    create_new: "CREATE NEW LISTING",
    no_listings_yet: "You have no listings yet",
    create_first: "Create your first one",
    settings: "SETTINGS",
    support: "SUPPORT",
    legal: "LEGAL",
    sign_out: "SIGN OUT",
    sign_in: "SIGN IN",
    sign_in_to_profile: "Sign in to your profile",
    // Service
    service_title: "SERVICES",
    grading_cta: "GET GRADED AT IREPAIR",
    book_appointment: "BOOK APPOINTMENT",
    diagnostic_fee: "DIAGNOSTIC FEE",
    refunded_on_purchase: "Refunded on purchase",
    // Common
    loading: "LOADING...",
    error: "ERROR",
    success: "SUCCESS",
    cancel: "CANCEL",
    confirm: "CONFIRM",
    rhodes: "RHODES",
    add: "ADD",
    remove: "REMOVE",
    // Onboarding
    welcome_title: "Welcome to Mobile Unit",
    welcome_subtitle: "Curated listings. Safe meetups. Local.",
    get_started: "Get Started",
    have_account: "I have an account",
    skip: "Skip",
    next: "Next",
    // Value props
    value_approved_title: "Approved Listings",
    value_approved_desc: "Every listing is reviewed by our team",
    value_pickup_title: "Safe Pickup",
    value_pickup_desc: "Meet at designated locations",
    value_inspection_title: "Inspection & Grading",
    value_inspection_desc: "Optional tech inspection",
    // City Gate
    select_city: "Select City",
    select_city_subtitle: "To see listings near you",
    available_now: "Available now",
    coming_soon: "Coming soon",
    other_city: "Other city / Abroad",
    use_location: "Use my location",
    // Waitlist
    join_waitlist: "Join the waitlist",
    waitlist_title: "Waitlist",
    waitlist_subtitle: "We'll notify you when we're available in your area",
    email_label: "EMAIL",
    interest_label: "INTEREST",
    buyer: "Buyer",
    seller: "Seller",
    both: "Both",
    phone_label: "PHONE (optional)",
    social_label: "INSTAGRAM/SOCIAL (optional)",
    notes_label: "NOTES (optional)",
    referral_code_label: "REFERRAL CODE (optional)",
    consent_label: "I agree to receive notifications",
    submit_waitlist: "Submit",
    // Waitlist Success
    waitlist_success_title: "You're on the list!",
    waitlist_success_subtitle: "We'll notify you when we launch in your area",
    your_referral_code: "Your referral code",
    share_referral: "Share to move up the list",
    share_button: "Share",
    copy_link: "Copy link",
    copied: "Copied!",
    view_demo: "View Demo",
    referral_bonus: "+3 positions per friend",
    // Demo Mode
    demo_banner: "Demo Mode",
    demo_locked_title: "Only available in Rhodes",
    demo_locked_subtitle: "Currently we're only available in Rhodes",
    demo_locked_cta: "Join the waitlist",
    // Cities
    city_rhodes: "Rhodes",
    city_athens: "Athens",
    city_thessaloniki: "Thessaloniki",
    city_patras: "Patras",
    city_heraklion: "Heraklion",
    city_larissa: "Larissa",
    city_volos: "Volos",
    city_ioannina: "Ioannina",
    city_chania: "Chania",
    city_london: "London",
    city_berlin: "Berlin",
    city_paris: "Paris",
    city_amsterdam: "Amsterdam",
    city_rome: "Rome",
    city_madrid: "Madrid",
    // Countries
    country_greece: "Greece",
    country_uk: "United Kingdom",
    country_germany: "Germany",
    country_france: "France",
    country_netherlands: "Netherlands",
    country_italy: "Italy",
    country_spain: "Spain",
    country_other: "Other country",
  },
} as const;

export type TranslationKey = keyof typeof translations.el;

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "el",
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const lang = get().language;
        return translations[lang][key] ?? key;
      },
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper hook for translations
export const useTranslation = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? key;
  };

  return { t, language, setLanguage };
};
