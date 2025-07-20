import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserPreferences } from '../types';
import { loadUserPreferences, saveUserPreferences } from '../utils/storage';

// State interface
interface AppState {
  preferences: UserPreferences;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'UPDATE_PREFERENCE'; payload: { key: keyof UserPreferences; value: any } };

// Initial state
const initialState: AppState = {
  preferences: {
    notificationsEnabled: true,
    defaultEventDuration: 60,
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    reminderOffset: 15,
  },
  isInitialized: false,
  loading: false,
  error: null,
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload, loading: false, error: null };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'UPDATE_PREFERENCE':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.payload.key]: action.payload.value,
        },
      };
    
    default:
      return state;
  }
};

// Context interface
interface AppContextType {
  state: AppState;
  loadPreferences: () => Promise<void>;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  savePreferences: () => Promise<void>;
  resetPreferences: () => Promise<void>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Preference management functions
  const loadPreferences = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const preferences = await loadUserPreferences();
      dispatch({ type: 'SET_PREFERENCES', payload: preferences });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load preferences' });
      console.error('Error loading preferences:', error);
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> => {
    try {
      dispatch({ type: 'UPDATE_PREFERENCE', payload: { key, value } });
      
      // Save updated preferences
      const updatedPreferences = {
        ...state.preferences,
        [key]: value,
      };
      await saveUserPreferences(updatedPreferences);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update preference' });
      console.error('Error updating preference:', error);
    }
  };

  const savePreferences = async (): Promise<void> => {
    try {
      await saveUserPreferences(state.preferences);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save preferences' });
      console.error('Error saving preferences:', error);
    }
  };

  const resetPreferences = async (): Promise<void> => {
    try {
      const defaultPreferences = initialState.preferences;
      dispatch({ type: 'SET_PREFERENCES', payload: defaultPreferences });
      await saveUserPreferences(defaultPreferences);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to reset preferences' });
      console.error('Error resetting preferences:', error);
    }
  };

  // Context value
  const contextValue: AppContextType = {
    state,
    loadPreferences,
    updatePreference,
    savePreferences,
    resetPreferences,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;