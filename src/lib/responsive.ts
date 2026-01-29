import { Dimensions, Platform, PixelRatio } from "react-native";
import { useEffect, useState } from "react";

// Breakpoints for responsive design
export const breakpoints = {
  xs: 320, // Very small phones
  sm: 375, // Small phones (iPhone SE)
  md: 428, // Large phones (iPhone Pro Max)
  lg: 768, // Tablets
  xl: 1024, // Desktop/web
  xxl: 1440, // Large desktop
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Get initial dimensions
const { width: initialWidth, height: initialHeight } = Dimensions.get("window");

// Base design width (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Hook to track window dimensions changes
 */
export function useDimensions() {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription.remove();
  }, []);

  return dimensions;
}

/**
 * Get current breakpoint based on screen width
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width < breakpoints.sm) return "xs";
  if (width < breakpoints.md) return "sm";
  if (width < breakpoints.lg) return "md";
  if (width < breakpoints.xl) return "lg";
  if (width < breakpoints.xxl) return "xl";
  return "xxl";
}

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useDimensions();
  return getBreakpoint(width);
}

/**
 * Check if current screen is at least a certain breakpoint
 */
export function useMinBreakpoint(minBreakpoint: Breakpoint): boolean {
  const { width } = useDimensions();
  return width >= breakpoints[minBreakpoint];
}

/**
 * Scale a value based on screen width
 * Useful for maintaining proportions across devices
 */
export function scale(size: number): number {
  const { width } = Dimensions.get("window");
  const scaleFactor = width / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scaleFactor));
}

/**
 * Scale a value vertically based on screen height
 */
export function verticalScale(size: number): number {
  const { height } = Dimensions.get("window");
  const scaleFactor = height / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scaleFactor));
}

/**
 * Moderate scaling - less aggressive than scale()
 * Good for fonts and paddings that shouldn't scale too dramatically
 */
export function moderateScale(size: number, factor = 0.5): number {
  const { width } = Dimensions.get("window");
  const scaleFactor = width / BASE_WIDTH;
  return Math.round(
    PixelRatio.roundToNearestPixel(size + (scaleFactor - 1) * size * factor)
  );
}

/**
 * Hook for responsive values based on breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>> & { default: T }): T {
  const breakpoint = useBreakpoint();

  // Find the appropriate value for current breakpoint
  const breakpointOrder: Breakpoint[] = ["xxl", "xl", "lg", "md", "sm", "xs"];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }

  return values.default;
}

/**
 * Get responsive font size
 * Scales fonts appropriately for different devices
 */
export function responsiveFontSize(baseFontSize: number): number {
  const { width } = Dimensions.get("window");

  // Don't scale fonts too much on web/tablets
  if (width >= breakpoints.xl) {
    return baseFontSize; // Keep original on desktop
  }

  if (width >= breakpoints.lg) {
    return Math.round(baseFontSize * 1.1); // Slightly larger on tablets
  }

  // Mobile scaling
  return moderateScale(baseFontSize, 0.3);
}

/**
 * Get responsive card width for horizontal scrolling lists
 */
export function getCardWidth(percentage: number = 0.75): number {
  const { width } = Dimensions.get("window");
  const breakpoint = getBreakpoint(width);

  switch (breakpoint) {
    case "xs":
    case "sm":
      return Math.min(width * percentage, 320);
    case "md":
      return Math.min(width * percentage, 360);
    case "lg":
      return Math.min(width * 0.45, 400); // Two cards visible on tablets
    case "xl":
    case "xxl":
      return Math.min(width * 0.3, 380); // Multiple cards on desktop
    default:
      return width * percentage;
  }
}

/**
 * Get number of columns for grid layouts
 */
export function getGridColumns(baseColumns: number = 2): number {
  const { width } = Dimensions.get("window");
  const breakpoint = getBreakpoint(width);

  switch (breakpoint) {
    case "xs":
    case "sm":
      return baseColumns;
    case "md":
      return baseColumns;
    case "lg":
      return Math.min(baseColumns + 1, 4);
    case "xl":
      return Math.min(baseColumns + 2, 5);
    case "xxl":
      return Math.min(baseColumns + 3, 6);
    default:
      return baseColumns;
  }
}

/**
 * Hook for grid columns
 */
export function useGridColumns(baseColumns: number = 2): number {
  const { width } = useDimensions();
  const breakpoint = getBreakpoint(width);

  switch (breakpoint) {
    case "xs":
    case "sm":
      return baseColumns;
    case "md":
      return baseColumns;
    case "lg":
      return Math.min(baseColumns + 1, 4);
    case "xl":
      return Math.min(baseColumns + 2, 5);
    case "xxl":
      return Math.min(baseColumns + 3, 6);
    default:
      return baseColumns;
  }
}

/**
 * Get responsive padding/margin
 */
export function getResponsivePadding(): number {
  const { width } = Dimensions.get("window");
  const breakpoint = getBreakpoint(width);

  switch (breakpoint) {
    case "xs":
      return 12;
    case "sm":
      return 16;
    case "md":
      return 20;
    case "lg":
      return 24;
    case "xl":
    case "xxl":
      return 32;
    default:
      return 20;
  }
}

/**
 * Check if running on web platform
 */
export const isWeb = Platform.OS === "web";

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === "ios";

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === "android";

/**
 * Get maximum content width for web layouts
 * Prevents content from stretching too wide on large screens
 */
export function getMaxContentWidth(): number | undefined {
  if (!isWeb) return undefined;

  const { width } = Dimensions.get("window");
  if (width >= breakpoints.xxl) return 1200;
  if (width >= breakpoints.xl) return 1024;
  return undefined;
}

/**
 * Hook for maximum content width
 */
export function useMaxContentWidth(): number | undefined {
  const { width } = useDimensions();

  if (!isWeb) return undefined;

  if (width >= breakpoints.xxl) return 1200;
  if (width >= breakpoints.xl) return 1024;
  return undefined;
}
