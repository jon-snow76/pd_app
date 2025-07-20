import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Medication, MedicationLog, ValidationResult } from '../types';
import {
  loadMedicines,
  saveMedicines,
  addMedication as addMedicationToStorage,
  updateMedication as updateMedicationInStorage,
  deleteMedication as deleteMedicationFromStorage,
} from '../utils/storage';
import { validateMedication } from '../utils/validation';
import { generateId, formatDateString, formatTimeString } from '../utils/helpers';

// State interface
interface MedicationState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  missedMedications: { medication: Medication; time: string }[];
}

// Action types
type MedicationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MEDICATIONS'; payload: Medication[] }
  | { type: 'ADD_MEDICATION'; payload: Medication }
  | { type: 'UPDATE_MEDICATION'; payload: Medication }
  | { type: 'DELETE_MEDICATION'; payload: string }
  | { type: 'SET_MISSED_MEDICATIONS'; payload: { medication: Medication; time: string }[] }
  | { type: 'REMOVE_MISSED_MEDICATION'; payload: { medicationId: string; time: string } };

// Initial state
const initialState: MedicationState = {
  medications: [],
  loading: false,
  error: null,
  missedMedications: [],
};

// Reducer function
const medicationReducer = (state: MedicationState, action: MedicationAction): MedicationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_MEDICATIONS':
      return { ...state, medications: action.payload, loading: false, error: null };
    
    case 'ADD_MEDICATION':
      return {
        ...state,
        medications: [...state.medications, action.payload],
        error: null,
      };
    
    case 'UPDATE_MEDICATION':
      return {
        ...state,
        medications: state.medications.map(med =>
          med.id === action.payload.id ? action.payload : med
        ),
        error: null,
      };
    
    case 'DELETE_MEDICATION':
      return {
        ...state,
        medications: state.medications.filter(med => med.id !== action.payload),
        error: null,
      };
    
    case 'SET_MISSED_MEDICATIONS':
      return { ...state, missedMedications: action.payload };
    
    case 'REMOVE_MISSED_MEDICATION':
      return {
        ...state,
        missedMedications: state.missedMedications.filter(
          item => !(item.medication.id === action.payload.medicationId && item.time === action.payload.time)
        ),
      };
    
    default:
      return state;
  }
};

// Context interface
interface MedicationContextType {
  state: MedicationState;
  // Medication management
  loadMedications: () => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id'>) => Promise<ValidationResult>;
  updateMedication: (medication: Medication) => Promise<ValidationResult>;
  deleteMedication: (medicationId: string) => Promise<void>;
  // Adherence tracking
  markMedicationTaken: (medicationId: string, time: string, taken: boolean) => Promise<void>;
  getMedicationStatus: (medication: Medication) => {
    takenCount: number;
    totalReminders: number;
    percentage: number;
  };
  getAdherenceStats: (medication: Medication, days?: number) => {
    totalExpected: number;
    totalTaken: number;
    percentage: number;
  };
  // Missed medications
  checkMissedMedications: () => void;
  handleMissedMedication: (medicationId: string, time: string, action: 'taken' | 'skip') => Promise<void>;
  // Utility functions
  toggleMedicationActive: (medicationId: string) => Promise<void>;
  getActiveMedications: () => Medication[];
  getMedicationById: (medicationId: string) => Medication | undefined;
}

// Create context
const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

// Provider component
interface MedicationProviderProps {
  children: ReactNode;
}

