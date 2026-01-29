import { Hono } from "hono";
import { z } from "zod";
import { type AppType } from "../types";
import { sanitizeText } from "../lib/sanitize";

const assistantRouter = new Hono<AppType>();

// Chat request schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z
    .object({
      listingId: z.string().optional(),
      category: z.string().optional(),
      page: z.string().optional(),
    })
    .optional(),
  language: z.enum(["el", "en"]).default("el"),
});

// Knowledge base for the assistant
const KNOWLEDGE_BASE = {
  categories: {
    phone: {
      priceRange: { min: 50, max: 1500 },
      popularBrands: ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"],
      tips: [
        "Check battery health before buying",
        "Verify IMEI is not blacklisted",
        "Test all buttons and ports",
        "Check for screen burn-in on OLED models",
      ],
    },
    tablet: {
      priceRange: { min: 100, max: 2000 },
      popularBrands: ["Apple", "Samsung", "Lenovo", "Microsoft"],
      tips: [
        "Check screen for dead pixels",
        "Test stylus compatibility if needed",
        "Verify charging port condition",
      ],
    },
    laptop: {
      priceRange: { min: 200, max: 3000 },
      popularBrands: ["Apple", "Dell", "HP", "Lenovo", "ASUS"],
      tips: [
        "Check battery cycle count",
        "Test all USB ports",
        "Check keyboard for sticky keys",
        "Run diagnostics on SSD/HDD",
      ],
    },
    accessory: {
      priceRange: { min: 5, max: 500 },
      popularBrands: ["Apple", "Samsung", "Anker", "Belkin"],
      tips: [
        "Verify compatibility with your device",
        "Check for authentic vs counterfeit products",
      ],
    },
  },
  conditions: {
    new: { discount: 0.05, description: "Brand new, sealed or unused" },
    like_new: { discount: 0.15, description: "Minimal use, excellent condition" },
    good: { discount: 0.3, description: "Normal wear, fully functional" },
    fair: { discount: 0.45, description: "Visible wear, works properly" },
    parts: { discount: 0.7, description: "For parts or repair only" },
  },
  safetyTips: {
    el: [
      "Συναντήσου πάντα σε δημόσιο χώρο",
      "Χρησιμοποίησε τα καταστήματα iRepair για ασφαλείς συναντήσεις",
      "Έλεγξε τη συσκευή πριν πληρώσεις",
      "Μην πληρώνεις ποτέ εκ των προτέρων",
      "Αν κάτι φαίνεται πολύ καλό για να είναι αληθινό, πιθανότατα δεν είναι",
    ],
    en: [
      "Always meet in a public place",
      "Use iRepair shops for safe meetups",
      "Inspect the device before paying",
      "Never pay upfront",
      "If it seems too good to be true, it probably is",
    ],
  },
  iRepairInfo: {
    services: ["Diagnostics", "Grading", "Repairs", "Verification"],
    diagnosticFee: 10,
    locations: [
      { name: "iRepair Rhodes", address: "Ammochostou 18, 85131" },
      { name: "iRepair Spot", address: "Australias 84-86, 85100" },
    ],
  },
};

