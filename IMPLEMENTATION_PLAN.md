# Mobile Unit - Implementation Plan

## Overview
This plan addresses 5 key areas: responsive design, web app readiness, UI/UX review, security hardening, and AI chatbot integration.

---

## 1. RESPONSIVE DESIGN & CROSS-DEVICE RENDERING

### Current Issues Identified
- Font sizes use fixed pixel values (e.g., `text-4xl` = 40px) which may be too large on small phones or too small on tablets/web
- `CARD_WIDTH` uses `Dimensions.get('window').width * 0.75` - works on mobile but may be too wide on tablets/web
- No breakpoint system for web/tablet layouts
- Recent listings grid uses fixed `w-[48%]` - doesn't adapt to larger screens

### Implementation Steps

#### A. Create Responsive Utilities (`src/lib/responsive.ts`)
```typescript
// Responsive breakpoints and utilities
export const breakpoints = {
  sm: 375,   // Small phones
  md: 428,   // Large phones
  lg: 768,   // Tablets
  xl: 1024,  // Desktop/web
};

export function useResponsive() {
  // Returns current breakpoint and scaling functions
}

export function scaledFont(base: number): number {
  // Scale fonts based on screen width
}
```

#### B. Update Key Screens
1. **Home Screen** (`src/app/(tabs)/index.tsx`)
   - Make `CARD_WIDTH` responsive (75% on phones, max 400px on tablets, grid on desktop)
   - Recent listings: 2 columns on phones, 3 on tablets, 4+ on web
   - Font scaling for headers

2. **Browse Screen** (`src/app/(tabs)/browse.tsx`)
   - Responsive grid layout
   - Adaptive filter panel (bottom sheet on mobile, sidebar on web)

3. **Listing Detail** (`src/app/listing/[id].tsx`)
   - Image gallery: full-width on mobile, constrained on web
   - Two-column layout on tablets/web

4. **Onboarding** (`src/app/onboarding.tsx`)
   - Ensure carousel slides are readable on all devices
   - Button sizes adapt to screen

#### C. Web-Specific Components
Create `.web.tsx` variants where needed:
- `src/components/ListingGrid.web.tsx` - Desktop-optimized grid
- Navigation bar for web (desktop users expect top navigation)

---

## 2. WEB APP CONFIGURATION (PWA-READY)

### Current State
- Basic `+html.tsx` exists but missing PWA metadata
- Web build works via `bun run web` but not optimized for "app clip" experience

### Implementation Steps

#### A. Update `+html.tsx` for PWA
```html
<!-- Add to <head> -->
<meta name="theme-color" content="#0a0a0a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Mobile Unit" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<link rel="manifest" href="/manifest.json" />
```

#### B. Create Web App Manifest (`public/manifest.json`)
```json
{
  "name": "Mobile Unit",
  "short_name": "MobileUnit",
  "description": "Buy & sell devices in Greece",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#FF00FF",
  "icons": [...]
}
```

#### C. Testing URLs
- **Web Preview**: https://gkusbdpffsai.dev.vibecode.run
- **Backend API**: https://preview-imvhkajvcuwx.dev.vibecode.run

The app is already accessible at the web preview URL above.

---

## 3. UI/UX REVIEW & IMPROVEMENTS

### Current Design Assessment
**Strengths:**
- Strong neon aesthetic with consistent magenta/lime palette
- Premium animation system with haptics
- Dark-first design (excellent for OLED)
- Bilingual support (EL/EN)

**Issues to Address:**

#### A. Navigation & Information Architecture
- [ ] Tab icons may need labels for accessibility
- [ ] Back navigation not always obvious on web
- [ ] Search/filter UX could be streamlined

#### B. Typography Consistency
- [ ] Greek ALL CAPS can be harder to read - consider mixed case for longer text
- [ ] Line height on cards could be improved
- [ ] Truncation (`numberOfLines={1}`) may cut off important info

#### C. Touch Targets
- [ ] Some buttons (like "ΟΛΑ") are small - minimum 44x44pt recommended
- [ ] Category cards could have larger tap areas

#### D. Loading States
- [ ] "Φόρτωση..." text is basic - add skeleton loaders
- [ ] Empty states could be more engaging

#### E. Accessibility
- [ ] Add `accessibilityLabel` to icons
- [ ] Ensure color contrast meets WCAG AA (3:1 minimum for large text)
- [ ] Test with VoiceOver/TalkBack

