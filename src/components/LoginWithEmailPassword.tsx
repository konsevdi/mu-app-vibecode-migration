import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Smartphone, X, Zap } from "lucide-react-native";

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
      Alert.alert("Σφάλμα", "Συμπλήρωσε email και κωδικό");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        Alert.alert("Αποτυχία Σύνδεσης", result.error.message || "Έλεγξε τα στοιχεία σου");
      } else {
        setEmail("");
        setPassword("");
        router.back();
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Παρουσιάστηκε απρόσμενο σφάλμα");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert("Σφάλμα", "Συμπλήρωσε όλα τα πεδία");
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
        Alert.alert("Αποτυχία Εγγραφής", result.error.message || "Προσπάθησε ξανά");
      } else {
        setEmail("");
        setPassword("");
        setName("");
        router.back();
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Παρουσιάστηκε απρόσμενο σφάλμα");
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
      Alert.alert("Σφάλμα", "Αποτυχία αποσύνδεσης");
      console.error(error);
    }
  };

  // If user is already logged in, show sign out button
  if (session) {
    return (
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <SafeAreaView edges={["top"]} className="flex-1">
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-2xl font-black text-white">Λογαριασμός</Text>
            <Pressable onPress={() => router.back()} className="rounded-full bg-gray-800 p-2">
              <X size={24} color="#FF00FF" />
            </Pressable>
          </View>
          <View className="flex-1 justify-center px-6">
            <View className="overflow-hidden rounded-3xl" style={{ borderWidth: 2, borderColor: "#FF00FF" }}>
              <LinearGradient
                colors={["#1a1a2e", "#0f0f23"]}
                style={{ padding: 24 }}
              >
                <Text className="text-xl font-black text-white">Συνδεδεμένος ως:</Text>
                <Text className="mt-3 text-lg font-bold text-fuchsia-400">{session.user.name}</Text>
                <Text className="text-base font-medium text-gray-400">{session.user.email}</Text>
              </LinearGradient>
            </View>
            <Pressable
              onPress={handleSignOut}
              className="mt-6 items-center overflow-hidden rounded-2xl py-4"
              style={{ backgroundColor: "#FF6B6B20", borderWidth: 2, borderColor: "#FF6B6B" }}
            >
              <Text className="text-lg font-black uppercase text-red-400">Αποσύνδεση</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <View />
          <Pressable onPress={() => router.back()} className="rounded-full bg-gray-800 p-2">
            <X size={24} color="#FF00FF" />
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
        >
          {/* Logo & Title */}
          <View className="mb-10 items-center">
            <View className="mb-5 rounded-3xl p-6" style={{ backgroundColor: "#FF00FF20", borderWidth: 2, borderColor: "#FF00FF" }}>
              <Zap size={56} color="#FF00FF" fill="#FF00FF" />
            </View>
            <Text className="text-4xl font-black text-white">Mobile Unit</Text>
            <Text className="mt-3 text-center text-lg font-semibold text-gray-400">
              {isSignUp ? "Δημιούργησε λογαριασμό" : "Συνδέσου για να συνεχίσεις"}
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            {isSignUp && (
              <View className="mb-4">
                <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">Όνομα</Text>
                <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                  <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Εισήγαγε το όνομά σου"
                      placeholderTextColor="#666"
                      className="px-4 py-4 text-base font-semibold text-white"
                      autoCapitalize="words"
                      editable={!isLoading}
                    />
                  </LinearGradient>
                </View>
              </View>
            )}

            <View className="mb-4">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">Email</Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Εισήγαγε το email σου"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="px-4 py-4 text-base font-semibold text-white"
                    editable={!isLoading}
                  />
                </LinearGradient>
              </View>
            </View>

            <View className="mb-6">
              <Text className="mb-2 text-base font-bold uppercase tracking-wider text-white">Κωδικός</Text>
              <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: "#333" }}>
                <LinearGradient colors={["#1a1a2e", "#0f0f23"]}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Εισήγαγε τον κωδικό σου"
                    placeholderTextColor="#666"
                    secureTextEntry
                    className="px-4 py-4 text-base font-semibold text-white"
                    editable={!isLoading}
                  />
                </LinearGradient>
              </View>
            </View>

            <Pressable
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
              className="overflow-hidden rounded-2xl"
              style={{ borderWidth: 2, borderColor: isLoading ? "#666" : "#FF00FF" }}
            >
              <LinearGradient
                colors={isLoading ? ["#333", "#222"] : ["#FF00FF", "#CC00CC"]}
                style={{ alignItems: "center", paddingVertical: 18 }}
              >
                <Text className="text-xl font-black uppercase text-white">
                  {isLoading ? "Φόρτωση..." : isSignUp ? "Δημιουργία Λογαριασμού" : "Σύνδεση"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Toggle Sign Up / Sign In */}
          <Pressable
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="items-center py-4"
          >
            <Text className="text-base text-gray-400">
              {isSignUp ? "Έχεις ήδη λογαριασμό; " : "Δεν έχεις λογαριασμό; "}
              <Text className="font-black uppercase text-fuchsia-400">
                {isSignUp ? "Σύνδεση" : "Εγγραφή"}
              </Text>
            </Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
