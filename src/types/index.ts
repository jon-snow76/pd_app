// Core data models for Daily Productivity Scheduler

export interface TimetableEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  duration: number; // in minutes
  category: 'work' | 'personal' | 'health' | 'other';
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  notificationEnabled: boolean;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'custom';
  interval: number;
  endDate?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
  category: string;
  estimatedDuration?: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  reminderTimes: string[];
  isActive: boolean;
  adherenceLog: MedicationLog[];
}

export interface MedicationLog {
  date: string;
  time: string;
  taken: boolean;
  takenAt?: Date;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  defaultEventDuration: number;
  workingHours: {
    start: string;
    end: string;
  };
  reminderOffset: number; // minutes before event
}

export interface ProductivityLog {
  date: string;
  completedTasks: number;
  totalTasks: number;
  completedEvents: number;
  totalEvents: number;
  medicationAdherence: number; // percentage
  productivityScore: number;
}

// Validation types
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

// Storage keys
export const STORAGE_KEYS = {
  TIMETABLE_EVENTS: '@timetable_events',
  TASKS: '@tasks',
  MEDICATIONS: '@medications',
  USER_PREFERENCES: '@user_preferences',
  PRODUCTIVITY_LOGS: '@productivity_logs',
} as const;