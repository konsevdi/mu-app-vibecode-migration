/**
 * Premium Animation System
 *
 * Apple-level motion design principles:
 * - 60fps target
 * - Consistent easing with cubic-bezier(0.2, 0.8, 0.2, 1) for premium feel
 * - Spring physics only for micro-interactions, not page transitions
 * - Respect Reduce Motion accessibility setting
 */

import { AccessibilityInfo } from "react-native";
import {
  withTiming,
  withSpring,
  withDelay,
  Easing,
  WithTimingConfig,
  WithSpringConfig,
  runOnJS,
} from "react-native-reanimated";
import { useEffect, useState } from "react";

// ============================================================================
// TIMING SYSTEM
// ============================================================================

export const TIMING = {
  /** Micro interactions: tap, hover, press (90-140ms) */
  micro: 120,
  /** Small element enters: icons, text (180-240ms) */
  small: 200,
  /** Medium transitions: cards, sections (260-320ms) */
  medium: 280,
  /** Page transitions (320-420ms) */
  page: 360,
  /** Stagger delay between elements (40-70ms) */
  stagger: 50,
} as const;

// ============================================================================
// EASING CURVES
// ============================================================================

/** Premium easeInOut - default for most animations */
export const EASE_PREMIUM = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Slightly faster ease for enters */
export const EASE_OUT = Easing.bezier(0.0, 0.0, 0.2, 1);

/** Ease for exits */
export const EASE_IN = Easing.bezier(0.4, 0.0, 1, 1);

// ============================================================================
// SPRING CONFIGS (for micro-interactions only)
// ============================================================================

/** Subtle spring for buttons, toggles - no overshoot */
export const SPRING_SUBTLE: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
  overshootClamping: true,
};

/** Responsive spring for quick feedback */
export const SPRING_RESPONSIVE: WithSpringConfig = {
  damping: 25,
  stiffness: 400,
  mass: 0.5,
  overshootClamping: true,
};

// ============================================================================
// TIMING CONFIGS
// ============================================================================

export const TIMING_MICRO: WithTimingConfig = {
  duration: TIMING.micro,
  easing: EASE_PREMIUM,
};

export const TIMING_SMALL: WithTimingConfig = {
  duration: TIMING.small,
  easing: EASE_OUT,
};

export const TIMING_MEDIUM: WithTimingConfig = {
  duration: TIMING.medium,
  easing: EASE_PREMIUM,
};

export const TIMING_PAGE: WithTimingConfig = {
  duration: TIMING.page,
  easing: EASE_PREMIUM,
};

// ============================================================================
// REDUCE MOTION HOOK
// ============================================================================

/**
 * Hook to check if Reduce Motion is enabled
 * Returns true if user prefers reduced motion
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial value
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Premium fade + rise animation values
 * Use with useAnimatedStyle
 */
export function createFadeRiseValues(
  animatedValue: { value: number },
  options: {
    translateY?: number;
    duration?: number;
    delay?: number;
    reduceMotion?: boolean;
  } = {}
) {
  const {
    translateY = 12,
    duration = TIMING.small,
    delay = 0,
    reduceMotion = false,
  } = options;

  if (reduceMotion) {
    // Simple fade only for reduced motion
    return {
      opacity: withDelay(
        delay,
        withTiming(1, { duration: duration * 0.6, easing: EASE_OUT })
      ),
      transform: [{ translateY: 0 }],
    };
  }

  return {
    opacity: withDelay(delay, withTiming(1, { duration, easing: EASE_OUT })),
    transform: [
      {
        translateY: withDelay(
          delay,
          withTiming(0, { duration, easing: EASE_OUT })
        ),
      },
    ],
  };
}

/**
 * Premium scale press animation for buttons
 */
export function createPressAnimation(
  pressed: boolean,
  reduceMotion: boolean = false
) {
  if (reduceMotion) {
    return { transform: [{ scale: 1 }] };
  }

  return {
    transform: [
      {
        scale: withSpring(pressed ? 0.97 : 1, SPRING_RESPONSIVE),
      },
    ],
  };
}

/**
 * Dot indicator animation for carousel
 */
export function createDotWidth(
  isActive: boolean,
  reduceMotion: boolean = false
) {
  if (reduceMotion) {
    return isActive ? 24 : 8;
  }

  return withTiming(isActive ? 24 : 8, TIMING_MICRO);
}

// ============================================================================
// STAGGER DELAY CALCULATOR
// ============================================================================

/**
 * Calculate stagger delay for element at index
 */
export function getStaggerDelay(index: number, baseDelay: number = 0): number {
  return baseDelay + index * TIMING.stagger;
}

// ============================================================================
// ANIMATION PRESETS FOR ENTERING
// ============================================================================

export const ENTER_FADE_RISE = {
  initialValues: {
    opacity: 0,
    transform: [{ translateY: 12 }],
  },
  animations: {
    opacity: withTiming(1, TIMING_SMALL),
    transform: [{ translateY: withTiming(0, TIMING_SMALL) }],
  },
};

export const ENTER_FADE_RISE_DELAYED = (delay: number) => ({
  initialValues: {
    opacity: 0,
    transform: [{ translateY: 12 }],
  },
  animations: {
    opacity: withDelay(delay, withTiming(1, TIMING_SMALL)),
    transform: [{ translateY: withDelay(delay, withTiming(0, TIMING_SMALL)) }],
  },
});

export const ENTER_SCALE_FADE = {
  initialValues: {
    opacity: 0,
    transform: [{ scale: 0.96 }],
  },
  animations: {
    opacity: withTiming(1, TIMING_SMALL),
    transform: [{ scale: withTiming(1, TIMING_SMALL) }],
  },
};

export const ENTER_FADE = {
  initialValues: {
    opacity: 0,
  },
  animations: {
    opacity: withTiming(1, TIMING_SMALL),
  },
};

// ============================================================================
// REDUCED MOTION PRESETS
// ============================================================================

export const ENTER_FADE_ONLY = {
  initialValues: {
    opacity: 0,
  },
  animations: {
    opacity: withTiming(1, { duration: TIMING.micro, easing: EASE_OUT }),
  },
};

export const ENTER_FADE_ONLY_DELAYED = (delay: number) => ({
  initialValues: {
    opacity: 0,
  },
  animations: {
    opacity: withDelay(
      delay,
      withTiming(1, { duration: TIMING.micro, easing: EASE_OUT })
    ),
  },
});
