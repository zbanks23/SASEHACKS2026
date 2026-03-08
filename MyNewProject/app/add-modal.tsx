import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, View, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { askGemini, generateQuizForReel } from '@/utils/gemini';
import { saveScriptToHistory } from '@/utils/storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial, TutorialStep } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { generateTTS } from '@/utils/elevenlabs';

type InputMode = 'none' | 'text' | 'image' | 'pdf';

export default function AddModalScreen() {
  const router = useRouter();
  const { currentStep, nextStep } = useTutorial();

  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [prompt, setPrompt] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [base64Document, setBase64Document] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState(0);

  // Close the modal
  const handleClose = () => {
    if (currentStep === TutorialStep.UPLOAD_EXPLAIN) nextStep();
    router.back();
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
        setMimeType(result.assets[0].mimeType || 'image/jpeg');
        setInputMode('image');
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error picking image');
    }
  };

  const clearImage = () => {
    setImageUri(null);
    setBase64Image(null);
    setMimeType(null);
    setInputMode('none');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        let base64 = '';

        if (Platform.OS === 'web') {
          const res = await fetch(fileUri);
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'base64',
          });
        }

        setDocumentUri(fileUri);
        setDocumentName(result.assets[0].name);
        setBase64Document(base64);
        setDocumentMimeType(result.assets[0].mimeType || 'application/pdf');
        setInputMode('pdf');
      }
    } catch (error: any) {
      console.error("Error picking document:", error);
      Alert.alert('Error picking document', error?.message || 'Unknown error');
    }
  };

  const clearDocument = () => {
    setDocumentUri(null);
    setDocumentName(null);
    setBase64Document(null);
    setDocumentMimeType(null);
    setInputMode('none');
  };

  const handleGenerateScript = async () => {
    if (!prompt.trim() && !base64Image && !base64Document) {
      Alert.alert("Please provide at least some text, an image, or a document.");
      return;
    }
    setIsGenerating(true);
    setProgressStage(1); // Scripting

    try {
      const result = await askGemini(prompt, base64Image || undefined, mimeType || undefined, base64Document || undefined, documentMimeType || undefined) as { title?: string, script: string, questions: any[] } | null;

      if (result && result.script) {
        const { title: geminiTitle, script, questions } = result;

        // Fast UI feedback
        setProgressStage(2); // Narrating
        
        // Break script into topics and generate audio for each
        const splitRegex = /(?=(?:\*\*?)?Topic \d+(?:\*\*?)?:?)/i;
        const scriptsArray = script.split(splitRegex).map(s => s.trim()).filter(s => s.length > 0);
        
        const audioUris: Record<number, string> = {};
        for (let i = 0; i < scriptsArray.length; i++) {
          const uri = await generateTTS(scriptsArray[i], i);
          if (uri) {
            audioUris[i] = uri;
          }
        }

        setProgressStage(3); // Subtitling
        await new Promise(resolve => setTimeout(resolve, 500));

        setProgressStage(4); // Generating Quiz
        // Stage 4 is already finished because it was consolidated!
        await new Promise(resolve => setTimeout(resolve, 200));

        let finalTitle = geminiTitle || "Generated Reel";
        if (!geminiTitle) {
          if (inputMode === 'pdf' && documentName) {
            finalTitle = documentName;
          } else if (inputMode === 'text' && prompt) {
            finalTitle = prompt.substring(0, 30) + "...";
          }
        }

        const savedItem = await saveScriptToHistory(
          script, 
          finalTitle, 
          questions || undefined, 
          Object.keys(audioUris).length > 0 ? audioUris : undefined
        );

        // Advance tutorial if we were waiting for an upload
        if (currentStep === TutorialStep.UPLOAD_SPECIFIC_INSTRUCTION) nextStep();

        // Pass everything back!
        router.replace({
          pathname: '/(tabs)',
          params: {
            generatedScript: script,
            initialAudio: JSON.stringify(audioUris),
            scriptId: savedItem?.id
          }
        });
      } else {
        Alert.alert("Failed to generate script. Please try again.");
        setIsGenerating(false);
      }
    } catch (error: any) {
      console.error(error);
      
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE')) {
        Alert.alert("We are currently experiencing high demand. Please try again later.");
      } else {
        Alert.alert("An error occurred while generating the script.");
      }
      
      setIsGenerating(false);
    }
  };


  // --- UI RENDER HELPERS ---

  const renderSelectionMenu = () => (
    <View style={styles.selectionGrid}>
      <TouchableOpacity style={styles.selectionCard} onPress={() => setInputMode('text')}>
        <View style={[styles.iconCircle, { backgroundColor: '#E8EDF2' }]}>
          <Ionicons name="text" size={32} color="#0a7ea4" />
        </View>
        <ThemedText style={styles.selectionText}>Write Text</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.selectionCard} onPress={pickImage}>
        <View style={[styles.iconCircle, { backgroundColor: '#EFE8F2' }]}>
          <Ionicons name="image" size={32} color="#9b42f5" />
        </View>
        <ThemedText style={styles.selectionText}>Upload Image</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.selectionCard} onPress={pickDocument}>
        <View style={[styles.iconCircle, { backgroundColor: '#F2E8E8' }]}>
          <Ionicons name="document-text" size={32} color="#f54242" />
        </View>
        <ThemedText style={styles.selectionText}>Upload PDF</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderInputForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity style={styles.backButton} onPress={() => setInputMode('none')}>
            <Ionicons name="arrow-back" size={24} color="#888" />
            <ThemedText style={{ color: '#888', marginLeft: 8 }}>Back to modes</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Keyboard.dismiss()}>
            <Ionicons name="keypad-outline" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {inputMode === 'text' && (
          <View style={styles.inputGroup}>
            <ThemedText type="subtitle">Paste Notes/Transcript</ThemedText>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={6}
              placeholder="What should the Reel be about?"
              placeholderTextColor="#888"
              value={prompt}
              onChangeText={setPrompt}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {inputMode === 'image' && imageUri && (
          <View style={styles.inputGroup}>
            <ThemedText type="subtitle">Selected Image</ThemedText>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity style={styles.removeImageButton} onPress={clearImage}>
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, { minHeight: 60, marginTop: 12 }]}
              multiline
              placeholder="Add extra context... (Optional)"
              placeholderTextColor="#888"
              value={prompt}
              onChangeText={setPrompt}
            />
          </View>
        )}

        {inputMode === 'pdf' && documentUri && (
          <View style={styles.inputGroup}>
            <ThemedText type="subtitle">Selected PDF</ThemedText>
            <View style={styles.documentPreviewContainer}>
              <Ionicons name="document-text" size={32} color="#f54242" />
              <ThemedText style={styles.documentName} numberOfLines={2}>{documentName}</ThemedText>
              <TouchableOpacity onPress={clearDocument}>
                <Ionicons name="close-circle" size={28} color="gray" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, { minHeight: 60, marginTop: 12 }]}
              multiline
              placeholder="What specifically in this PDF Should we cover?"
              placeholderTextColor="#888"
              value={prompt}
              onChangeText={setPrompt}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerateScript}
          disabled={isGenerating}
        >
          <Ionicons name="sparkles" size={20} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.generateButtonText}>
            Generate Reel
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProgressState = () => {
    let message = "Initializing Engine...";
    if (progressStage === 1) message = "Writing Educational Script...";
    if (progressStage === 2) message = "Synthesizing AI Voice...";
    if (progressStage === 3) message = "Aligning On-Screen Subtitles...";
    if (progressStage === 4) message = "Generating Smart Quiz...";

    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" style={{ marginBottom: 20 }} />
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>{message}</ThemedText>

        {/* Simple Progress Bar Visual */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${(progressStage / 4) * 100}%` }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <KeyboardAvoidingView 
        style={styles.modalSheet}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Create Reel 🎬</ThemedText>
          <TouchableOpacity onPress={handleClose} disabled={isGenerating}>
            <Ionicons name="close" size={28} color={isGenerating ? '#ccc' : '#333'} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {isGenerating ? (
            renderProgressState()
          ) : (
            inputMode === 'none' ? renderSelectionMenu() : renderInputForm()
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {inputMode === 'none' && (
        <>
          <TutorialOverlay
            step={TutorialStep.UPLOAD_EXPLAIN}
            message="You can upload each of the file types available."
          />

          <TutorialOverlay
            step={TutorialStep.UPLOAD_SPECIFIC_INSTRUCTION}
            message='Choose "Write Text" and enter "What&apos;s a hackathon?"'
            hideFooter={true}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '65%',
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Selection Menu
  selectionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  selectionCard: {
    width: '45%',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },

  // Input Forms
  formContainer: {
    gap: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  inputGroup: {
    gap: 12,
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    fontSize: 16,
    minHeight: 150,
    color: '#333',
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  documentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    gap: 12,
  },
  documentName: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },

  // Progress State
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  progressBarBackground: {
    width: '80%',
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0a7ea4',
    borderRadius: 4,
  },

  // Buttons
  generateButton: {
    backgroundColor: '#0a7ea4',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