// Generate response based on user message
function generateResponse(
  message: string,
  context: { listingId?: string; category?: string; page?: string } | undefined,
  language: "el" | "en"
): { reply: string; suggestions: string[] } {
  const lowerMessage = message.toLowerCase();
  const isGreek = language === "el";

  // Pricing help
  if (
    lowerMessage.includes("price") ||
    lowerMessage.includes("τιμή") ||
    lowerMessage.includes("πόσο") ||
    lowerMessage.includes("worth") ||
    lowerMessage.includes("αξία")
  ) {
    const reply = isGreek
      ? `💰 **Οδηγός Τιμολόγησης**

Η τιμή εξαρτάται από:
- **Κατάσταση**: Καινούργιο (-5%), Σαν Καινούργιο (-15%), Καλό (-30%), Μέτριο (-45%)
- **Ηλικία**: Νεότερα μοντέλα = υψηλότερη τιμή
- **Αποθήκευση**: Περισσότερη χωρητικότητα = premium

📊 Χρησιμοποίησε το [Pandas Pricing](https://pricing-v2.pandas.io/el-GR/irepair/smartphone) για ακριβείς εκτιμήσεις.

Θέλεις βοήθεια με συγκεκριμένη συσκευή;`
      : `💰 **Pricing Guide**

Price depends on:
- **Condition**: New (-5%), Like New (-15%), Good (-30%), Fair (-45%)
- **Age**: Newer models = higher price
- **Storage**: More capacity = premium

📊 Use [Pandas Pricing](https://pricing-v2.pandas.io/el-GR/irepair/smartphone) for accurate estimates.

Need help with a specific device?`;

    return {
      reply,
      suggestions: isGreek
        ? ["Πώς τιμολογώ iPhone;", "Τι είναι καλή τιμή για Samsung;", "Πού βλέπω τιμές αγοράς;"]
        : ["How to price iPhone?", "What's a good Samsung price?", "Where to check market prices?"],
    };
  }

  // Safety questions
  if (
    lowerMessage.includes("safe") ||
    lowerMessage.includes("ασφάλ") ||
    lowerMessage.includes("scam") ||
    lowerMessage.includes("απάτ") ||
    lowerMessage.includes("trust") ||
    lowerMessage.includes("εμπιστ")
  ) {
    const tips = KNOWLEDGE_BASE.safetyTips[language];
    const reply = isGreek
      ? `🛡️ **Συμβουλές Ασφαλείας**

${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

✅ **Pro Tip**: Χρησιμοποίησε την πιστοποίηση iRepair για επιπλέον ασφάλεια. Κοστίζει μόνο €10 και επιστρέφεται αν αγοράσεις!`
      : `🛡️ **Safety Tips**

${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

✅ **Pro Tip**: Use iRepair verification for extra safety. It's only €10 and refundable if you buy!`;

    return {
      reply,
      suggestions: isGreek
        ? ["Πού συναντιέμαι με τον πωλητή;", "Πώς αναγνωρίζω απάτη;", "Τι είναι το iRepair;"]
        : ["Where to meet the seller?", "How to spot a scam?", "What is iRepair?"],
    };
  }

  // iRepair questions
  if (
    lowerMessage.includes("irepair") ||
    lowerMessage.includes("verification") ||
    lowerMessage.includes("πιστοποίηση") ||
    lowerMessage.includes("grading") ||
    lowerMessage.includes("βαθμολόγηση")
  ) {
    const info = KNOWLEDGE_BASE.iRepairInfo;
    const reply = isGreek
      ? `🔧 **iRepair Ρόδος**

**Υπηρεσίες:**
${info.services.map((s) => `• ${s}`).join("\n")}

**Τοποθεσίες:**
${info.locations.map((l) => `📍 ${l.name}: ${l.address}`).join("\n")}

**Διαγνωστικό τέλος:** €${info.diagnosticFee} (επιστρέφεται αν αγοράσεις)

Θέλεις να κλείσεις ραντεβού;`
      : `🔧 **iRepair Rhodes**

**Services:**
${info.services.map((s) => `• ${s}`).join("\n")}

**Locations:**
${info.locations.map((l) => `📍 ${l.name}: ${l.address}`).join("\n")}

**Diagnostic fee:** €${info.diagnosticFee} (refundable if you buy)

Want to book an appointment?`;

    return {
      reply,
      suggestions: isGreek
        ? ["Κλείσε ραντεβού", "Ωράριο λειτουργίας", "Τι ελέγχεται;"]
        : ["Book appointment", "Opening hours", "What gets checked?"],
    };
  }

  // Category recommendations
  if (
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("suggest") ||
    lowerMessage.includes("best") ||
    lowerMessage.includes("προτείνεις") ||
    lowerMessage.includes("καλύτερο") ||
    lowerMessage.includes("budget")
  ) {
    const reply = isGreek
      ? `📱 **Προτάσεις Αγοράς**

**Με budget €100-200:**
• Xiaomi Redmi Note series
• Samsung Galaxy A series (παλαιότερα)

**Με budget €200-400:**
• iPhone 11/12
• Samsung Galaxy S21
• Google Pixel 6

**Με budget €400+:**
• iPhone 13/14
• Samsung Galaxy S22/S23
• Google Pixel 7

💡 Φιλτράρε στην αναζήτηση για να δεις διαθέσιμες συσκευές στην τιμή σου!`
      : `📱 **Buying Recommendations**

**Budget €100-200:**
• Xiaomi Redmi Note series
• Samsung Galaxy A series (older)

**Budget €200-400:**
• iPhone 11/12
• Samsung Galaxy S21
• Google Pixel 6

**Budget €400+:**
• iPhone 13/14
• Samsung Galaxy S22/S23
• Google Pixel 7

💡 Use the search filters to see available devices in your price range!`;

    return {
      reply,
      suggestions: isGreek
        ? ["Δείξε μου iPhones", "Καλά tablets για σχέδιο", "Gaming κινητά"]
        : ["Show me iPhones", "Good tablets for drawing", "Gaming phones"],
    };
  }

  // Selling help
  if (
    lowerMessage.includes("sell") ||
    lowerMessage.includes("πουλ") ||
    lowerMessage.includes("listing") ||
    lowerMessage.includes("αγγελία") ||
    lowerMessage.includes("post")
  ) {
    const reply = isGreek
      ? `📤 **Οδηγός Πώλησης**

**Για να πουλήσεις γρήγορα:**

1️⃣ **Φωτογραφίες**: 3-10 καθαρές φωτο (μπροστά, πίσω, πλαϊνά, οθόνη)
2️⃣ **Τίτλος**: Μάρκα + Μοντέλο + Χωρητικότητα
3️⃣ **Περιγραφή**: Κατάσταση, ελαττώματα, παρελκόμενα
4️⃣ **Τιμή**: Δες το Pandas για σωστή τιμή
5️⃣ **Πιστοποίηση**: Βαθμολόγησε στο iRepair για γρηγορότερη πώληση

Θέλεις να δημιουργήσεις αγγελία τώρα;`
      : `📤 **Selling Guide**

**To sell quickly:**

1️⃣ **Photos**: 3-10 clear photos (front, back, sides, screen)
2️⃣ **Title**: Brand + Model + Storage
3️⃣ **Description**: Condition, defects, accessories included
4️⃣ **Price**: Check Pandas for fair pricing
5️⃣ **Verification**: Get graded at iRepair for faster sales

Want to create a listing now?`;

    return {
      reply,
      suggestions: isGreek
        ? ["Δημιούργησε αγγελία", "Πόσο αξίζει το κινητό μου;", "Tips για φωτογραφίες"]
        : ["Create listing", "How much is my phone worth?", "Photo tips"],
    };
  }

  // Default response
  const reply = isGreek
    ? `👋 Γεια σου! Είμαι ο βοηθός του Mobile Unit.

Μπορώ να σε βοηθήσω με:
• 💰 Τιμολόγηση συσκευών
• 🛍️ Προτάσεις αγοράς
• 📤 Συμβουλές πώλησης
• 🛡️ Ασφάλεια συναλλαγών
• 🔧 Πληροφορίες iRepair

Τι θα ήθελες να μάθεις;`
    : `👋 Hello! I'm the Mobile Unit assistant.

I can help you with:
• 💰 Device pricing
• 🛍️ Buying recommendations
• 📤 Selling tips
• 🛡️ Transaction safety
• 🔧 iRepair information

What would you like to know?`;

  return {
    reply,
    suggestions: isGreek
      ? ["Πώς πουλάω τη συσκευή μου;", "Είναι καλή τιμή;", "Τι να προσέξω όταν αγοράζω;"]
      : ["How do I sell my device?", "Is this a good price?", "What to check when buying?"],
  };
}

