import React, { useMemo } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

interface CopilotKitProviderProps {
  children: React.ReactNode;
  runtimeUrl?: string;
}

export const CopilotKitProvider: React.FC<CopilotKitProviderProps> = ({ 
  children, 
  runtimeUrl = '/api/copilotkit' 
}) => {
  // Get auth token for CopilotKit
  const token = localStorage.getItem('token');
  
  // Memoize headers to prevent unnecessary re-renders
  const headers = useMemo(() => {
    if (!token) return undefined;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, [token]);

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      headers={headers}
      // Enable streaming for better performance
      showDevConsole={import.meta.env.DEV}
    >
      {children}
    </CopilotKit>
  );
};

interface CopilotKitWrapperProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  runtimeUrl?: string;
}

export const CopilotKitWrapper: React.FC<CopilotKitWrapperProps> = ({ 
  children, 
  showSidebar = false,
  runtimeUrl = '/api/copilotkit'
}) => {
  // Get auth token for CopilotKit
  const token = localStorage.getItem('token');
  
  // Memoize headers to prevent unnecessary re-renders
  const headers = useMemo(() => {
    if (!token) return undefined;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, [token]);

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      headers={headers}
      showDevConsole={import.meta.env.DEV}
    >
      {showSidebar ? (
        <CopilotSidebar>
          {children}
        </CopilotSidebar>
      ) : (
        children
      )}
    </CopilotKit>
  );
};

export default CopilotKitProvider;