export const MedicationProvider: React.FC<MedicationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(medicationReducer, initialState);

  // Load medications on mount
  useEffect(() => {
    loadMedicationsData();
  }, []);

  // Check for missed medications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkMissedMedications();
    }, 60000); // Check every minute

    // Check immediately
    checkMissedMedications();

    return () => clearInterval(interval);
  }, [state.medications]);

  // Medication management functions
  const loadMedicationsData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const medications = await loadMedicines();
      dispatch({ type: 'SET_MEDICATIONS', payload: medications });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load medications' });
      console.error('Error loading medications:', error);
    }
  };

  const addMedication = async (medicationData: Omit<Medication, 'id'>): Promise<ValidationResult> => {
    try {
      // Validate medication data
      const validation = validateMedication(medicationData);
      if (!validation.isValid) {
        return validation;
      }

      // Create medication with ID
      const newMedication: Medication = {
        ...medicationData,
        id: generateId(),
      };

      // Save to storage
      await addMedicationToStorage(newMedication);
      
      // Update state
      dispatch({ type: 'ADD_MEDICATION', payload: newMedication });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to add medication';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error adding medication:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const updateMedication = async (updatedMedication: Medication): Promise<ValidationResult> => {
    try {
      // Validate medication data
      const validation = validateMedication(updatedMedication);
      if (!validation.isValid) {
        return validation;
      }

      // Save to storage
      await updateMedicationInStorage(updatedMedication);
      
      // Update state
      dispatch({ type: 'UPDATE_MEDICATION', payload: updatedMedication });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to update medication';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error updating medication:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const deleteMedication = async (medicationId: string): Promise<void> => {
    try {
      await deleteMedicationFromStorage(medicationId);
      dispatch({ type: 'DELETE_MEDICATION', payload: medicationId });
      
      // Remove from missed medications if present
      dispatch({
        type: 'SET_MISSED_MEDICATIONS',
        payload: state.missedMedications.filter(item => item.medication.id !== medicationId),
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete medication' });
      console.error('Error deleting medication:', error);
    }
  };

  // Adherence tracking functions
  const markMedicationTaken = async (medicationId: string, time: string, taken: boolean): Promise<void> => {
    try {
      const dateKey = formatDateString(new Date());
      
      const updatedMedications = state.medications.map(med => {
        if (med.id === medicationId) {
          // Find existing log entry for this date and time
          const existingLogIndex = med.adherenceLog.findIndex(
            log => log.date === dateKey && log.time === time
          );

          let updatedLog = [...med.adherenceLog];
          
          if (existingLogIndex >= 0) {
            // Update existing entry
            updatedLog[existingLogIndex] = {
              ...updatedLog[existingLogIndex],
              taken,
              takenAt: taken ? new Date() : undefined,
            };
          } else {
            // Add new entry
            const newLogEntry: MedicationLog = {
              date: dateKey,
              time,
              taken,
              takenAt: taken ? new Date() : undefined,
            };
            updatedLog.push(newLogEntry);
          }

          return {
            ...med,
            adherenceLog: updatedLog,
          };
        }
        return med;
      });

      // Save to storage
      await saveMedicines(updatedMedications);
      
      // Update state
      dispatch({ type: 'SET_MEDICATIONS', payload: updatedMedications });

      // Remove from missed medications if taken
      if (taken) {
        dispatch({
          type: 'REMOVE_MISSED_MEDICATION',
          payload: { medicationId, time },
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update medication status' });
      console.error('Error marking medication taken:', error);
    }
  };

  const getMedicationStatus = (medication: Medication) => {
    const today = formatDateString(new Date());
    const todayLogs = medication.adherenceLog.filter(log => log.date === today);
    const totalReminders = medication.reminderTimes.length;
    const takenCount = todayLogs.filter(log => log.taken).length;
    
    return {
      takenCount,
      totalReminders,
      percentage: totalReminders > 0 ? Math.round((takenCount / totalReminders) * 100) : 0,
    };
  };

  const getAdherenceStats = (medication: Medication, days: number = 7) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let totalExpected = 0;
    let totalTaken = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateString(d);
      const dayLogs = medication.adherenceLog.filter(log => log.date === dateKey);
      
      totalExpected += medication.reminderTimes.length;
      totalTaken += dayLogs.filter(log => log.taken).length;
    }
    
    return {
      totalExpected,
      totalTaken,
      percentage: totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0,
    };
  };

  // Missed medications functions
  const checkMissedMedications = (): void => {
    const now = new Date();
    const currentDate = formatDateString(now);
    
    const missed: { medication: Medication; time: string }[] = [];
    
    state.medications.forEach(medication => {
      if (!medication.isActive) return;
      
      medication.reminderTimes.forEach(reminderTime => {
        // Check if this time has passed by more than 30 minutes
        const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
        const reminderDate = new Date();
        reminderDate.setHours(reminderHour, reminderMinute, 0, 0);
        
        const thirtyMinutesLater = new Date(reminderDate.getTime() + 30 * 60 * 1000);
        
        if (now > thirtyMinutesLater) {
          // Check if medication was taken
          const logEntry = medication.adherenceLog.find(
            log => log.date === currentDate && log.time === reminderTime
          );
          
          if (!logEntry || !logEntry.taken) {
            missed.push({ medication, time: reminderTime });
          }
        }
      });
    });
    
    // Only update if the missed medications have changed
    if (missed.length !== state.missedMedications.length ||
        !missed.every(item => 
          state.missedMedications.some(existing => 
            existing.medication.id === item.medication.id && existing.time === item.time
          )
        )) {
      dispatch({ type: 'SET_MISSED_MEDICATIONS', payload: missed });
    }
  };

  const handleMissedMedication = async (medicationId: string, time: string, action: 'taken' | 'skip'): Promise<void> => {
    try {
      await markMedicationTaken(medicationId, time, action === 'taken');
      
      // Remove from missed medications
      dispatch({
        type: 'REMOVE_MISSED_MEDICATION',
        payload: { medicationId, time },
      });
    } catch (error) {
      console.error('Error handling missed medication:', error);
    }
  };

  // Utility functions
  const toggleMedicationActive = async (medicationId: string): Promise<void> => {
    try {
      const medication = state.medications.find(med => med.id === medicationId);
      if (!medication) return;

      const updatedMedication = {
        ...medication,
        isActive: !medication.isActive,
      };

      await updateMedication(updatedMedication);
    } catch (error) {
      console.error('Error toggling medication active status:', error);
    }
  };

  const getActiveMedications = (): Medication[] => {
    return state.medications.filter(med => med.isActive);
  };

  const getMedicationById = (medicationId: string): Medication | undefined => {
    return state.medications.find(med => med.id === medicationId);
  };

  // Context value
  const contextValue: MedicationContextType = {
    state,
    loadMedications: loadMedicationsData,
    addMedication,
    updateMedication,
    deleteMedication,
    markMedicationTaken,
    getMedicationStatus,
    getAdherenceStats,
    checkMissedMedications,
    handleMissedMedication,
    toggleMedicationActive,
    getActiveMedications,
    getMedicationById,
  };

  return (
    <MedicationContext.Provider value={contextValue}>
      {children}
    </MedicationContext.Provider>
  );
};

// Custom hook to use the context
export const useMedication = (): MedicationContextType => {
  const context = useContext(MedicationContext);
  if (context === undefined) {
    throw new Error('useMedication must be used within a MedicationProvider');
  }
  return context;
};

export default MedicationContext;