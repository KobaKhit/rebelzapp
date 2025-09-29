import React from 'react';
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
  
  const headers = token ? {
    'Authorization': `Bearer ${token}`
  } : undefined;

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      headers={headers}
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
  
  const headers = token ? {
    'Authorization': `Bearer ${token}`
  } : undefined;

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      headers={headers}
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