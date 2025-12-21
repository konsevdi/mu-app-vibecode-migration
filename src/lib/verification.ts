// V1: Configurable label for white-label support
export const VERIFICATION_LABEL = "iRepair";

// Helper to check if listing is verified (has grade + checklist)
export const isListingVerified = (listing: { grade?: string | null; checklistComplete?: boolean }) =>
  listing.grade && listing.checklistComplete;

// Helper to check if user is verified (2+ trust events)
export const isUserVerified = (trustEventCount: number) => trustEventCount >= 2;

export const gradeLabels: Record<string, { label: string; color: string }> = {
  A: { label: "ΑΡΙΣΤΗ", color: "#00FF88" },
  B: { label: "ΚΑΛΗ", color: "#00BFFF" },
  C: { label: "ΜΕΤΡΙΑ", color: "#FFD700" },
  D: { label: "ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ", color: "#FF6B6B" },
};
