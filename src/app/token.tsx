import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  QrCode,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

const { width } = Dimensions.get("window");
const QR_SIZE = width * 0.6;

// Token rotation every 60 seconds
const TOKEN_ROTATION_INTERVAL = 60;

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function TokenScreen() {
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type?: string; id?: string }>();

  const [code, setCode] = useState(generateCode());
  const [timeLeft, setTimeLeft] = useState(TOKEN_ROTATION_INTERVAL);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);

  // Animation values
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const codeScale = useSharedValue(1);

  // Start animations
  useEffect(() => {
    // QR rotation animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse animation
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Rotate code
          const newCode = generateCode();
          setCode(newCode);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Animate code change
          codeScale.value = withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(1.1, { duration: 150 }),
            withTiming(1, { duration: 100 })
          );

          return TOKEN_ROTATION_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const qrAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const codeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: codeScale.value }],
  }));

  // Token type label
  const tokenTypeLabel = type === "appointment"
    ? "ΡΑΝΤΕΒΟΥ / APPOINTMENT"
    : type === "reservation"
    ? "ΚΡΑΤΗΣΗ / RESERVATION"
    : "CHECK-IN TOKEN";

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen
        options={{
          title: "TOKEN",
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["bottom"]} className="flex-1 items-center justify-center px-8">
          {/* Token Type */}
          <View className="mb-6 rounded-full bg-fuchsia-500/20 px-4 py-2" style={{ borderWidth: 1, borderColor: "#FF00FF" }}>
            <Text className="text-sm font-bold text-fuchsia-400">{tokenTypeLabel}</Text>
          </View>

          {/* QR Code Container */}
          <Animated.View style={[qrAnimatedStyle]}>
            <View
              className="mb-8 items-center justify-center rounded-3xl"
              style={{
                width: QR_SIZE + 40,
                height: QR_SIZE + 40,
                backgroundColor: "#1a1a2e",
                borderWidth: 3,
                borderColor: isValid ? "#00FF88" : "#FF6B6B",
              }}
            >
              {/* Simulated QR Code Pattern */}
              <View
                className="items-center justify-center rounded-2xl bg-white"
                style={{ width: QR_SIZE, height: QR_SIZE }}
              >
                <View className="flex-row flex-wrap" style={{ width: QR_SIZE - 40, height: QR_SIZE - 40 }}>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: (QR_SIZE - 40) / 8,
                        height: (QR_SIZE - 40) / 8,
                        backgroundColor: Math.random() > 0.5 ? "#000" : "#fff",
                      }}
                    />
                  ))}
                </View>
                {/* Center Logo */}
                <View className="absolute items-center justify-center rounded-xl bg-black p-3">
                  <QrCode size={28} color="#FF00FF" />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* 6-Digit Code */}
          <Pressable onPress={handleCopyCode}>
            <Animated.View
              style={[codeAnimatedStyle, { backgroundColor: "#00FF8820", borderWidth: 2, borderColor: "#00FF88" }]}
              className="mb-4 flex-row items-center rounded-2xl px-8 py-4"
            >
              <Text className="text-4xl font-black tracking-[8px] text-emerald-400">
                {code}
              </Text>
              <View className="ml-4">
                {copied ? (
                  <CheckCircle size={24} color="#00FF88" />
                ) : (
                  <Copy size={24} color="#00FF88" />
                )}
              </View>
            </Animated.View>
          </Pressable>
          <Text className="mb-8 text-sm text-gray-400">
            {copied ? "ΑΝΤΙΓΡΑΦΗΚΕ! / COPIED!" : "ΠΑΤΗΣΕ ΓΙΑ ΑΝΤΙΓΡΑΦΗ / TAP TO COPY"}
          </Text>

          {/* Timer */}
          <View className="mb-8 flex-row items-center">
            <View className="mr-3 rounded-full bg-amber-500/20 p-3" style={{ borderWidth: 1, borderColor: "#FFD700" }}>
              <Clock size={24} color="#FFD700" />
            </View>
            <View>
              <Text className="text-xs font-bold uppercase text-gray-500">ΑΝΑΝΕΩΣΗ ΣΕ / REFRESH IN</Text>
              <Text className="text-2xl font-black text-amber-400">{formatTime(timeLeft)}</Text>
            </View>
          </View>

          {/* Rotation Indicator */}
          <View className="flex-row items-center rounded-full bg-gray-800 px-4 py-2">
            <RefreshCw size={16} color="#888" />
            <Text className="ml-2 text-xs text-gray-400">
              Ο κωδικος αλλαζει καθε 60 δευτερολεπτα / Code rotates every 60 seconds
            </Text>
          </View>

          {/* Status */}
          <View className="mt-8 flex-row items-center">
            {isValid ? (
              <>
                <CheckCircle size={20} color="#00FF88" />
                <Text className="ml-2 text-base font-bold text-emerald-400">
                  ΕΝΕΡΓΟ / ACTIVE
                </Text>
              </>
            ) : (
              <>
                <AlertTriangle size={20} color="#FF6B6B" />
                <Text className="ml-2 text-base font-bold text-red-400">
                  ΛΗΓΜΕΝΟ / EXPIRED
                </Text>
              </>
            )}
          </View>

          {/* Instructions */}
          <View className="mt-8 w-full rounded-xl bg-gray-900 p-4">
            <Text className="text-center text-sm text-gray-400">
              Δειξε αυτον τον κωδικα στο προσωπικο του καταστηματος για επιβεβαιωση.
            </Text>
            <Text className="mt-2 text-center text-xs text-gray-500">
              Show this code to store staff for verification.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
