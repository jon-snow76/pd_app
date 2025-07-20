/**
 * Generates a unique ID for data models
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Creates a new TimetableEvent with default values
 */
export const createDefaultTimetableEvent = (overrides: Partial<import('../types').TimetableEvent> = {}): Omit<import('../types').TimetableEvent, 'id'> => {
  return {
    title: '',
    description: '',
    startTime: new Date(),
    duration: 60,
    category: 'personal',
    isRecurring: false,
    notificationEnabled: true,
    ...overrides,
  };
};

/**
 * Creates a new Task with default values
 */
export const createDefaultTask = (overrides: Partial<import('../types').Task> = {}): Omit<import('../types').Task, 'id'> => {
  return {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: new Date(),
    isCompleted: false,
    category: 'general',
    ...overrides,
  };
};

/**
 * Creates a new Medication with default values
 */
export const createDefaultMedication = (overrides: Partial<import('../types').Medication> = {}): Omit<import('../types').Medication, 'id'> => {
  return {
    name: '',
    dosage: '',
    reminderTimes: [],
    isActive: true,
    adherenceLog: [],
    ...overrides,
  };
};

/**
 * Formats a date to YYYY-MM-DD string
 */
export const formatDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Formats a date to HH:MM string
 */
export const formatTimeString = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

/**
 * Parses a time string (HH:MM) and returns minutes since midnight
 */
export const parseTimeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes since midnight to HH:MM format
 */
export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDateString(date) === formatDateString(today);
};

/**
 * Checks if a date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

/**
 * Gets the start and end of a day
 */
export const getDayBounds = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Calculates productivity score based on completed tasks and events
 */
export const calculateProductivityScore = (
  completedTasks: number,
  totalTasks: number,
  completedEvents: number,
  totalEvents: number,
  medicationAdherence: number
): number => {
  const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 40 : 0;
  const eventScore = totalEvents > 0 ? (completedEvents / totalEvents) * 40 : 0;
  const medicationScore = medicationAdherence * 20;
  
  return Math.round(taskScore + eventScore + medicationScore);
};