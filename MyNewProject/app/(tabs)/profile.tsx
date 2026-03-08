import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSound } from '@/context/SoundContext';

export default function SoundSettingsScreen() {
  const { videoVolume, setVideoVolume, ttsVolume, setTtsVolume } = useSound();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sound Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Ionicons name="film-outline" size={24} color="#FFF" />
            <Text style={styles.sectionTitle}>Reel Volume</Text>
            <Text style={styles.percentage}>{Math.round(videoVolume * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={videoVolume}
            onSlidingComplete={setVideoVolume}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#333"
            thumbTintColor="#FFF"
          />
          <Text style={styles.helperText}>Adjust the background audio of the video clips.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Ionicons name="mic-outline" size={24} color="#FFF" />
            <Text style={styles.sectionTitle}>AI Narrator Volume</Text>
            <Text style={styles.percentage}>{Math.round(ttsVolume * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={ttsVolume}
            onValueChange={setTtsVolume}
            minimumTrackTintColor="#FF9500"
            maximumTrackTintColor="#333"
            thumbTintColor="#FFF"
          />
          <Text style={styles.helperText}>Placeholder: Adjust the volume of the generated AI voice.</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
          <Text style={styles.infoText}>
            These settings are saved automatically and apply to the main feed instantly.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    gap: 40,
  },
  section: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  percentage: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  helperText: {
    color: '#666',
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
