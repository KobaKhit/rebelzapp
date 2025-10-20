import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth';

type ViewMode = 'admin' | 'consumer';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canSwitchView: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, hasPermission } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>('consumer');

  // Check if user has admin permissions
  const isAdmin = user && (hasPermission('manage_users') || hasPermission('manage_events') || hasPermission('manage_roles'));
  
  // Check if user has student role
  const hasStudentRole = user?.roles?.some(role => role.name === 'student');
  
  // User can switch views if they have both admin permissions AND student role
  const canSwitchView = Boolean(isAdmin && hasStudentRole);

  // Load saved preference from localStorage
  useEffect(() => {
    if (user) {
      const savedMode = localStorage.getItem(`viewMode_${user.id}`) as ViewMode;
      if (savedMode && canSwitchView) {
        setViewModeState(savedMode);
      } else if (isAdmin && !canSwitchView) {
        // If user is admin but can't switch (no student role), force admin view
        setViewModeState('admin');
      } else {
        // Default to consumer view
        setViewModeState('consumer');
      }
    }
  }, [user, isAdmin, canSwitchView]);

  const setViewMode = (mode: ViewMode) => {
    if (user) {
      setViewModeState(mode);
      localStorage.setItem(`viewMode_${user.id}`, mode);
    }
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, canSwitchView }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

