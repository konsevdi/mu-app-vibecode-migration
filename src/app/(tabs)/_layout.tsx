import React from "react";
import { Tabs } from "expo-router";
import { Home, Search, PlusCircle, User } from "lucide-react-native";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF00FF",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#FF00FF",
          borderTopWidth: 2,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 4,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        headerStyle: {
          backgroundColor: "#0a0a0a",
        },
        headerTintColor: "#FF00FF",
        headerTitleStyle: {
          fontWeight: "800",
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Αρχική",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-60"}>
              <Home size={26} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Αναζήτηση",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-60"}>
              <Search size={26} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Πώληση",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-60"}>
              <PlusCircle size={26} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Προφίλ",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-60"}>
              <User size={26} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
