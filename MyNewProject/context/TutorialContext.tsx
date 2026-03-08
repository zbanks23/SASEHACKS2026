import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export enum TutorialStep {
  WELCOME = 'WELCOME',
  UPLOAD_EXPLAIN = 'UPLOAD_EXPLAIN',
  UPLOAD_SPECIFIC_INSTRUCTION = 'UPLOAD_SPECIFIC_INSTRUCTION',
  POST_UPLOAD_AUDIO_WAIT = 'POST_UPLOAD_AUDIO_WAIT',
  ASSISTANT_POINT = 'ASSISTANT_POINT',
  ASSISTANT_OPEN = 'ASSISTANT_OPEN',
  QUESTIONS_TAB_POINT = 'QUESTIONS_TAB_POINT',
  QUESTIONS_VIEW_EXPLAIN = 'QUESTIONS_VIEW_EXPLAIN',
  QUESTIONS_RESULT_EXPLAIN = 'QUESTIONS_RESULT_EXPLAIN',
  SETTINGS_TAB_POINT = 'SETTINGS_TAB_POINT',
  SETTINGS_VIEW_EXPLAIN = 'SETTINGS_VIEW_EXPLAIN',
  SAVE_FEATURE_POINT = 'SAVE_FEATURE_POINT',
  SAVED_VIEW_EXPLAIN = 'SAVED_VIEW_EXPLAIN',
  DELETE_INDICATOR = 'DELETE_INDICATOR',
  DELETE_BUTTON_POINT = 'DELETE_BUTTON_POINT',
  TUTORIAL_COMPLETE = 'TUTORIAL_COMPLETE',
  FINAL_CTA = 'FINAL_CTA',
  COMPLETED = 'COMPLETED'
}

interface TutorialContextType {
  currentStep: TutorialStep;
  isTutorialActive: boolean;
  nextStep: () => void;
  setStep: (step: TutorialStep) => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  isReady: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_KEY = '@tutorial_completed_v1';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(TutorialStep.WELCOME);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem(STORAGE_KEY);
        if (completed !== 'true') {
          setIsTutorialActive(true);
        }
      } catch (e) {
        console.error('Failed to check tutorial status', e);
      } finally {
        setIsReady(true);
      }
    };
    checkStatus();
  }, []);

  const nextStep = () => {
    const steps = Object.values(TutorialStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      completeTutorial();
    }
  };

  const setStep = (step: TutorialStep) => {
    setCurrentStep(step);
  };

  const completeTutorial = async () => {
    setIsTutorialActive(false);
    setCurrentStep(TutorialStep.COMPLETED);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save tutorial status', e);
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const restartTutorial = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setCurrentStep(TutorialStep.WELCOME);
      setIsTutorialActive(true);
    } catch (e) {
      console.error('Failed to restart tutorial', e);
    }
  };

  return (
    <TutorialContext.Provider value={{ 
      currentStep, 
      isTutorialActive, 
      nextStep, 
      setStep,
      skipTutorial,
      restartTutorial,
      isReady
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
