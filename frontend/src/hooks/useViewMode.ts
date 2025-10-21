import { useContext } from 'react';
import { ViewModeContext } from '../contexts/ViewModeContext';

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

