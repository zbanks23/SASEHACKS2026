import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSound } from '@/context/SoundContext';
import { useTutorial, TutorialStep } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SoundSettingsScreen() {
  const { 
    videoVolume, setVideoVolume, 
    ttsVolume, setTtsVolume,
    playbackSpeed, setPlaybackSpeed 
  } = useSound();
  const { currentStep, nextStep, restartTutorial } = useTutorial();
  const router = useRouter();

  const handleSlidingComplete = (setter: (val: number) => void) => (val: number) => {
    setter(val);
    if (currentStep === TutorialStep.SETTINGS_VIEW_EXPLAIN) nextStep();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sound & Speed</Text>
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
            onSlidingComplete={handleSlidingComplete(setVideoVolume)}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#333"
            thumbTintColor="#FFF"
          />
          <Text style={styles.helperText}>Adjust the background audio of the video clips.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Ionicons name="speedometer-outline" size={24} color="#FFF" />
            <Text style={styles.sectionTitle}>Playback Speed</Text>
            <Text style={styles.percentage}>{playbackSpeed.toFixed(2)}x</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.25}
            value={playbackSpeed}
            onValueChange={setPlaybackSpeed}
            minimumTrackTintColor="#34C759"
            maximumTrackTintColor="#333"
            thumbTintColor="#FFF"
          />
          <Text style={styles.helperText}>Change the default playback speed for all reels.</Text>
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

        <TouchableOpacity 
          style={styles.replayButton} 
          onPress={() => {
            restartTutorial();
            router.push('/(tabs)');
          }}
        >
          <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          <Text style={styles.replayButtonText}>Replay Tutorial</Text>
        </TouchableOpacity>
      </View>

      <TutorialOverlay
        step={TutorialStep.SETTINGS_VIEW_EXPLAIN}
        message="Adjust the video audio, TTS audio, and playback speed"
      />

      <TutorialOverlay
        step={TutorialStep.SAVE_FEATURE_POINT}
        message="You can see your saved content here"
        targetRect={{ x: width * 0.9 - 30, y: height - 60, width: 60, height: 60 }} // Point to last tab (Saved)
        arrowDirection="down"
      />
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
    gap: 24,
  },
  section: {
    gap: 8,
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
    height: 30,
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
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    gap: 10,
    marginTop: 12,
  },
  replayButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
