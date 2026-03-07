import { Tabs, router, usePathname } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

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
        },
      }}>
      
      {/* 1. Settings (Gear) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />

      {/* 2. Notifications (Bell) */}
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />

      {/* 3. Upload/Scroll (Plus) - Opens the generator Modal */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Upload/Scroll',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.app.fill" color={color} />,
        }}
        listeners={() => ({
          tabPress: (e) => {
            // Only open the upload modal if we are ALREADY on the Home feed!
            // If we are on another tab, just let it navigate to the Home feed normally.
            if (pathname === '/') {
              e.preventDefault();
              router.push('/add-modal');
            }
          },
        })}
      />

      {/* 4. Search/Filter (Magnifying Glass) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Filter',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="line.3.horizontal.decrease" color={color} />,
        }}
      />

      {/* 5. Saved (Bookmark) */}
      <Tabs.Screen
        name="add"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bookmark.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
