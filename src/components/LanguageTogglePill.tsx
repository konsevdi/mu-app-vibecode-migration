/**
 * Premium Language Toggle Pill
 *
 * A small floating segmented control for language selection.
 * Features:
 * - Animated sliding indicator
 * - Haptic feedback
 * - Respects Reduce Motion
 */

import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useLanguageStore, type Language } from "@/lib/languageStore";
import { useReduceMotion, TIMING, EASE_PREMIUM } from "@/lib/animations";

export function LanguageTogglePill() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const reduceMotion = useReduceMotion();

  // Animated position for the sliding indicator
  const indicatorPosition = useSharedValue(language === "el" ? 0 : 1);

  const handleToggle = (lang: Language) => {
    if (lang !== language) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLanguage(lang);

      // Animate indicator
      indicatorPosition.value = withTiming(lang === "el" ? 0 : 1, {
        duration: reduceMotion ? 0 : TIMING.micro,
        easing: EASE_PREMIUM,
      });
    }
  };

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: indicatorPosition.value * 32,
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Sliding indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {/* EL Button */}
      <Pressable
        onPress={() => handleToggle("el")}
        style={styles.button}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text
          style={[
            styles.text,
            language === "el" ? styles.textActive : styles.textInactive,
          ]}
        >
          EL
        </Text>
      </Pressable>

      {/* Separator */}
      <View style={styles.separator} />

      {/* EN Button */}
      <Pressable
        onPress={() => handleToggle("en")}
        style={styles.button}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text
          style={[
            styles.text,
            language === "en" ? styles.textActive : styles.textInactive,
          ]}
        >
          EN
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 46, 0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    width: 32,
    backgroundColor: "#FF00FF",
    borderRadius: 16,
  },
  button: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: "transparent",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  textActive: {
    color: "#FFFFFF",
  },
  textInactive: {
    color: "#666666",
  },
});
