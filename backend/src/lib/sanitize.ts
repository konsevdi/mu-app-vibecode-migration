/**
 * Input sanitization utilities
 * Protects against XSS, injection, and other input-based attacks
 */

/**
 * HTML entity encoding map
 */
const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string for safe database storage and display
 * - Strips HTML tags
 * - Trims whitespace
 * - Normalizes newlines
 * - Limits length
 */
export function sanitizeText(
  str: string,
  options: { maxLength?: number; allowNewlines?: boolean } = {}
): string {
  if (typeof str !== "string") return "";

  const { maxLength = 10000, allowNewlines = true } = options;

  let sanitized = stripHtml(str).trim();

  // Normalize newlines
  if (allowNewlines) {
    sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Limit consecutive newlines to 2
    sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  } else {
    sanitized = sanitized.replace(/[\r\n]+/g, " ");
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize a title/name field
 * - More restrictive than general text
 * - No newlines
 * - Shorter max length
 */
export function sanitizeTitle(str: string, maxLength = 200): string {
  return sanitizeText(str, { maxLength, allowNewlines: false });
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(str: string): string {
  if (typeof str !== "string") return "";
  return str.toLowerCase().trim().substring(0, 254);
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  value: unknown,
  options: { min?: number; max?: number; default?: number } = {}
): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, default: defaultValue = 0 } = options;

  const num = Number(value);
  if (isNaN(num)) return defaultValue;

  return Math.min(Math.max(num, min), max);
}

/**
 * Sanitize URL
 * - Only allows http/https protocols
 * - Validates URL structure
 */
export function sanitizeUrl(str: string): string | null {
  if (typeof str !== "string") return null;

  try {
    const url = new URL(str.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize phone number
 * - Keeps only digits and + prefix
 */
export function sanitizePhone(str: string): string {
  if (typeof str !== "string") return "";

  // Keep only digits and leading +
  const cleaned = str.replace(/[^\d+]/g, "");

  // Ensure + is only at the start
  if (cleaned.includes("+") && !cleaned.startsWith("+")) {
    return cleaned.replace(/\+/g, "");
  }

  return cleaned.substring(0, 20);
}

/**
 * Sanitize a slug (URL-safe identifier)
 */
export function sanitizeSlug(str: string): string {
  if (typeof str !== "string") return "";

  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * Deep sanitize an object
 * Recursively sanitizes all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { maxDepth?: number; currentDepth?: number } = {}
): T {
  const { maxDepth = 10, currentDepth = 0 } = options;

  if (currentDepth >= maxDepth) return obj;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeText(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>, {
              maxDepth,
              currentDepth: currentDepth + 1,
            })
          : item
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, {
        maxDepth,
        currentDepth: currentDepth + 1,
      });
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Detect potential SQL injection patterns
 * Returns true if suspicious patterns are found
 */
export function detectSqlInjection(str: string): boolean {
  if (typeof str !== "string") return false;

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*[=<>])/i,
    /(--|#|\/\*|\*\/)/,
    /(\bSLEEP\s*\()/i,
    /(\bBENCHMARK\s*\()/i,
    /(\bWAITFOR\s+DELAY\b)/i,
  ];

  return patterns.some((pattern) => pattern.test(str));
}

/**
 * Detect potential XSS patterns
 * Returns true if suspicious patterns are found
 */
export function detectXss(str: string): boolean {
  if (typeof str !== "string") return false;

  const patterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /expression\s*\(/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<svg\b[^>]*onload/i,
  ];

  return patterns.some((pattern) => pattern.test(str));
}

/**
 * Validate and sanitize user input
 * Returns sanitized value or throws error if malicious content detected
 */
export function validateAndSanitize(
  str: string,
  fieldName = "input"
): string {
  if (typeof str !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  if (detectSqlInjection(str)) {
    throw new Error(`${fieldName} contains invalid characters`);
  }

  if (detectXss(str)) {
    throw new Error(`${fieldName} contains invalid content`);
  }

  return sanitizeText(str);
}
