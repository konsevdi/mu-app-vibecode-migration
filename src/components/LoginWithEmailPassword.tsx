import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Smartphone, X } from "lucide-react-native";

import { authClient } from "@/lib/authClient";
import { useSession } from "@/lib/useSession";

export default function LoginWithEmailPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        Alert.alert("Sign In Failed", result.error.message || "Please check your credentials");
      } else {
        setEmail("");
        setPassword("");
        router.back();
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        Alert.alert("Sign Up Failed", result.error.message || "Please try again");
      } else {
        setEmail("");
        setPassword("");
        setName("");
        router.back();
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
      console.error(error);
    }
  };

  // If user is already logged in, show sign out button
  if (session) {
    return (
      <View className="flex-1 bg-slate-900">
        <SafeAreaView edges={["top"]} className="flex-1">
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-xl font-bold text-white">Account</Text>
            <Pressable onPress={() => router.back()}>
              <X size={24} color="#94A3B8" />
            </Pressable>
          </View>
          <View className="flex-1 justify-center px-6">
            <View className="rounded-2xl bg-slate-800 p-6">
              <Text className="text-lg font-semibold text-white">Signed in as:</Text>
              <Text className="mt-2 text-base text-white">{session.user.name}</Text>
              <Text className="text-sm text-slate-400">{session.user.email}</Text>
            </View>
            <Pressable
              onPress={handleSignOut}
              className="mt-6 items-center rounded-xl bg-red-500/20 py-4"
            >
              <Text className="font-semibold text-red-500">Sign Out</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#0F172A"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <View />
          <Pressable onPress={() => router.back()}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
        >
          {/* Logo & Title */}
          <View className="mb-8 items-center">
            <View className="mb-4 rounded-2xl bg-cyan-500/20 p-4">
              <Smartphone size={48} color="#06B6D4" />
            </View>
            <Text className="text-3xl font-bold text-white">Mobile Unit</Text>
            <Text className="mt-2 text-center text-slate-400">
              {isSignUp ? "Create your account" : "Sign in to continue"}
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            {isSignUp && (
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-slate-300">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#64748B"
                  className="rounded-xl bg-slate-800 px-4 py-4 text-base text-white"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-300">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-xl bg-slate-800 px-4 py-4 text-base text-white"
                editable={!isLoading}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-slate-300">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                secureTextEntry
                className="rounded-xl bg-slate-800 px-4 py-4 text-base text-white"
                editable={!isLoading}
              />
            </View>

            <Pressable
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
              className={`items-center rounded-xl py-4 ${
                isLoading ? "bg-cyan-700" : "bg-cyan-500"
              }`}
            >
              <Text className="text-lg font-bold text-white">
                {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
              </Text>
            </Pressable>
          </View>

          {/* Toggle Sign Up / Sign In */}
          <Pressable
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="items-center py-4"
          >
            <Text className="text-slate-400">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <Text className="font-semibold text-cyan-400">
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
