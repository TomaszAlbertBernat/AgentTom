import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { FiSettings, FiMoon, FiSun } from 'react-icons/fi';
import { conversationService } from '../services/api';
import { Message } from '../types/api';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import './Chat.css';

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

  const fontSizeClass = `font-${fontSize as FontSize}`;

  return (
    <div className={`chat-container ${isDarkMode ? 'dark' : ''}`}>
      <div className="chat-header">
        <div>
          <button className="icon-button" onClick={handleClearChat}>
            <FiSettings />
          </button>
          <button className="icon-button" onClick={handleToggleTheme}>
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </button>
        </div>
      </div>

      <div className="chat-messages-container">
        <div className="messages-box">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.role}`}
            >
              <div className={`message-bubble ${message.role} ${fontSizeClass}`}>
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <input
            className={`chat-input ${fontSizeClass}`}
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}; 