#### F. Web-Specific UX
- [ ] Hover states for desktop users
- [ ] Keyboard navigation support
- [ ] Cursor pointer on interactive elements

---

## 4. SECURITY HARDENING

### Current Security (Already Strong)
- Better Auth with session management
- IP tracking on sessions
- CORS with trusted origins
- Fraud scoring system (0-100)
- Chat moderation (link/URL blocking)
- Anti-spam image detection
- Report thresholds (auto-hide)
- Strike system with 90-day decay

### Additional Security Measures

#### A. Backend Hardening
1. **Rate Limiting** (Not Currently Implemented)
   ```typescript
   // Add to backend/src/index.ts
   import { rateLimiter } from 'hono-rate-limiter';

   app.use('/api/*', rateLimiter({
     windowMs: 60000, // 1 minute
     max: 100, // 100 requests per minute
   }));
   ```

2. **Input Sanitization**
   - Already using Zod schemas - good
   - Add HTML sanitization for user-generated content (listings, messages)

3. **SQL Injection Protection**
   - Prisma ORM handles this - good
   - Audit any raw queries

4. **Session Security**
   - Add session expiry (currently no explicit TTL)
   - Consider device fingerprinting
   - Add "log out all devices" feature

#### B. Frontend Security
1. **Secure Storage**
   - Move sensitive data from AsyncStorage to expo-secure-store
   - Auth tokens already handled by Better Auth cookies

2. **Deep Link Validation**
   - Validate referral codes before processing
   - Sanitize URL parameters

3. **Content Security**
   - Image URLs should be validated/proxied
   - Consider image content moderation API

#### C. API Security Checklist
- [ ] All sensitive endpoints require authentication
- [ ] User can only modify their own data (ownership checks)
- [ ] No sensitive data in error messages
- [ ] Audit logging for admin actions

---

## 5. AI CHATBOT / BUYER'S GUIDE

### Concept: "Unit Assistant"
An AI-powered chatbot that helps users:
1. Find the right device (buyer's guide)
2. Price their device for selling
3. Answer questions about the app/process
4. Safety tips and fraud awareness

### Implementation Architecture

#### A. Backend Integration
```
/backend/src/routes/assistant.ts

POST /api/assistant/chat
- Input: { message: string, context?: { listingId?, category? } }
- Output: { reply: string, suggestions?: string[] }
```

#### B. AI Provider Options
1. **OpenAI GPT-4** - Best quality, use via Vibecode API tab
2. **Claude** - Alternative, also available
3. **Local embeddings** - For product matching

#### C. Chatbot Features

**Buyer's Guide Mode:**
- "What phone should I get for €300?"
- "Is this iPhone price fair?"
- "Compare iPhone 13 vs Samsung S22"
- Uses product knowledge + current listings

**Seller Helper Mode:**
- "How much should I price my iPhone 12?"
- "What photos should I take?"
- "Tips for faster sale"

**Safety Assistant:**
- "Is this message suspicious?"
- "What to check when meeting?"
- "How does verification work?"

#### D. UI Integration
1. **Floating Action Button** - Bottom-right chat bubble
2. **Context-aware** - Knows which listing you're viewing
3. **Suggested prompts** - Quick-tap common questions
4. **Bilingual** - Responds in user's language preference

#### E. Implementation Steps
1. Create assistant route in backend
2. Set up OpenAI via Vibecode API tab
3. Build chat UI component
4. Add product knowledge base (categories, pricing, tips)
5. Integrate with listing pages for context

---

## Priority Order

### Phase 1 (Critical - Do First)
1. Fix responsive font scaling
2. Test web app at provided URL
3. Add PWA metadata

### Phase 2 (Important)
4. Rate limiting on backend
5. UI/UX quick wins (touch targets, loading states)
6. Accessibility labels

### Phase 3 (Enhancement)
7. AI Assistant backend setup
8. Chat UI component
9. Buyer's guide knowledge base

### Phase 4 (Polish)
10. Web-specific layouts
11. Advanced security features
12. Full AI integration with context awareness

---

## Testing URLs

| Environment | URL |
|-------------|-----|
| Web App | https://gkusbdpffsai.dev.vibecode.run |
| Backend API | https://preview-imvhkajvcuwx.dev.vibecode.run |
| Health Check | https://preview-imvhkajvcuwx.dev.vibecode.run/health |

---

## Notes
- The app is already running and accessible
- Backend has robust security foundations
- AI integration requires setting up API keys in Vibecode's API tab
- Web version works but needs PWA metadata for "app clip" experience
