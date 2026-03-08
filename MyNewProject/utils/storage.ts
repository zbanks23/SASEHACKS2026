import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizStatus {
  userAnswers: (number | null)[];
  isSubmitted: boolean;
  score: number;
}

// Define the shape of our saved script object
export interface SavedScript {
  id: string;
  title: string;
  script: string;
  date: number; // Unix timestamp
  questions?: QuizQuestion[];
  quizStatus?: QuizStatus;
  audioUris?: Record<number, string>;
}

const STORAGE_KEY = '@reel_scripts_history';

/**
 * Saves a newly generated script to AsyncStorage.
 * @param script The full text of the generated script
 * @param title A short title to represent the reel
 * @param questions Optional quiz questions generated for this script
 * @param audioUris Optional object mapping script index to the local MP3 file URI
 */
export async function saveScriptToHistory(script: string, title: string, questions?: QuizQuestion[], audioUris?: Record<number, string>): Promise<SavedScript | null> {
  try {
    const newScript: SavedScript = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: title || 'Untitled Reel',
      script: script,
      date: Date.now(),
      questions: questions,
      audioUris: audioUris,
      quizStatus: questions ? {
        userAnswers: new Array(questions.length).fill(null),
        isSubmitted: false,
        score: 0
      } : undefined
    };

    const existingHistory = await getScriptHistory();
    const updatedHistory = [newScript, ...existingHistory]; // Add new script to the beginning

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return newScript;
  } catch (error) {
    console.error('Error saving script to history:', error);
    return null;
  }
}

/**
 * Updates the quiz status for a specific script.
 */
export async function updateQuizStatus(id: string, status: QuizStatus): Promise<boolean> {
  try {
    const history = await getScriptHistory();
    const index = history.findIndex(item => item.id === id);
    if (index === -1) return false;

    history[index].quizStatus = status;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error updating quiz status:', error);
    return false;
  }
}

/**
 * Updates the title of a specific script.
 */
export async function updateScriptTitle(id: string, newTitle: string): Promise<boolean> {
  try {
    const history = await getScriptHistory();
    const index = history.findIndex(item => item.id === id);
    if (index === -1) return false;

    history[index].title = newTitle;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error updating script title:', error);
    return false;
  }
}

/**
 * Retrieves a single script by its ID.
 */
export async function getScriptById(id: string): Promise<SavedScript | null> {
  const history = await getScriptHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * Retrieves all saved scripts from AsyncStorage, sorted newest first.
 */
export async function getScriptHistory(): Promise<SavedScript[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue != null) {
      const history: SavedScript[] = JSON.parse(jsonValue);
      // Ensure it's sorted by newest (should be by default due to how we save)
      return history.sort((a, b) => b.date - a.date);
    }
    return [];
  } catch (error) {
    console.error('Error retrieving script history:', error);
    return [];
  }
}

/**
 * Deletes a specific script from history by its ID.
 * @param id The unique ID of the script to delete
 */
export async function deleteScriptFromHistory(id: string): Promise<boolean> {
  try {
    const existingHistory = await getScriptHistory();
    const updatedHistory = existingHistory.filter(item => item.id !== id);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error deleting script from history:', error);
    return false;
  }
}
