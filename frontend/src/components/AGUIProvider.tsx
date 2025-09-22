import React, { createContext, useContext, useState, useEffect } from 'react';

// Define AG-UI types since @ag-ui/core exports may vary
interface AGUIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AGUIEvent {
  type: string;
  data: any;
}

interface AGUIContextType {
  isConnected: boolean;
  endpoint: string;
  sendMessage: (content: string) => Promise<void>;
  addEventListener: (listener: (event: AGUIEvent) => void) => () => void;
  removeEventListener: (listener: (event: AGUIEvent) => void) => void;
}

const AGUIContext = createContext<AGUIContextType | null>(null);

interface AGUIProviderProps {
  endpoint: string;
  children: React.ReactNode;
}

export const AGUIProvider: React.FC<AGUIProviderProps> = ({ endpoint, children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [eventListeners, setEventListeners] = useState<Set<(event: AGUIEvent) => void>>(new Set());

  const sendMessage = async (content: string): Promise<void> => {
    if (!isConnected) {
      throw new Error('Not connected to AG-UI endpoint');
    }

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/ai/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'message',
          data: {
            role: 'user',
            content: content
          }
        } as AGUIEvent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending message to AG-UI:', error);
      throw error;
    }
  };

  const addEventListener = (listener: (event: AGUIEvent) => void) => {
    setEventListeners(prev => new Set(prev).add(listener));
    
    return () => {
      setEventListeners(prev => {
        const newSet = new Set(prev);
        newSet.delete(listener);
        return newSet;
      });
    };
  };

  const removeEventListener = (listener: (event: AGUIEvent) => void) => {
    setEventListeners(prev => {
      const newSet = new Set(prev);
      newSet.delete(listener);
      return newSet;
    });
  };

  // Test connection to AG-UI endpoint
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(`/ai/ag-ui-info`);
        if (response.ok) {
          setIsConnected(true);
          console.log('AG-UI connection established');
        } else {
          setIsConnected(false);
          console.warn('AG-UI endpoint not available');
        }
      } catch (error) {
        setIsConnected(false);
        console.error('Failed to connect to AG-UI endpoint:', error);
      }
    };

    testConnection();
    
    // Test connection periodically
    const interval = setInterval(testConnection, 30000);
    
    return () => clearInterval(interval);
  }, [endpoint]);

  const contextValue: AGUIContextType = {
    isConnected,
    endpoint,
    sendMessage,
    addEventListener,
    removeEventListener,
  };

  return (
    <AGUIContext.Provider value={contextValue}>
      {children}
    </AGUIContext.Provider>
  );
};

export const useAGUI = (): AGUIContextType => {
  const context = useContext(AGUIContext);
  if (!context) {
    throw new Error('useAGUI must be used within an AGUIProvider');
  }
  return context;
};

export default AGUIProvider;
