import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, Dimensions, ViewToken } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { TopNavBar } from '@/components/TopNavBar';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

// Available source videos
const SOURCE_VIDEOS = [
  { id: 'asmr1', source: require('@/assets/videos/asmr1.mp4') },
  { id: 'parkour1', source: require('@/assets/videos/minecraftparkour1.mp4') }
];

// Helper to get a random video from our sources
const getRandomVideo = (index: number) => {
  const randomIndex = Math.floor(Math.random() * SOURCE_VIDEOS.length);
  return {
    ...SOURCE_VIDEOS[randomIndex],
    uniqueKey: `video-${index}-${Math.random().toString(36).substr(2, 9)}`, // FlatList needs unique keys even if it's the same video file again
  };
};

// Generate an endless-feeling list of 50 random videos ahead of time
const generateVideoFeed = () => {
  return Array.from({ length: 50 }, (_, i) => getRandomVideo(i));
};

const VideoItem = ({ source, isActive, onVideoLoaded }: { source: any; isActive: boolean; onVideoLoaded: () => void }) => {
  const videoRef = useRef<Video>(null);
  const [hasJumpedToRandomTime, setHasJumpedToRandomTime] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Safely tell the parent list we are ready to be scrolled from,
  // whenever we are both active and loaded!
  useEffect(() => {
    if (isActive && isLoaded) {
      onVideoLoaded();
    }
  }, [isActive, isLoaded, onVideoLoaded]);

  useEffect(() => {
    if (isActive) {
      // Catch exceptions silently if it unmounts too fast
      videoRef.current?.playAsync().catch(() => { });
    } else {
      // Don't await these! If you swipe extremely fast, Seeking might get interrupted.
      videoRef.current?.pauseAsync().catch(() => { });
    }
  }, [isActive]);

  // When the video finishes loading its metadata, find a random spot to start!
  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {

    if (status.isLoaded && !isLoaded) {
      setIsLoaded(true);
    }

    // We only want to jump once when the video first loads and we know its duration.
    // Ensure we only jump if it's currently on screen!
    if (!hasJumpedToRandomTime && status.isLoaded && status.durationMillis && isActive) {
      setHasJumpedToRandomTime(true);

      const durationSecs = status.durationMillis / 1000;
      const safeBufferSecs = 5;

      if (durationSecs > safeBufferSecs) {
        const maxStartTime = durationSecs - safeBufferSecs;
        const randomStartSecs = Math.floor(Math.random() * maxStartTime);

        // Don't await. Fire and forget so we don't hold up the UI loop.
        videoRef.current?.setPositionAsync(randomStartSecs * 1000).catch(() => {
          // Seeking interrupted during fast scrolling, safe to ignore!
        });
      }
    }
  };

  // Format source for expo-av based on if it's a URL or a required local file
  const videoSource = typeof source === 'string' ? { uri: source } : source;

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={videoSource}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay={isActive}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
};

export default function HomeScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isCurrentVideoLoaded, setIsCurrentVideoLoaded] = useState(false); // Track scroll lock State
  const bottomTabBarHeight = useBottomTabBarHeight(); // Required so videos are positioned correctly with absolute tab bar

  // Generate the list of 50 random clips when the screen loads
  const feedVideos = useMemo(() => generateVideoFeed(), []);

  const containerHeight = windowHeight;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      // Only trigger if we genuinely changed videos
      if (newIndex !== activeVideoIndex) {
        setActiveVideoIndex(newIndex);
        setIsCurrentVideoLoaded(false); // Lock scrolling on the new video until it reports loaded
      }
    }
  }, [activeVideoIndex]); // Add dependency

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={feedVideos}
        renderItem={({ item, index }) => (
          <View key={item.uniqueKey} style={{ height: containerHeight, width: windowWidth }}>
            <VideoItem
              source={item.source}
              isActive={index === activeVideoIndex}
              onVideoLoaded={() => setIsCurrentVideoLoaded(true)} // Unlock scrolling when ready!
            />
          </View>
        )}
        keyExtractor={(item) => item.uniqueKey}
        pagingEnabled // Snaps to each item
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        windowSize={5} // Keep a few items rendered off-screen
        initialNumToRender={3}
        scrollEnabled={isCurrentVideoLoaded} // PERFORMANCE FIX: Only allow scrolling if the current video is rendering!
      />

      <TopNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
