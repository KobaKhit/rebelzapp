import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import AGUIEventCard from './AGUIEventCard';

// Define AG-UI types since @ag-ui/core exports may vary
interface AGUIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AGUIEvent {
  type: string;
  data: Record<string, unknown>;
}

type AGUIEventType = string;

interface EnhancedAGUIChatProps {
  endpoint: string;
  onMessage?: (message: AGUIMessage) => void;
  onEvent?: (event: AGUIEvent) => void;
  enableCopilotActions?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'events';
  events?: Array<{ id: number; title: string; start_time: string; type: string; status: string }>;
  title?: string;
}

export const EnhancedAGUIChat: React.FC<EnhancedAGUIChatProps> = ({ 
  endpoint, 
  onMessage, 
  onEvent,
  enableCopilotActions = true 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Make chat context readable to CopilotKit
  useCopilotReadable({
    description: enableCopilotActions ? "Current chat messages and conversation context" : "",
    value: enableCopilotActions ? {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      isConnected,
      currentUser: localStorage.getItem('userEmail') || 'anonymous'
    } : {}
  });

  // CopilotKit action for creating events
  useCopilotAction({
    name: "createEvent",
    description: enableCopilotActions ? "Create a new event in the Rebelz system" : "",
    parameters: enableCopilotActions ? [
      {
        name: "title",
        type: "string",
        description: "The title of the event",
        required: true,
      },
      {
        name: "description",
        type: "string", 
        description: "Description of the event",
        required: true,
      },
      {
        name: "eventType",
        type: "string",
        description: "Type of event (sports_class, academic_class, workshop, camp, competition)",
        required: true,
      },
      {
        name: "startDateTime",
        type: "string",
        description: "Start date and time in ISO format",
        required: true,
      },
      {
        name: "endDateTime", 
        type: "string",
        description: "End date and time in ISO format",
        required: true,
      }
    ] : [],
    handler: enableCopilotActions ? async ({ title, description, eventType, startDateTime, endDateTime }) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            description,
            event_type: eventType,
            start_datetime: startDateTime,
            end_datetime: endDateTime
          })
        });

        if (response.ok) {
          const event = await response.json();
          return `Successfully created event "${title}" with ID ${event.id}`;
        } else {
          throw new Error('Failed to create event');
        }
      } catch (error) {
        return `Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } : async () => "CopilotKit actions disabled",
  });

  // CopilotKit action for searching events
  useCopilotAction({
    name: "searchEvents",
    description: enableCopilotActions ? "Search for events in the Rebelz system" : "",
    parameters: enableCopilotActions ? [
      {
        name: "query",
        type: "string",
        description: "Search query for events",
        required: false,
      },
      {
        name: "eventType",
        type: "string",
        description: "Filter by event type",
        required: false,
      }
    ] : [],
    handler: enableCopilotActions ? async ({ query, eventType }) => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (query) params.append('search', query);
        if (eventType) params.append('event_type', eventType);

        const response = await fetch(`/api/events?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const events = await response.json() as Array<{ title: string }>;
          return `Found ${events.length} events matching your criteria: ${events.map((e) => e.title).join(', ')}`;
        } else {
          throw new Error('Failed to search events');
        }
      } catch (error) {
        return `Error searching events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } : async () => "CopilotKit actions disabled",
  });

  // CopilotKit action for registering for events
  useCopilotAction({
    name: "registerForEvent",
    description: enableCopilotActions ? "Register the current user for an event" : "",
    parameters: enableCopilotActions ? [
      {
        name: "eventId",
        type: "number",
        description: "The ID of the event to register for",
        required: true,
      }
    ] : [],
    handler: enableCopilotActions ? async ({ eventId }) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/events/${eventId}/register`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          return `Successfully registered for event with ID ${eventId}`;
        } else {
          const error = await response.text();
          throw new Error(error || 'Failed to register for event');
        }
      } catch (error) {
        return `Error registering for event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } : async () => "CopilotKit actions disabled",
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initialize AG-UI connection
  useEffect(() => {
    const connectToAGUI = () => {
      try {
        // Get auth token for SSE connection
        const token = localStorage.getItem('token');
        const eventSourceUrl = token 
          ? `/ai/events?token=${encodeURIComponent(token)}`
          : `/ai/events`;
        
        // Use Server-Sent Events for AG-UI communication
        const eventSource = new EventSource(eventSourceUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          console.log('AG-UI connection established');
        };

        eventSource.onmessage = (event) => {
          try {
            const agUIEvent: AGUIEvent = JSON.parse(event.data);
            
            // Handle different AG-UI event types
            switch (agUIEvent.type) {
              case 'connection':
                console.log('AG-UI connection confirmed:', agUIEvent.data);
                break;
                
              case 'heartbeat':
                // Keep connection alive, no action needed
                break;
                
              case 'message' as AGUIEventType: {
                const messageData = agUIEvent.data as unknown as AGUIMessage;
                if (messageData.role === 'assistant') {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: messageData.content,
                    timestamp: new Date()
                  }]);
                  setIsTyping(false);
                }
                onMessage?.(messageData);
                break;
              }

              case 'thinking' as AGUIEventType:
                setIsTyping(true);
                break;

              case 'error' as AGUIEventType:
                console.error('AG-UI Error:', agUIEvent.data);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: 'Sorry, I encountered an error. Please try again.',
                  timestamp: new Date()
                }]);
                setIsTyping(false);
                break;

              default:
                onEvent?.(agUIEvent);
            }
          } catch (error) {
            console.error('Error parsing AG-UI event:', error);
          }
        };

        eventSource.onerror = (error) => {
          setIsConnected(false);
          setIsTyping(false);
          console.error('AG-UI connection error:', error);
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connectToAGUI();
            }
          }, 5000);
        };

      } catch (error) {
        console.error('Failed to establish AG-UI connection:', error);
        setIsConnected(false);
      }
    };

    connectToAGUI();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [endpoint, onMessage, onEvent]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !isConnected) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Send message to AG-UI endpoint
      const response = await fetch(`/ai/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'message',
          data: {
            role: 'user',
            content: content.trim()
          }
        } as AGUIEvent)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle the response from the message endpoint
      const responseData = await response.json();
      if (responseData.type === 'message' && responseData.data) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: responseData.data.content,
          timestamp: new Date(),
          type: 'text'
        }]);
        setIsTyping(false);
      } else if (responseData.type === 'events' && responseData.data) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: responseData.data.message,
          timestamp: new Date(),
          type: 'events',
          events: responseData.data.events,
          title: responseData.data.title
        }]);
        setIsTyping(false);
      } else if (responseData.type === 'error') {
        throw new Error(responseData.data?.message || 'Unknown error');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I couldn\'t send your message. Please try again.',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Rebelz AI Assistant {enableCopilotActions && '+ CopilotKit'}
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {enableCopilotActions && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              CopilotKit Enabled
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Hello! I'm your enhanced Rebelz AI assistant.</p>
            <p className="text-sm mt-2">
              Ask me about events, registrations, or try commands like:
            </p>
            {enableCopilotActions && (
              <div className="text-xs mt-3 space-y-1 text-gray-400">
                <p>• "Create a basketball workshop for next Friday"</p>
                <p>• "Find all upcoming sports classes"</p>
                <p>• "Register me for the coding bootcamp"</p>
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'user' ? (
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-indigo-600 text-white">
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 text-indigo-200">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="max-w-2xl w-full">
                {message.type === 'events' && message.events ? (
                  <div className="space-y-3">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <AGUIEventCard 
                      events={message.events} 
                      title={message.title || "Your Events"} 
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            )}
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
        <form onSubmit={handleSubmit} className="flex space-x-2">
          {enableCopilotActions ? (
            <CopilotTextarea
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              value={inputMessage}
              onValueChange={(value: string) => setInputMessage(value)}
              placeholder="Type your message or ask me to create events, search, register..."
              disabled={!isConnected || isTyping}
              autosuggestionsConfig={{
                textareaPurpose: "Chat with AI assistant about event management, registrations, and organizational tasks",
                chatApiConfigs: {},
                disabled: true
              }}
            />
          ) : (
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={!isConnected || isTyping}
            />
          )}
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected || isTyping}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default EnhancedAGUIChat;