import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0, // for Android
          // You can also add a subtle gradient background here if text is hard to read over videos!
        },
      }}>
      
      {/* 
        TAB 1: The main feed (What you see when the app opens) 
        You can change 'name' to the actual filename (e.g., 'home' if the file is home.tsx)
      */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      
      {/* 
        TAB 2: Your second feature 
        Example alternative: Search, Discover, or a Map view
      */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />

      {/* 
        TAB 3: The middle action button 
        This is often a "Create" or "Add" button right in the center.
        For now, this links to 'add' which we will need to create (add.tsx)
      */}
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.app" color={color} />,
        }}
      />

      {/* 
        TAB 4: Notifications or Messages 
        For now, this links to 'inbox' which we will need to create (inbox.tsx)
      */}
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="envelope.fill" color={color} />,
        }}
      />

      {/* 
        TAB 5: User Settings / Profile
        For now, this links to 'profile' which we will need to create (profile.tsx)
      */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
