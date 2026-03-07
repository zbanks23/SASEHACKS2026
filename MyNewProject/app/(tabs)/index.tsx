import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, FlatList, Dimensions, ViewToken } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { TopNavBar } from '@/components/TopNavBar';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

// Dummy video data for testing
const DUMMY_VIDEOS = [
  { id: 'local1', source: require('@/assets/videos/asmr1.mp4') }
];

const VideoItem = ({ source, isActive }: { source: any; isActive: boolean }) => {
  const videoRef = useRef<Video>(null);

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
      }
    };

    handlePlayback();
  }, [isActive]);

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
      />
    </View>
  );
};

export default function HomeScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const bottomTabBarHeight = useBottomTabBarHeight();

  const containerHeight = windowHeight;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={DUMMY_VIDEOS}
        renderItem={({ item, index }) => (
          <View style={{ height: containerHeight, width: windowWidth }}>
            <VideoItem source={item.source} isActive={index === activeVideoIndex} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
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
