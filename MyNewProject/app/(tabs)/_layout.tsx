import { Tabs, router, usePathname } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { useTutorial, TutorialStep } from '@/context/TutorialContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const { currentStep, nextStep } = useTutorial();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
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
        listeners={() => ({
          tabPress: () => {
             if (currentStep === TutorialStep.SETTINGS_TAB_POINT) nextStep();
          }
        })}
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
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "plus.app.fill" : "house.fill"} color={color} />,
        }}
        listeners={() => ({
          tabPress: (e) => {
            // TUTORIAL: If we are in welcome or final step, move to next!
            if (currentStep === TutorialStep.WELCOME || currentStep === TutorialStep.FINAL_CTA) {
               nextStep();
            }

            if (pathname === '/') {
              // Priority: If on home, stay on home but ensure we are on 'reels'
              router.setParams({ tab: 'reels' });
              
              // Only open the upload modal if we are already seeing reels
              // This is a subtle UX: 1st click switches Questions -> Reels, 2nd click opens Modal
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
        listeners={() => ({
          tabPress: () => {
            if (currentStep === TutorialStep.SAVE_FEATURE_POINT) nextStep();
          }
        })}
      />
    </Tabs>
  );
}
