import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of our saved script object
export interface SavedScript {
  id: string;
  title: string;
  script: string;
  date: number; // Unix timestamp
}

const STORAGE_KEY = '@reel_scripts_history';

/**
 * Saves a newly generated script to AsyncStorage.
 * @param script The full text of the generated script
 * @param title A short title to represent the reel
 */
export async function saveScriptToHistory(script: string, title: string): Promise<SavedScript | null> {
  try {
    const newScript: SavedScript = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: title || 'Untitled Reel',
      script: script,
      date: Date.now(),
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
