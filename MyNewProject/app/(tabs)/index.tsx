import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, Dimensions, ViewToken, ScrollView, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
// import { generateTTS } from '@/utils/elevenlabs'; // Commented out to save credits
import { useSound } from '@/context/SoundContext';
import { useTutorial, TutorialStep } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';

import { TopNavBar } from '@/components/TopNavBar';
import { ChatModal } from '@/components/ChatModal';
import { getScriptById, updateQuizStatus, SavedScript, QuizStatus, getScriptHistory } from '@/utils/storage';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

// Available source videos
const SOURCE_VIDEOS = [
  { id: 'asmr1', source: require('@/assets/videos/asmr1.mp4') },
  { id: 'parkour2', source: require('@/assets/videos/minecraftparkour2.mp4') },
  { id: 'subwaysurfers2', source: require('@/assets/videos/subwaysurfers2.mp4') }
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

const VideoItem = React.memo(({ source, isActive, isAppFocused, onVideoLoaded, isUserPaused, onTogglePause, onForcePause }: { source: any; isActive: boolean; isAppFocused: boolean; onVideoLoaded: () => void; isUserPaused: boolean; onTogglePause: () => void; onForcePause: () => void }) => {
  const videoRef = useRef<Video>(null);
  const [hasJumpedToRandomTime, setHasJumpedToRandomTime] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  // Start the video off as implicitly playing if active, UNLESS forcefully paused
  const { videoVolume, playbackSpeed } = useSound();

  // Explicitly set volume and rate when they change or when the video becomes active
  useEffect(() => {
    if (videoRef.current) {
      console.log(`[VideoItem] Volume: ${videoVolume}, Rate: ${playbackSpeed}, Active: ${isActive}, Loaded: ${isLoaded}`);
      videoRef.current.setVolumeAsync(videoVolume).catch(() => { });
      videoRef.current.setRateAsync(playbackSpeed, true).catch(() => { });
    }
  }, [videoVolume, playbackSpeed, isActive, isLoaded]);

  // Safely tell the parent list we are ready to be scrolled from,
  // whenever we are both active and loaded!
  useEffect(() => {
    if (isActive && isLoaded) {
      onVideoLoaded();
    }
  }, [isActive, isLoaded, onVideoLoaded]);

  // Handle visibility transitions specifically for the app backgrounding / chat opening
  useEffect(() => {
    if (!isAppFocused && isActive) {
      // If we are leaving this screen entirely (opening chat, changing tabs), forcefully pause it forever
      onForcePause();
      videoRef.current?.pauseAsync().catch(() => { });
    }
  }, [isAppFocused, isActive, onForcePause]);

  // Handle active/inactive transitions ONLY for vertical scrolling
  useEffect(() => {
    if (isActive) {
      // If returning to the active video via scroll OR after a forced pause, check the user state.
      // If they didn't manually pause it, auto-play!
      if (!isUserPaused && isAppFocused) {
        videoRef.current?.playAsync().catch(() => { });
      }
    } else {
      // If we just vertically scroll away, organically pause it BUT don't overwrite user intent
      videoRef.current?.pauseAsync().catch(() => { });
    }
  }, [isActive, isAppFocused, isUserPaused]);

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
    <TouchableOpacity
      style={styles.videoContainer}
      activeOpacity={1}
      onPress={onTogglePause}
    >
      <Video
        ref={videoRef}
        style={styles.video}
        source={videoSource}
        useNativeControls={false}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive && isAppFocused && !isUserPaused}
        rate={playbackSpeed}
        shouldCorrectPitch={true}
        volume={videoVolume}
        isMuted={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        progressUpdateIntervalMillis={1000} // PERFORMANCE: Reduce update frequency
        posterSource={require('@/assets/images/partial-react-logo.png')} // Show something while loading
        posterStyle={styles.poster}
      />

      {/* Pause Icon Overlay */}
      {isUserPaused && (
        <View style={styles.pauseOverlay}>
          <View style={styles.playIconButton}>
            <Ionicons name="play" size={40} color="white" style={{ marginLeft: 4 }} />
          </View>
        </View>
      )}

      {!isLoaded && isActive && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
});

VideoItem.displayName = 'VideoItem';

const QuizView = ({ script, onUpdateScript, tutorialStep, onTutorialNext }: { script: SavedScript, onUpdateScript: (updated: SavedScript) => void, tutorialStep?: TutorialStep, onTutorialNext?: () => void }) => {
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(script.quizStatus?.userAnswers || new Array(script.questions?.length || 0).fill(null));
  const [isSubmitted, setIsSubmitted] = useState(script.quizStatus?.isSubmitted || false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitButtonRef = useRef<View>(null);
  const [submitButtonRect, setSubmitButtonRect] = useState<any>(null);

  // If questions are missing, we should try to generate them here if the automatic one failed
  const handleRetryGeneration = async () => {
    const { generateQuizForReel } = await import('@/utils/gemini');
    const { getScriptById } = await import('@/utils/storage');

    setIsRetrying(true);
    setError(null);
    try {
      const questions = await generateQuizForReel(script.script);
      if (questions) {
        // Update storage
        const history = await import('@/utils/storage').then(s => s.getScriptHistory());
        const index = history.findIndex(item => item.id === script.id);
        if (index !== -1) {
          history[index].questions = questions;
          history[index].quizStatus = {
            userAnswers: new Array(questions.length).fill(null),
            isSubmitted: false,
            score: 0
          };
          await import('@react-native-async-storage/async-storage').then(a =>
            a.default.setItem('@reel_scripts_history', JSON.stringify(history))
          );

          // Notify parent to refresh
          const updated = await getScriptById(script.id);
          if (updated) onUpdateScript(updated);
        }
      } else {
        setError("Still unable to generate questions. Gemini quota might be full. Try again in a few minutes.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!script.questions || script.questions.length === 0) {
    return (
      <View style={styles.placeholderContainer}>
        {isRetrying ? (
          <>
            <ThemedText style={styles.placeholderText}>Generating questions (Attempting to fix quota/load)...</ThemedText>
            <ActivityIndicator size="small" color="#666" style={{ marginTop: 12 }} />
          </>
        ) : (
          <>
            <ThemedText style={styles.placeholderText}>
              {error || "Questions for this reel haven't loaded yet."}
            </ThemedText>
            <TouchableOpacity style={styles.retryButtonWide} onPress={handleRetryGeneration}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Generate Questions Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    
    if (tutorialStep === TutorialStep.QUESTIONS_VIEW_EXPLAIN) {
       onTutorialNext?.();
    }

    let score = 0;
    userAnswers.forEach((ans, idx) => {
      if (ans === script.questions![idx].correctAnswerIndex) score++;
    });

    const newStatus: QuizStatus = {
      userAnswers,
      isSubmitted: true,
      score
    };

    setIsSubmitted(true);
    await updateQuizStatus(script.id, newStatus);
  };

  const handleRetake = async () => {
    const freshAnswers = new Array(script.questions!.length).fill(null);
    const newStatus: QuizStatus = {
      userAnswers: freshAnswers,
      isSubmitted: false,
      score: 0
    };

    setUserAnswers(freshAnswers);
    setIsSubmitted(false);
    await updateQuizStatus(script.id, newStatus);
  };

  const score = userAnswers.reduce((acc, ans, idx) =>
    ans === script.questions![idx].correctAnswerIndex ? (acc as number) + 1 : acc, 0
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.quizScroll} contentContainerStyle={styles.quizContainer}>
        <ThemedText type="title" style={styles.quizTitle}>Knowledge Check 🧠</ThemedText>

      {isSubmitted && (
        <View style={styles.scoreCard}>
          <ThemedText style={styles.scoreText}>Your Score: {score} / {script.questions.length}</ThemedText>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="refresh" size={20} color="#0a7ea4" />
            <Text style={styles.retakeText}>Retake Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {script.questions.map((q, qIdx) => (
        <View key={qIdx} style={styles.questionCard}>
          <ThemedText style={styles.questionText}>{qIdx + 1}. {q.question}</ThemedText>
          <View style={styles.optionsContainer}>
            {q.options.map((option, oIdx) => {
              const isSelected = userAnswers[qIdx] === oIdx;
              const isCorrect = q.correctAnswerIndex === oIdx;
              const showResult = isSubmitted;

              let borderColor = '#333';
              let backgroundColor = 'transparent';
              if (isSelected) borderColor = '#0a7ea4';
              if (showResult) {
                if (isCorrect) {
                  borderColor = '#4CAF50';
                  backgroundColor = 'rgba(76, 175, 80, 0.1)';
                } else if (isSelected) {
                  borderColor = '#F44336';
                  backgroundColor = 'rgba(244, 67, 54, 0.1)';
                }
              }

              return (
                <TouchableOpacity
                  key={oIdx}
                  style={[styles.optionButton, { borderColor, backgroundColor }]}
                  onPress={() => handleSelectOption(qIdx, oIdx)}
                  disabled={isSubmitted}
                >
                  <ThemedText style={[styles.optionText, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                    {option}
                  </ThemedText>
                  {showResult && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
                  {showResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color="#F44336" />}
                </TouchableOpacity>
              );
            })}
          </View>
          {isSubmitted && (
            <View style={styles.explanationContainer}>
              <ThemedText style={styles.explanationLabel}>Explanation:</ThemedText>
              <ThemedText style={styles.explanationText}>{q.explanation}</ThemedText>
            </View>
          )}
        </View>
      ))}

      {!isSubmitted && (
        <TouchableOpacity
          ref={submitButtonRef}
          style={[styles.submitButton, userAnswers.includes(null) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={userAnswers.includes(null)}
          onLayout={() => {
            submitButtonRef.current?.measureInWindow((x, y, width, height) => {
              setSubmitButtonRect({ x, y, width, height });
            });
          }}
        >
          <ThemedText style={styles.submitButtonText}>Submit Quiz</ThemedText>
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>

    {!isSubmitted ? (
      <TutorialOverlay
        step={TutorialStep.QUESTIONS_VIEW_EXPLAIN}
        message="Scroll and submit your answers to the questions"
        targetRect={{ x: 20, y: 250, width: windowWidth - 40, height: 40 }} // Lowered more for visibility
        arrowDirection="down"
        hideFooter={true}
      />
    ) : (
      <TutorialOverlay
        step={TutorialStep.QUESTIONS_RESULT_EXPLAIN}
        message="You can see your score, explanations to each question, and retake the quiz here."
        subMessage="Click anywhere to continue"
        onPressAnywhere={onTutorialNext}
      />
    )}
  </View>
);
};

export default function HomeScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeTopTab, setActiveTopTab] = useState<'reels' | 'questions'>('reels');
  const [isCurrentVideoLoaded, setIsCurrentVideoLoaded] = useState(false); // Track scroll lock State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSavedScript, setCurrentSavedScript] = useState<SavedScript | null>(null);
  const bottomTabBarHeight = useBottomTabBarHeight(); // Required so videos are positioned correctly with absolute tab bar
  const isTabBarFocused = useIsFocused(); // Track if the user navigated away from the home screen entirely
  const router = useRouter();

  // GLOBAL AUDIO SETUP
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Audio mode setup failed", e);
      }
    };
    setupAudio();
  }, []);

  const { generatedScript, initialAudio, scriptId, tab } = useLocalSearchParams<{ 
    generatedScript: string; 
    initialAudio?: string; 
    scriptId: string;
    tab?: string;
  }>();

  // Parse initial audio URIs from route params
  const initialAudioUris: Record<number, string> = useMemo(() => {
    if (initialAudio) {
      try {
        return JSON.parse(initialAudio);
      } catch {
        console.error("Failed to parse initialAudio from params");
      }
    }
    return {};
  }, [initialAudio]);

  // Audio state
  const [audioUris, setAudioUris] = useState<Record<number, string>>(initialAudioUris);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const { ttsVolume } = useSound();
  const { currentStep, nextStep, setStep, isTutorialActive } = useTutorial();

  // Tutorial measurement refs
  const chatButtonRef = useRef<View>(null);
  const [chatButtonRect, setChatButtonRect] = useState<any>(null);

  // Sync with tab parameter
  useEffect(() => {
    if (tab === 'reels') setActiveTopTab('reels');
    if (tab === 'questions') setActiveTopTab('questions');
  }, [tab]);

  // Ensure tutorial starts and ends on reels
  useEffect(() => {
    if (currentStep === TutorialStep.WELCOME || currentStep === TutorialStep.TUTORIAL_COMPLETE) {
      setActiveTopTab('reels');
    }
  }, [currentStep]);

  const [hasSavedReels, setHasSavedReels] = useState(false);

  // Load the full script item if we have an ID, and check if it still exists
  useFocusEffect(
    useCallback(() => {
      const verifyState = async () => {
        const history = await getScriptHistory();
        setHasSavedReels(history.length > 0);

        if (scriptId) {
          const script = history.find(s => s.id === scriptId);
          if (script) {
            setCurrentSavedScript(script);
          } else {
            // It was deleted! Clear the current script.
            setCurrentSavedScript(null);
            router.setParams({ scriptId: '', generatedScript: '', initialAudio: '' });
          }
        } else {
          setCurrentSavedScript(null);
        }
      };
      verifyState();
    }, [scriptId, router])
  );

  const activeScriptText = currentSavedScript?.script || generatedScript;

  // Parse script into an array based on "Topic X" headings
  const scriptsArray = useMemo(() => {
    if (!activeScriptText) return [];

    // Split by "Topic 1", "**Topic 2**", "Topic 3:", etc. using regex
    // The lookahead (?=...) keeps the delimiter so it stays part of the text
    const splitRegex = /(?=(?:\*\*?)?Topic \d+(?:\*\*?)?:?)/i;

    return activeScriptText
      .split(splitRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [activeScriptText]);

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
    // Also reset paused state so the next video plays immediately
    setIsUserPaused(false);
  }, [activeVideoIndex]);

  useEffect(() => {
    // When a newly generated or selected history script loads, reset the feed completely to Topic 1
    if (activeScriptText) {
      setActiveVideoIndex(0);
      setIsCurrentVideoLoaded(false);

      // If we loaded a history script that already has downloaded audio, use it!
      if (currentSavedScript?.audioUris) {
        setAudioUris(currentSavedScript.audioUris);
      } else {
        setAudioUris(initialAudioUris); // Otherwise fallback to router params
      }

      // Give the layout a frame to adjust before snapping the video list to the top
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 0);
    }
  }, [activeScriptText, initialAudioUris, currentSavedScript]);

  // Keep track of the currently loaded audio URI so we don't recreate it in a loop
  const loadedAudioUriRef = useRef<string | null>(null);

  // Handle Play/Pause/Generate of Audio when the active video index changes
  useEffect(() => {
    let unmounted = false;

    async function handleAudioPlayback() {
      // Find the target URI we SHOULD be playing
      const scriptToRead = scriptsArray[activeVideoIndex];
      let targetUri = (scriptsArray.length > 0 && scriptToRead) ? audioUris[activeVideoIndex] : undefined;

      // 1. Immediately kill the old audio if the target has changed
      // (Even if we aren't ready to play the new one yet!)
      if (loadedAudioUriRef.current !== (targetUri || null) && !!loadedAudioUriRef.current) {
        console.log(`🔇 [expo-av] Target video index changed. Stopping previous audio.`);
        if (sound) {
          await sound.unloadAsync();
        }
        loadedAudioUriRef.current = null;
      }

      // If we aren't fully loaded on the new video slide yet, wait silently!
      if (!isCurrentVideoLoaded || !scriptToRead || !targetUri) return;

      // TUTORIAL CHECK: Block audio if we are in the explain step
      if (isTutorialActive && currentStep === TutorialStep.POST_UPLOAD_AUDIO_WAIT) {
        console.log("🤫 [tutorial] Audio blocked during explanation.");
        return;
      }

      // 2. Play the new audio if we aren't already!
      if (!unmounted && loadedAudioUriRef.current !== targetUri) {
        try {
          console.log(`🔊 [expo-av] Attempting to play audio from URI: ${targetUri}`);

          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: targetUri },
            { shouldPlay: !isUserPaused, volume: ttsVolume, isLooping: true }
          );

          console.log(`▶️ [expo-av] Audio playback started successfully for index ${activeVideoIndex}!`);
          loadedAudioUriRef.current = targetUri;
          setSound(newSound);
        } catch (e) {
          console.error("❌ [expo-av] Failed to play TTS audio:", e);
        }
      }
    }

    handleAudioPlayback();

    return () => {
      unmounted = true;
      // We DO NOT unload here anymore, because this cleanup runs on every dependency change.
      // We only unload when we INTENTIONALLY swap the audio URI above.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideoIndex, scriptsArray, isCurrentVideoLoaded, audioUris]);

  // Dedicated unmount cleanup for when the entire HomeScreen unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    }
  }, [sound]);

  // Handle pausing/playing the TTS audio when the user taps the video
  useEffect(() => {
    if (sound) {
      if (isUserPaused) {
        sound.pauseAsync().catch(() => { });
      } else {
        sound.playAsync().catch(() => { });
      }
    }
  }, [sound, isUserPaused]);

  // Dynamically update the volume of the TTS audio if the user changes it in settings while listening
  useEffect(() => {
    if (sound) {
      sound.setVolumeAsync(ttsVolume).catch(() => { });
    }
  }, [sound, ttsVolume]);

  return (
    <View style={styles.container}>
      {activeTopTab === 'reels' ? (
        <>
          {scriptsArray.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={feedVideos}
              renderItem={({ item, index }) => (
                <View key={item.uniqueKey} style={{ height: containerHeight, width: windowWidth }}>
                  <VideoItem
                    source={item.source}
                    isActive={activeVideoIndex === index}
                    isAppFocused={activeTopTab === 'reels' && isTabBarFocused && (!isChatOpen || isTutorialActive)}
                    onVideoLoaded={() => setIsCurrentVideoLoaded(true)}
                    isUserPaused={isUserPaused && activeVideoIndex === index}
                    onTogglePause={() => setIsUserPaused(!isUserPaused)}
                    onForcePause={() => setIsUserPaused(true)}
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
              windowSize={2} // PERFORMANCE: Even tighter window for slower devices
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={true} // PERFORMANCE: Unmount off-screen views
              scrollEnabled={isCurrentVideoLoaded} // PERFORMANCE FIX: Only allow scrolling if the current video is rendering!
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="cloud-upload-outline" size={64} color="#FFF" style={{marginBottom: 16}} />
              <ThemedText style={[styles.placeholderText, { textAlign: 'center' }]}>
                {hasSavedReels ? "Select a reel from the Saved tab or press + to upload file" : "Press + to upload file"}
              </ThemedText>
            </View>
          )}

          {/* Subtitle Overlay */}
          {scriptsArray.length > 0 && (
            <View style={styles.subtitlesWrapper} pointerEvents="box-none">
              {scriptsArray[activeVideoIndex] ? (
                <View style={[styles.subtitlesContainer, { bottom: bottomTabBarHeight + 70 }]}>
                  <ScrollView ref={scrollViewRef} style={styles.subtitlesScroll} showsVerticalScrollIndicator={false}>
                    <ThemedText style={styles.subtitlesText}>{scriptsArray[activeVideoIndex]}</ThemedText>
                  </ScrollView>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons Panel */}
          {scriptsArray.length > 0 && (
            <View style={[styles.rightActionPanel, { bottom: bottomTabBarHeight + 200 }]}>
              <TouchableOpacity 
                ref={chatButtonRef}
                style={styles.actionButton} 
                onPress={() => {
                  if (currentStep === TutorialStep.ASSISTANT_POINT) nextStep();
                  setIsChatOpen(true);
                }}
                onLayout={() => {
                  chatButtonRef.current?.measureInWindow((x, y, width, height) => {
                    setChatButtonRect({ x, y, width, height });
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={36} color="white" />
                <Text style={styles.actionText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        currentSavedScript ? (
          <QuizView 
            script={currentSavedScript} 
            onUpdateScript={setCurrentSavedScript}
            tutorialStep={currentStep}
            onTutorialNext={nextStep}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="cloud-upload-outline" size={64} color="#FFF" style={{marginBottom: 16}} />
            <ThemedText style={[styles.placeholderText, { textAlign: 'center' }]}>
              {hasSavedReels ? "Select a reel from the Saved tab to see its questions" : "Press + to upload file"}
            </ThemedText>
          </View>
        )
      )}

      <TopNavBar
        activeTab={activeTopTab}
        onTabChange={(tab) => {
          if (currentStep === TutorialStep.QUESTIONS_TAB_POINT && tab === 'questions') nextStep();
          setActiveTopTab(tab);
        }}
      />

      <ChatModal
        isVisible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        topicContext={scriptsArray[activeVideoIndex] || ''}
      />

      {/* TUTORIAL OVERLAYS */}
      <TutorialOverlay
        step={TutorialStep.WELCOME}
        message="Click here to upload"
        targetRect={{ x: windowWidth / 2 - 30, y: windowHeight - 60, width: 60, height: 60 }} // Approx middle tab
        arrowDirection="down"
      />

      <TutorialOverlay
        step={TutorialStep.POST_UPLOAD_AUDIO_WAIT}
        message="Captions and audio play based off uploaded material"
        subMessage="Click anywhere to continue"
        onPressAnywhere={nextStep}
      />

      <TutorialOverlay
        step={TutorialStep.ASSISTANT_POINT}
        message="Click here for your personalized assistant"
        targetRect={chatButtonRect}
        arrowDirection="right"
      />

      <TutorialOverlay
        step={TutorialStep.QUESTIONS_TAB_POINT}
        message="Click here for questions about the material."
        targetRect={{ x: windowWidth * 0.75 - 50, y: 100, width: 100, height: 40 }} // Point to Questions tab in TopNavBar
        arrowDirection="up"
      />

      <TutorialOverlay
        step={TutorialStep.SETTINGS_TAB_POINT}
        message="Click here for content settings."
        targetRect={{ x: windowWidth * 0.1 - 30, y: windowHeight - 60, width: 60, height: 60 }} // Point to first tab (Settings)
        arrowDirection="down"
      />

      <TutorialOverlay
        step={TutorialStep.FINAL_CTA}
        message="That's it, upload your first file to begin"
        targetRect={{ x: windowWidth / 2 - 30, y: windowHeight - 60, width: 60, height: 60 }} // Approx middle tab
        arrowDirection="down"
      />

      <TutorialOverlay
        step={TutorialStep.TUTORIAL_COMPLETE}
        message="Tutorial complete!"
        subMessage="You're all set to explore SASE HACKS!"
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
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitlesWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  subtitlesContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxHeight: 150,
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
  },
  quizScroll: {
    flex: 1,
    backgroundColor: '#000',
  },
  quizContainer: {
    padding: 20,
    paddingTop: 140,
  },
  quizTitle: {
    fontSize: 28,
    marginBottom: 24,
    color: '#fff',
    textAlign: 'center'
  },
  scoreCard: {
    backgroundColor: 'rgba(10, 126, 164, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  retakeText: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 16,
  },
  questionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#ccc',
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  explanationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  explanationLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  explanationText: {
    color: '#BBB',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButtonWide: {
    backgroundColor: '#0a7ea4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  playIconButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});
