import React, { useState, useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatAboutReel } from '@/utils/gemini';
import { useTutorial, TutorialStep } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  topicContext: string;
}

export function ChatModal({ isVisible, onClose, topicContext }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { currentStep, nextStep } = useTutorial();

  // Tutorial measurement
  const closeButtonRef = useRef<View>(null);
  const [closeButtonRect, setCloseButtonRect] = useState<any>(null);

  // When modal becomes visible or topic changes, we could optionally reset chat
  useEffect(() => {
    if (isVisible) {
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            text: "Hi! I'm your Reel Tutor. Ask me any questions about the current topic!",
            isUser: false,
          }
        ]);
      }
    }
  }, [isVisible, topicContext]);

  const handleSend = async () => {
    if (!inputText.trim() || !topicContext) return;

    const userMsgText = inputText.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: userMsgText,
      isUser: true,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    // Format history for Gemini
    const chatHistory = messages
      .filter(m => m.id !== 'welcome') // Skip welcome message to save tokens
      .map(m => ({
        role: m.isUser ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    const responseText = await chatAboutReel(topicContext, userMsgText, chatHistory);

    setIsLoading(false);
    if (responseText) {
      setMessages(prev => [
        ...prev, 
        {
          id: (Date.now() + 1).toString(),
          text: responseText,
          isUser: false,
        }
      ]);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        {/* Transparent background to dismiss modal */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tutor Chat</Text>
            <TouchableOpacity 
              ref={closeButtonRef}
              onPress={() => {
                if (currentStep === TutorialStep.ASSISTANT_OPEN) nextStep();
                onClose();
              }} 
              style={{ padding: 4 }}
              onLayout={() => {
                closeButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setCloseButtonRect({ x, y, width, height });
                });
              }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={[
                styles.messageBubble, 
                item.isUser ? styles.userBubble : styles.aiBubble
              ]}>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask a question..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]} 
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TutorialOverlay
          step={TutorialStep.ASSISTANT_OPEN}
          message="Here you can ask questions about anything."
          subMessage="Click the X to close the menu"
          targetRect={closeButtonRect}
          arrowDirection="down"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  }
});
