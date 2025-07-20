import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimetableEvent, Task, Medication, UserPreferences, ProductivityLog, STORAGE_KEYS } from '../types';

/**
 * Generic storage utility functions
 */
const storeData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    throw error;
  }
};

const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue != null) {
      const parsed = JSON.parse(jsonValue);
      // Convert date strings back to Date objects for timetable events
      if (key === STORAGE_KEYS.TIMETABLE_EVENTS) {
        return (parsed as TimetableEvent[]).map(event => ({
          ...event,
          startTime: new Date(event.startTime),
          recurrencePattern: event.recurrencePattern ? {
            ...event.recurrencePattern,
            endDate: event.recurrencePattern.endDate ? new Date(event.recurrencePattern.endDate) : undefined,
          } : undefined,
        })) as T;
      }
      // Convert date strings back to Date objects for tasks
      if (key === STORAGE_KEYS.TASKS) {
        return (parsed as Task[]).map(task => ({
          ...task,
          dueDate: new Date(task.dueDate),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        })) as T;
      }
      return parsed;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Timetable Events Storage
 */
export const saveTimetableEvents = async (events: TimetableEvent[]): Promise<void> => {
  await storeData(STORAGE_KEYS.TIMETABLE_EVENTS, events);
};

export const loadTimetableEvents = async (): Promise<TimetableEvent[]> => {
  return await getData(STORAGE_KEYS.TIMETABLE_EVENTS, []);
};

export const addTimetableEvent = async (event: TimetableEvent): Promise<void> => {
  const events = await loadTimetableEvents();
  events.push(event);
  await saveTimetableEvents(events);
};

export const updateTimetableEvent = async (updatedEvent: TimetableEvent): Promise<void> => {
  const events = await loadTimetableEvents();
  const index = events.findIndex(event => event.id === updatedEvent.id);
  if (index !== -1) {
    events[index] = updatedEvent;
    await saveTimetableEvents(events);
  } else {
    throw new Error(`Event with id ${updatedEvent.id} not found`);
  }
};

export const deleteTimetableEvent = async (eventId: string): Promise<void> => {
  const events = await loadTimetableEvents();
  const filteredEvents = events.filter(event => event.id !== eventId);
  await saveTimetableEvents(filteredEvents);
};

export const getTimetableEventsForDate = async (date: Date): Promise<TimetableEvent[]> => {
  const events = await loadTimetableEvents();
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return events.filter(event => {
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === targetDate.getTime();
  });
};

/**
 * Tasks Storage
 */
export const saveTasks = async (tasks: Task[]): Promise<void> => {
  await storeData(STORAGE_KEYS.TASKS, tasks);
};

export const loadTasks = async (): Promise<Task[]> => {
  return await getData(STORAGE_KEYS.TASKS, []);
};

export const addTask = async (task: Task): Promise<void> => {
  const tasks = await loadTasks();
  tasks.push(task);
  await saveTasks(tasks);
};

export const updateTask = async (updatedTask: Task): Promise<void> => {
  const tasks = await loadTasks();
  const index = tasks.findIndex(task => task.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = updatedTask;
    await saveTasks(tasks);
  } else {
    throw new Error(`Task with id ${updatedTask.id} not found`);
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const tasks = await loadTasks();
  const filteredTasks = tasks.filter(task => task.id !== taskId);
  await saveTasks(filteredTasks);
};

/**
 * Medications Storage
 */
export const saveMedicines = async (medications: Medication[]): Promise<void> => {
  await storeData(STORAGE_KEYS.MEDICATIONS, medications);
};

export const loadMedicines = async (): Promise<Medication[]> => {
  return await getData(STORAGE_KEYS.MEDICATIONS, []);
};

export const addMedication = async (medication: Medication): Promise<void> => {
  const medications = await loadMedicines();
  medications.push(medication);
  await saveMedicines(medications);
};

export const updateMedication = async (updatedMedication: Medication): Promise<void> => {
  const medications = await loadMedicines();
  const index = medications.findIndex(med => med.id === updatedMedication.id);
  if (index !== -1) {
    medications[index] = updatedMedication;
    await saveMedicines(medications);
  } else {
    throw new Error(`Medication with id ${updatedMedication.id} not found`);
  }
};

export const deleteMedication = async (medicationId: string): Promise<void> => {
  const medications = await loadMedicines();
  const filteredMedications = medications.filter(med => med.id !== medicationId);
  await saveMedicines(filteredMedications);
};

/**
 * User Preferences Storage
 */
export const saveUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  await storeData(STORAGE_KEYS.USER_PREFERENCES, preferences);
};

export const loadUserPreferences = async (): Promise<UserPreferences> => {
  return await getData(STORAGE_KEYS.USER_PREFERENCES, {
    notificationsEnabled: true,
    defaultEventDuration: 60,
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    reminderOffset: 15,
  });
};

/**
 * Productivity Logs Storage
 */
export const saveProductivityLogs = async (logs: ProductivityLog[]): Promise<void> => {
  await storeData(STORAGE_KEYS.PRODUCTIVITY_LOGS, logs);
};

export const loadProductivityLogs = async (): Promise<ProductivityLog[]> => {
  return await getData(STORAGE_KEYS.PRODUCTIVITY_LOGS, []);
};

export const addProductivityLog = async (log: ProductivityLog): Promise<void> => {
  const logs = await loadProductivityLogs();
  const existingIndex = logs.findIndex(l => l.date === log.date);
  
  if (existingIndex !== -1) {
    logs[existingIndex] = log;
  } else {
    logs.push(log);
  }
  
  await saveProductivityLogs(logs);
};

export const getProductivityLogForDate = async (date: string): Promise<ProductivityLog | null> => {
  const logs = await loadProductivityLogs();
  return logs.find(log => log.date === date) || null;
};