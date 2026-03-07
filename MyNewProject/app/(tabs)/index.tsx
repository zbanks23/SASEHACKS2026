import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, FlatList, Dimensions, ViewToken } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { TopNavBar } from '@/components/TopNavBar';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

// Dummy video data for testing
// FOR A HACKATHON: You can place your `.mp4` files in the `assets/videos` folder
// Instead of a URL string, you `require()` the local file.
// If the video doesn't exist yet, it will throw an error, so I'm leaving the 
// remote URLs here as a fallback until you add your real files!
const DUMMY_VIDEOS = [
  // Example of how to load a local file when you have one:
  // { id: 'local1', source: require('@/assets/videos/my-first-video.mp4') },

  // Sticking with URLs until you add your local files so the app doesn't crash:
  { id: 'local1', source: require('@/assets/videos/asmr1.mp4') }
];

/**
 * Individual Video Item Component using expo-av
 */
const VideoItem = ({ source, isActive }: { source: any; isActive: boolean }) => {
  const videoRef = useRef<Video>(null);

  // Play/Pause automatically based on whether the video is focused on screen
  useEffect(() => {
    const handlePlayback = async () => {
      try {
        if (isActive) {
          await videoRef.current?.playAsync();
        } else {
          await videoRef.current?.pauseAsync();
          await videoRef.current?.setPositionAsync(0);
        }
      } catch (error) {
        // Silently catch the 'Invalid view returned from registry' error.
        // This safely handles the case where the user scrolls very fast 
        // and the component unmounts before the play/pause promise resolves.
      }
    };

    handlePlayback();
  }, [isActive]);

  // Format source for expo-av based on if it's a URL or a required local file
  const videoSource = typeof source === 'string' ? { uri: source } : source;

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={videoSource}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN} // Better quality, especially for horizontal game clips
        isLooping
        shouldPlay={isActive}
      />
    </View>
  );
};

export default function HomeScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const bottomTabBarHeight = useBottomTabBarHeight(); // Required so videos are positioned correctly with absolute tab bar

  // Adjust container height to match screen exactly
  // If tab bar is absolute and transparent, we want video to take full screen
  const containerHeight = windowHeight;

  // Detect which video is currently on screen to pause others
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Video must be >50% visible to count as active
  }).current;

  return (
    <View style={styles.container}>
      {/* 
        This is your full screen vertical swiping list!
      */}
      <FlatList
        data={DUMMY_VIDEOS}
        renderItem={({ item, index }) => (
          <View style={{ height: containerHeight, width: windowWidth }}>
            <VideoItem source={item.source} isActive={index === activeVideoIndex} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled // Snaps to each item
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      {/* 
        Top Navigation Bar floats over the FlatList
      */}
      <TopNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background is typical for video apps
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