// POST /api/assistant/chat
assistantRouter.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        400
      );
    }

    const { message, context, language } = parsed.data;
    const sanitizedMessage = sanitizeText(message, { maxLength: 2000 });

    const response = generateResponse(sanitizedMessage, context, language);

    return c.json({
      reply: response.reply,
      suggestions: response.suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Assistant error:", error);
    return c.json({ error: "Failed to process request" }, 500);
  }
});

// GET /api/assistant/suggestions - Get contextual suggestions
assistantRouter.get("/suggestions", async (c) => {
  const page = c.req.query("page") ?? "home";
  const language = (c.req.query("language") as "el" | "en") ?? "el";
  const isGreek = language === "el";

  const suggestions: Record<string, string[]> = {
    home: isGreek
      ? ["Τι συσκευή να αγοράσω;", "Πώς δουλεύει η εφαρμογή;", "Είναι ασφαλές;"]
      : ["What device should I buy?", "How does the app work?", "Is it safe?"],
    browse: isGreek
      ? ["Βρες μου iPhone κάτω από €300", "Καλύτερα tablets", "Πιστοποιημένες συσκευές"]
      : ["Find iPhone under €300", "Best tablets", "Verified devices"],
    sell: isGreek
      ? ["Πώς βάζω καλές φωτο;", "Ποια τιμή να βάλω;", "Τι είναι η πιστοποίηση;"]
      : ["How to take good photos?", "What price to set?", "What is verification?"],
    listing: isGreek
      ? ["Είναι καλή τιμή;", "Τι να ελέγξω;", "Πώς κλείνω ραντεβού;"]
      : ["Is this a good price?", "What to check?", "How to book appointment?"],
  };

  return c.json({
    suggestions: suggestions[page] ?? suggestions.home,
    page,
  });
});

export { assistantRouter };
