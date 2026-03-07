import { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { askGemini } from '@/utils/gemini';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export default function AddScreen() {
  const [prompt, setPrompt] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [base64Document, setBase64Document] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');

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
              resolve(dataUrl.split(',')[1]); // Extract base64 part
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
  };

  const handleGenerateScript = async () => {
    if (!prompt.trim() && !base64Image && !base64Document) {
      Alert.alert("Please provide at least some text, an image, or a document.");
      return;
    }

    setIsGenerating(true);
    setGeneratedScript('');

    try {
      const result = await askGemini(prompt, base64Image || undefined, mimeType || undefined, base64Document || undefined, documentMimeType || undefined);
      if (result) {
        setGeneratedScript(result);
      } else {
        setGeneratedScript("Failed to generate script. Please try again.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("An error occurred while generating the script.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
          contentFit="cover"
        />
      }>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Reel Generator 🎬</ThemedText>
        </ThemedView>

        <ThemedText style={styles.subtitle}>
          Turn your notes, transcripts, and lesson slides into engaging short-form video scripts instantly!
        </ThemedText>

        <ThemedView style={styles.inputSection}>
          <ThemedText type="defaultSemiBold">1. Add Text/Notes</ThemedText>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder="Paste your transcript, lesson notes, or ideas here..."
            placeholderTextColor="#888"
            value={prompt}
            onChangeText={setPrompt}
            textAlignVertical="top"
          />
        </ThemedView>

        <ThemedView style={styles.inputSection}>
          <ThemedText type="defaultSemiBold">2. Add Media (Optional)</ThemedText>
          <ThemedText style={styles.hint}>Upload a snapshot or a lesson PDF.</ThemedText>

          {documentUri ? (
            <ThemedView style={styles.documentPreviewContainer}>
              <Ionicons name="document-text" size={24} color="#0a7ea4" />
              <ThemedText style={styles.documentName} numberOfLines={1}>{documentName}</ThemedText>
              <TouchableOpacity onPress={clearDocument}>
                <Ionicons name="close-circle" size={24} color="gray" />
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Ionicons name="document-attach-outline" size={24} color="#0a7ea4" />
              <ThemedText style={styles.uploadButtonText}>Select PDF</ThemedText>
            </TouchableOpacity>
          )}
          
          {imageUri ? (
            <ThemedView style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity style={styles.removeImageButton} onPress={clearImage}>
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#0a7ea4" />
              <ThemedText style={styles.uploadButtonText}>Select Image</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        <TouchableOpacity 
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]} 
          onPress={handleGenerateScript}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" style={styles.loader} />
          ) : (
            <Ionicons name="sparkles" size={20} color="white" style={styles.buttonIcon} />
          )}
          <ThemedText style={styles.generateButtonText}>
            {isGenerating ? 'Generating Script...' : 'Generate Script'}
          </ThemedText>
        </TouchableOpacity>

        {generatedScript ? (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">Generated Script</ThemedText>
            <ScrollView style={styles.scriptScrollView}>
              <ThemedText style={styles.scriptText}>{generatedScript}</ThemedText>
            </ScrollView>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  headerImage: {
    height: '100%',
    width: '100%',
    bottom: 0,
    left: 0,
    position: 'absolute',
    opacity: 0.3,
  },
  inputSection: {
    gap: 8,
  },
  textInput: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    fontSize: 16,
    minHeight: 120,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    opacity: 0.6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  documentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.2)',
    gap: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
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
  generateButton: {
    backgroundColor: '#0a7ea4',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  loader: {
    marginRight: 8,
  },
  resultContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  scriptScrollView: {
    marginTop: 12,
    maxHeight: 400,
  },
  scriptText: {
    lineHeight: 24,
    fontSize: 16,
  },
});
