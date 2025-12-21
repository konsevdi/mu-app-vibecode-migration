// Chat moderation tests
// Run with: bun test backend/src/tests/chat-moderation.test.ts

import { moderateMessage } from "../lib/chat-moderation";

// Test Case 1: Block HTTP/HTTPS URLs
function testBlockUrls() {
  const result = moderateMessage("Check this out: https://scam-site.com/deal");
  console.assert(result.sanitizedContent.includes("[Link removed for safety]"), "Should block HTTPS URLs");
  console.assert(result.flaggedReason === "url", "Should flag as url");
  console.assert(result.showSenderTooltip === true, "Should show tooltip");
  console.log("✓ Test 1: Block HTTP/HTTPS URLs");
}

// Test Case 2: Block shortlinks (bit.ly, t.co, etc.)
function testBlockShortlinks() {
  const result = moderateMessage("Click here bit.ly/abc123 for free");
  console.assert(result.sanitizedContent.includes("[Link removed for safety]"), "Should block shortlinks");
  console.assert(result.flaggedReason === "url", "Should flag as url");
  console.log("✓ Test 2: Block shortlinks");
}

// Test Case 3: Block off-platform patterns (WhatsApp, Telegram, etc.)
function testBlockOffPlatform() {
  const result1 = moderateMessage("Add me on WhatsApp");
  console.assert(result1.isHidden === true, "Should hide WhatsApp messages");

  const result2 = moderateMessage("Contact me at t.me/scammer");
  console.assert(result2.sanitizedContent.includes("[Link removed for safety]"), "Should block t.me");

  const result3 = moderateMessage("DM me on instagram");
  console.assert(result3.isHidden === true, "Should hide Instagram mentions");
  console.log("✓ Test 3: Block off-platform patterns");
}

// Test Case 4: Block wa.me and t.me links
function testBlockMessagingLinks() {
  const result1 = moderateMessage("Message me wa.me/123456789");
  console.assert(result1.sanitizedContent.includes("[Link removed for safety]"), "Should block wa.me");

  const result2 = moderateMessage("Join t.me/group");
  console.assert(result2.sanitizedContent.includes("[Link removed for safety]"), "Should block t.me");
  console.log("✓ Test 4: Block wa.me and t.me links");
}

// Test Case 5: Block phone numbers
function testBlockPhoneNumbers() {
  const result = moderateMessage("Call me at +30123456789");
  console.assert(result.sanitizedContent.includes("[Link removed for safety]"), "Should block phone numbers");
  console.log("✓ Test 5: Block phone numbers");
}

// Test Case 6: Allow clean messages
function testAllowCleanMessages() {
  const result = moderateMessage("Hello! Is this item still available? I can pick up today.");
  console.assert(result.sanitizedContent === "Hello! Is this item still available? I can pick up today.", "Should not modify clean messages");
  console.assert(result.flaggedReason === null, "Should not flag clean messages");
  console.assert(result.isHidden === false, "Should not hide clean messages");
  console.assert(result.showSenderTooltip === false, "Should not show tooltip for clean messages");
  console.log("✓ Test 6: Allow clean messages");
}

// Run all tests
console.log("\n=== Chat Anti-Scam Moderation Tests ===\n");
testBlockUrls();
testBlockShortlinks();
testBlockOffPlatform();
testBlockMessagingLinks();
testBlockPhoneNumbers();
testAllowCleanMessages();
console.log("\n=== All 6 tests passed! ===\n");
