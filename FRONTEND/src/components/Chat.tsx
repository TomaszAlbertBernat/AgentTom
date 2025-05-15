import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  useToast,
} from '@chakra-ui/react';
import { conversationService } from '../services/api';
import { Message } from '../types/api';

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

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

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await conversationService.sendMessage(input, conversationId);
      setConversationId(response.conversation_id);

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.response,
        role: 'assistant',
        created_at: new Date().toISOString(),
      };

      setMessages((prev: Message[]) => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        status: 'error',
        duration: 5000,
      });
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

  return (
    <Box maxW="4xl" mx="auto" mt={8} p={4}>
      <VStack spacing={4} align="stretch" h="80vh">
        <Box
          flex={1}
          overflowY="auto"
          p={4}
          borderWidth={1}
          borderRadius="lg"
          bg="gray.50"
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
                bg={message.role === 'user' ? 'blue.500' : 'white'}
                color={message.role === 'user' ? 'white' : 'black'}
                boxShadow="sm"
              >
                <Text whiteSpace="pre-wrap">{message.content}</Text>
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
          />
          <Button
            ml={2}
            colorScheme="blue"
            onClick={handleSend}
            isLoading={isLoading}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}; 