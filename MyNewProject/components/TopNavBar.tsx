import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TopNavBar({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: 'reels' | 'questions'; 
  onTabChange: (tab: 'reels' | 'questions') => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 10 }]}>
      {/* 
        BUTTON 1: Reels (Left)
      */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => onTabChange('reels')}
      >
        <Text style={[
          styles.text, 
          activeTab === 'reels' ? styles.activeText : styles.inactiveText
        ]}>Reels</Text>
        {activeTab === 'reels' && <View style={styles.indicator} />}
      </TouchableOpacity>
      
      <View style={styles.divider} />

      {/* 
        BUTTON 2: Questions (Right)
      */}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => onTabChange('questions')}
      >
        <Text style={[
          styles.text, 
          activeTab === 'questions' ? styles.activeText : styles.inactiveText
        ]}>Questions</Text>
        {activeTab === 'questions' && <View style={styles.indicator} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it stays on top of the video
    // Remove background color so it floats over the video transparently
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)', // Help text stand out over videos
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  activeText: {
    color: '#ffffff',
  },
  inactiveText: {
    color: 'rgba(255,255,255,0.6)',
  },
  divider: {
    width: 1,
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 5,
  },
  indicator: {
    width: 20,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginTop: 5,
  }
});
