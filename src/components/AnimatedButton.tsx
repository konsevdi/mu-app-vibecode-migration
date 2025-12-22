/**
 * Premium Animated Button
 *
 * Features:
 * - Scale press animation with subtle spring
 * - Haptic feedback
 * - Loading state with morphing width
 * - Respects Reduce Motion
 */

import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronRight } from "lucide-react-native";
import { SPRING_RESPONSIVE, useReduceMotion } from "@/lib/animations";

interface AnimatedButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  showChevron?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  showChevron = false,
  style,
}: AnimatedButtonProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion && !disabled) {
      scale.value = withSpring(0.97, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, disabled, scale]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(1, SPRING_RESPONSIVE);
    }
  }, [reduceMotion, scale]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, loading, onPress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(
        scale.value,
        [0.97, 1],
        [0.9, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  const gradientColors: [string, string] = isPrimary
    ? ["#00FF88", "#00CC6A"]
    : isSecondary
      ? ["#1a1a2e", "#16213e"]
      : ["transparent", "transparent"];

  const borderColor = isPrimary
    ? "#00FF88"
    : isSecondary
      ? "#333"
      : "transparent";

  const textColor = isPrimary ? "#000" : isSecondary ? "#fff" : "#999";

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        styles.container,
        { borderColor, opacity: disabled ? 0.5 : 1 },
        isGhost && styles.ghost,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={[styles.gradient, isGhost && styles.ghostGradient]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                { color: textColor },
                isPrimary && styles.labelPrimary,
                icon ? { marginLeft: 8 } : undefined,
              ]}
            >
              {label}
            </Text>
            {showChevron && (
              <ChevronRight size={24} color={textColor} style={{ marginLeft: 8 }} />
            )}
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  ghost: {
    borderWidth: 0,
  },
  ghostGradient: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  labelPrimary: {
    fontSize: 18,
    fontWeight: "900",
  },
});
