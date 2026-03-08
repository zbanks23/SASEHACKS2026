import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { SoundProvider } from '@/context/SoundContext';
import { TutorialProvider } from '@/context/TutorialContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const customTheme = {
    ...theme,
    colors: {
      ...theme.colors,
      background: 'transparent',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SoundProvider>
        <TutorialProvider>
          <ThemeProvider value={customTheme}>
            <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' }, animation: 'fade' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="add-modal" options={{ presentation: 'transparentModal', headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </TutorialProvider>
      </SoundProvider>
    </GestureHandlerRootView>
  );
}
