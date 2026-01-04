
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { authenticatedPost } from '@/utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  visible: boolean;
  onClose: () => void;
  context: 'nutrition' | 'workout' | 'general';
}

export default function AIAssistant({ visible, onClose, context }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI fitness coach. How can I help you with your ${context} today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // TODO: Backend Integration - Call AI coaching API endpoint
      const response = await authenticatedPost('/api/ai/coach', {
        message: input,
        context,
        history: messages.slice(-5),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || 'I can help you with that!',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[AIAssistant] Error sending message:', error);
      
      // Fallback response
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I am currently unable to process your request. Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.headerTitle}>AI Coach</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="close"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <IconSymbol
              ios_icon_name="arrow.up.circle.fill"
              android_material_icon_name="send"
              size={32}
              color={input.trim() ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: colors.text,
  },
  loadingContainer: {
    alignSelf: 'flex-start',
    padding: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
