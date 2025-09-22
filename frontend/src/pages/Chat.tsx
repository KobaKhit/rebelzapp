import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import AGUIChat from '../components/AGUIChat';
import AGUIProvider from '../components/AGUIProvider';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import type { ChatMessage } from '../types';

// Define AG-UI types since @ag-ui/core exports may vary
interface AGUIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AGUIEvent {
  type: string;
  data: any;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useAGUI, setUseAGUI] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => aiApi.getSuggestions(),
  });

  const { data: helpTopics = [] } = useQuery({
    queryKey: ['help-topics'],
    queryFn: () => aiApi.getHelpTopics(),
  });

  const chatMutation = useMutation({
    mutationFn: (messages: ChatMessage[]) => aiApi.chat(messages),
    onSuccess: (response) => {
      const assistantMessage = response.choices[0]?.message;
      if (assistantMessage) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage.content,
        }]);
      }
      setIsTyping(false);
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
      setIsTyping(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsTyping(true);

    chatMutation.mutate(newMessages);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleHelpTopicClick = (topic: any) => {
    const message = `Tell me about ${topic.title.toLowerCase()}`;
    setInputMessage(message);
  };

  const startNewConversation = () => {
    setMessages([]);
    setInputMessage('');
  };

  const handleAGUIMessage = (message: AGUIMessage) => {
    console.log('AG-UI Message received:', message);
  };

  const handleAGUIEvent = (event: AGUIEvent) => {
    console.log('AG-UI Event received:', event);
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-sm border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <SparklesIcon className="h-5 w-5 text-indigo-500" />
            </div>
            <button
              onClick={startNewConversation}
              className="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              New Conversation
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-900">Suggestions</h3>
              </div>
              <div className="space-y-2">
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 text-xs text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help Topics */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <QuestionMarkCircleIcon className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-900">Help Topics</h3>
            </div>
            <div className="space-y-2">
              {helpTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleHelpTopicClick(topic)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">
                    {topic.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {topic.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Chat with Rebelz Assistant
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Hello {user?.full_name || user?.email}! {useAGUI ? 'Enhanced AG-UI powered chat' : 'Traditional chat interface'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">AG-UI</span>
                <button
                  onClick={() => setUseAGUI(!useAGUI)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    useAGUI ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      useAGUI ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          {useAGUI ? (
            <AGUIProvider endpoint="/ai">
              <div className="flex-1">
                <AGUIChat
                  endpoint="/ai"
                  onMessage={handleAGUIMessage}
                  onEvent={handleAGUIEvent}
                />
              </div>
            </AGUIProvider>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Start a conversation</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Ask me anything about managing events, users, or your organization.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={chatMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Chat;