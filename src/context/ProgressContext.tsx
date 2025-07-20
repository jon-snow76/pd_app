import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTimetable } from './TimetableContext';
import { useTasks } from './TasksContext';
import { useMedication } from './MedicationContext';
import { ProductivityLog } from '../types';
import {
  generateProductivityLog,
  calculateWeeklyStats,
  calculateMonthlyStats,
  getProductivityInsights,
} from '../utils/progressUtils';
import {
  loadProductivityLogs,
  addProductivityLog,
  getProductivityLogForDate,
} from '../utils/storage';
import { formatDateString } from '../utils/helpers';

// Context interface
interface ProgressContextType {
  // Auto-generated daily logs
  generateTodaysLog: () => Promise<void>;
  // Analytics
  getWeeklyStats: () => ReturnType<typeof calculateWeeklyStats>;
  getMonthlyStats: (month: number, year: number) => ReturnType<typeof calculateMonthlyStats>;
  getInsights: () => ReturnType<typeof getProductivityInsights>;
  // Data management
  loadLogs: () => Promise<ProductivityLog[]>;
  saveLog: (log: ProductivityLog) => Promise<void>;
}

// Create context
const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// Provider component
interface ProgressProviderProps {
  children: ReactNode;
}

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const { state: timetableState } = useTimetable();
  const { state: tasksState } = useTasks();
  const { state: medicationState } = useMedication();

  // Auto-generate today's log when data changes
  useEffect(() => {
    generateTodaysLog();
  }, [timetableState.events, tasksState.tasks, medicationState.medications]);

  const generateTodaysLog = async (): Promise<void> => {
    try {
      const today = new Date();
      const todayLog = generateProductivityLog(
        tasksState.tasks,
        timetableState.events,
        medicationState.medications,
        today
      );

      // Check if today's log already exists
      const existingLog = await getProductivityLogForDate(formatDateString(today));
      
      if (!existingLog || existingLog.productivityScore !== todayLog.productivityScore) {
        await addProductivityLog(todayLog);
      }
    } catch (error) {
      console.error('Error generating today\'s log:', error);
    }
  };

  const getWeeklyStats = () => {
    return calculateWeeklyStats([]);
  };

  const getMonthlyStats = (month: number, year: number) => {
    return calculateMonthlyStats([], month, year);
  };

  const getInsights = () => {
    return getProductivityInsights(
      tasksState.tasks,
      timetableState.events,
      medicationState.medications,
      []
    );
  };

  const loadLogs = async (): Promise<ProductivityLog[]> => {
    try {
      return await loadProductivityLogs();
    } catch (error) {
      console.error('Error loading productivity logs:', error);
      return [];
    }
  };

  const saveLog = async (log: ProductivityLog): Promise<void> => {
    try {
      await addProductivityLog(log);
    } catch (error) {
      console.error('Error saving productivity log:', error);
    }
  };

  // Context value
  const contextValue: ProgressContextType = {
    generateTodaysLog,
    getWeeklyStats,
    getMonthlyStats,
    getInsights,
    loadLogs,
    saveLog,
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};

// Custom hook to use the context
export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

export default ProgressContext;