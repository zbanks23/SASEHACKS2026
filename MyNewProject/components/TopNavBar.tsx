import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TopNavBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 10 }]}>
      {/* 
        BUTTON 1: Left option 
        You can change the text here to switch between different feeds or modes.
      */}
      <TouchableOpacity style={styles.button}>
        <Text style={[styles.text, styles.inactiveText]}>Left Option</Text>
      </TouchableOpacity>
      
      <View style={styles.divider} />

      {/* 
        BUTTON 2: Right option
        Often the default active feed.
      */}
      <TouchableOpacity style={styles.button}>
        <Text style={[styles.text, styles.activeText]}>Right Option</Text>
        <View style={styles.indicator} />
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
