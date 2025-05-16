import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  IconButton,
} from '@chakra-ui/react';
import { FiSettings, FiMoon, FiSun } from 'react-icons/fi';
import { conversationService } from '../services/api';
import { Message } from '../types/api';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';

type FontSize = 'small' | 'medium' | 'large';

export const Chat = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fontSize } = useSettingsStore();

  const { messages, currentConversationId, addMessage, setConversationId, clearMessages } =
    useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await conversationService.sendMessage(input, currentConversationId || undefined);
      setConversationId(response.conversation_id);

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.response,
        role: 'assistant',
        created_at: new Date().toISOString(),
      };

      addMessage(aiMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    clearMessages();
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const fontSizeMap: Record<FontSize, string> = {
    small: 'sm',
    medium: 'md',
    large: 'lg',
  };

  return (
    <Box maxW="4xl" mx="auto" mt={8} p={4}>
      <Flex justify="space-between" mb={4}>
        <Box>
          <IconButton
            aria-label="Settings"
            variant="ghost"
            onClick={handleClearChat}
            mr={2}
          >
            <FiSettings />
          </IconButton>
          <IconButton
            aria-label="Toggle theme"
            variant="ghost"
            onClick={handleToggleTheme}
          >
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </IconButton>
        </Box>
      </Flex>

      <VStack gap={4} align="stretch" h="80vh">
        <Box
          flex={1}
          overflowY="auto"
          p={4}
          borderWidth={1}
          borderRadius="lg"
          bg={isDarkMode ? 'gray.700' : 'gray.50'}
        >
          {messages.map((message: Message) => (
            <Flex
              key={message.id}
              justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
              mb={4}
            >
              <Box
                maxW="70%"
                p={3}
                borderRadius="lg"
                bg={message.role === 'user' ? 'blue.500' : isDarkMode ? 'gray.600' : 'white'}
                color={message.role === 'user' ? 'white' : 'inherit'}
                boxShadow="sm"
              >
                <Text fontSize={fontSizeMap[fontSize as FontSize]} whiteSpace="pre-wrap">
                  {message.content}
                </Text>
              </Box>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Flex>
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            fontSize={fontSizeMap[fontSize as FontSize]}
          />
          <Button
            ml={2}
            colorScheme="blue"
            onClick={handleSend}
            loading={isLoading}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}; 