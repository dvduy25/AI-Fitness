import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/ui/Feedback";
import { color, font, shadow } from "@/theme/tokens";

export default function TabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isTrainer = user?.role === "trainer";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/(auth)/welcome");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          href: isTrainer ? null : undefined,
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: isTrainer ? undefined : null,
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={21} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Cộng đồng",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Lịch tập",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Dinh dưỡng",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Tiến độ",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={23} color={c} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 22,
    height: 68,
    borderRadius: 26,
    backgroundColor: color.surface,
    borderTopWidth: 0,
    paddingTop: 10,
    paddingBottom: 10,
    ...shadow.float,
  },
  tabItem: { paddingTop: 2 },
  tabLabel: { fontFamily: font.bodyMed, fontSize: 10.5, marginTop: 2 },
});
