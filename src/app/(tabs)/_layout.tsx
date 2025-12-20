import React from "react";
import { Tabs } from "expo-router";
import { Home, Search, PlusCircle, User } from "lucide-react-native";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#06B6D4",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: "#0F172A",
        },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-70"}>
              <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-70"}>
              <Search size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-70"}>
              <PlusCircle size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "opacity-100" : "opacity-70"}>
              <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
