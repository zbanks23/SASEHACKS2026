import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, Dimensions, ViewToken, ScrollView, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

import { TopNavBar } from '@/components/TopNavBar';
import { ChatModal } from '@/components/ChatModal';

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

const VideoItem = React.memo(({ source, isActive, onVideoLoaded }: { source: any; isActive: boolean; onVideoLoaded: () => void }) => {
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
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        progressUpdateIntervalMillis={1000} // PERFORMANCE: Reduce update frequency
        posterSource={require('@/assets/images/partial-react-logo.png')} // Show something while loading
        posterStyle={styles.poster}
      />
      {!isLoaded && isActive && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </View>
  );
});;

export default function HomeScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeTopTab, setActiveTopTab] = useState<'reels' | 'questions'>('reels');
  const [isCurrentVideoLoaded, setIsCurrentVideoLoaded] = useState(false); // Track scroll lock State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const bottomTabBarHeight = useBottomTabBarHeight(); // Required so videos are positioned correctly with absolute tab bar

  // Get script passing back from the generator Modal
  const { generatedScript } = useLocalSearchParams<{ generatedScript: string }>();

  // Parse script into an array based on "Topic X" headings
  const scriptsArray = useMemo(() => {
    if (!generatedScript) return [];

    // Split by "Topic 1", "**Topic 2**", "Topic 3:", etc. using regex
    // The lookahead (?=...) keeps the delimiter so it stays part of the text
    const splitRegex = /(?=(?:\*\*?)?Topic \d+(?:\*\*?)?:?)/i;

    return generatedScript
      .split(splitRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [generatedScript]);

  // Generate the list of 50 random clips when the screen loads
  const allFeedVideos = useMemo(() => generateVideoFeed(), []);

  // Limit feed to the number of scripts if a script exists, to emulate "all video scripts are finished"
  const feedVideos = useMemo(() => {
    if (scriptsArray.length > 0) {
      return allFeedVideos.slice(0, scriptsArray.length);
    }
    return allFeedVideos;
  }, [allFeedVideos, scriptsArray]);

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

  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Reset scroll to top when swiping to a new video
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeVideoIndex]);

  useEffect(() => {
    // When a newly generated or selected history script loads, reset the feed completely to Topic 1
    if (generatedScript) {
      setActiveVideoIndex(0);
      setIsCurrentVideoLoaded(false);
      // Give the layout a frame to adjust before snapping the video list to the top
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 0);
    }
  }, [generatedScript]);

  return (
    <View style={styles.container}>
      {activeTopTab === 'reels' ? (
        <>
          <FlatList
            ref={flatListRef}
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
            windowSize={3} // PERFORMANCE: Reduce number of items kept in memory
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={100}
            removeClippedSubviews={true} // PERFORMANCE: Unmount off-screen views
            scrollEnabled={isCurrentVideoLoaded} // PERFORMANCE FIX: Only allow scrolling if the current video is rendering!
          />

          {/* Generated Script Overlay! */}
          {scriptsArray.length > 0 && scriptsArray[activeVideoIndex] && (
            <View style={[styles.subtitlesContainer, { bottom: bottomTabBarHeight + 20 }]}>
              <ScrollView ref={scrollViewRef} style={styles.subtitlesScroll} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.subtitlesText}>{scriptsArray[activeVideoIndex]}</ThemedText>
              </ScrollView>
            </View>
          )}

          {/* Fallback Overlay if no text generated just to show where it goes */}
          {!generatedScript && (
            <View style={[styles.subtitlesContainer, { bottom: bottomTabBarHeight + 20, opacity: 0.5 }]}>
              <ScrollView style={styles.subtitlesScroll} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.subtitlesText}>Tap the + button to generate scripts for your Reel</ThemedText>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons Panel */}
          <View style={[styles.rightActionPanel, { bottom: bottomTabBarHeight + 200 }]}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsChatOpen(true)}>
              <Ionicons name="chatbubble-ellipses" size={36} color="white" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderText}>Questions from users will appear here!</ThemedText>
        </View>
      )}

      <TopNavBar 
        activeTab={activeTopTab} 
        onTabChange={setActiveTopTab} 
      />

      <ChatModal 
        isVisible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        topicContext={scriptsArray[activeVideoIndex] || ''}
      />
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
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  subtitlesContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxHeight: 250,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  subtitlesScroll: {
    width: '100%',
  },
  subtitlesText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    textAlign: 'center',
  },
  rightActionPanel: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
