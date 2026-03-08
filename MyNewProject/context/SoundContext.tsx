import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SoundContextType {
  videoVolume: number;
  setVideoVolume: (vol: number) => void;
  ttsVolume: number;
  setTtsVolume: (vol: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY_VIDEO = '@settings_video_volume';
const STORAGE_KEY_TTS = '@settings_tts_volume';
const STORAGE_KEY_SPEED = '@settings_playback_speed';

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [videoVolume, setVideoVolumeState] = useState(0.5);
  const [ttsVolume, setTtsVolumeState] = useState(0.8);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);

  // Load saved settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedViewVol = await AsyncStorage.getItem(STORAGE_KEY_VIDEO);
        if (savedViewVol !== null) {
          const val = parseFloat(savedViewVol);
          if (!isNaN(val)) setVideoVolumeState(val);
        }

        const savedTTSVol = await AsyncStorage.getItem(STORAGE_KEY_TTS);
        if (savedTTSVol !== null) {
          const val = parseFloat(savedTTSVol);
          if (!isNaN(val)) setTtsVolumeState(val);
        }

        const savedSpeed = await AsyncStorage.getItem(STORAGE_KEY_SPEED);
        if (savedSpeed !== null) {
          const val = parseFloat(savedSpeed);
          if (!isNaN(val)) setPlaybackSpeedState(val);
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const setVideoVolume = (vol: number) => {
    setVideoVolumeState(vol);
    AsyncStorage.setItem(STORAGE_KEY_VIDEO, vol.toString()).catch(() => {});
  };

  const setTtsVolume = (vol: number) => {
    setTtsVolumeState(vol);
    AsyncStorage.setItem(STORAGE_KEY_TTS, vol.toString()).catch(() => {});
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    AsyncStorage.setItem(STORAGE_KEY_SPEED, speed.toString()).catch(() => {});
  };

  return (
    <SoundContext.Provider value={{ 
      videoVolume, setVideoVolume, 
      ttsVolume, setTtsVolume,
      playbackSpeed, setPlaybackSpeed 
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
