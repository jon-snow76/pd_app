import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { TimetableEvent, ValidationResult } from '../types';
import {
  loadTimetableEvents,
  saveTimetableEvents,
  addTimetableEvent as addEventToStorage,
  updateTimetableEvent as updateEventInStorage,
  deleteTimetableEvent as deleteEventFromStorage,
  getTimetableEventsForDate,
} from '../utils/storage';
import {
  validateTimetableEvent,
  validateEventConflicts,
} from '../utils/validation';
import {
  getEventsForDate,
  findConflictingEvents,
  generateRecurringEvents,
} from '../utils/dateUtils';
import { generateId } from '../utils/helpers';
import { useDateNavigation } from '../hooks/useDateNavigation';
import { useRecurringEvents } from '../hooks/useRecurringEvents';
import { RecurrencePattern } from '../services/RecurringEventsService';

// State interface
interface TimetableState {
  events: TimetableEvent[];
  recurringEvents: TimetableEvent[];
  selectedDate: Date;
  loading: boolean;
  error: string | null;
  conflicts: TimetableEvent[];
  viewMode: 'day' | 'week' | 'month';
}

// Action types
type TimetableAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EVENTS'; payload: TimetableEvent[] }
  | { type: 'SET_RECURRING_EVENTS'; payload: TimetableEvent[] }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_VIEW_MODE'; payload: 'day' | 'week' | 'month' }
  | { type: 'ADD_EVENT'; payload: TimetableEvent }
  | { type: 'UPDATE_EVENT'; payload: TimetableEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_CONFLICTS'; payload: TimetableEvent[] }
  | { type: 'CLEAR_CONFLICTS' };

// Initial state
const initialState: TimetableState = {
  events: [],
  recurringEvents: [],
  selectedDate: new Date(),
  loading: false,
  error: null,
  conflicts: [],
  viewMode: 'day',
};

// Reducer function
const timetableReducer = (state: TimetableState, action: TimetableAction): TimetableState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_EVENTS':
      return { ...state, events: action.payload, loading: false, error: null };
    
    case 'SET_RECURRING_EVENTS':
      return { ...state, recurringEvents: action.payload, loading: false, error: null };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload],
        error: null,
      };
    
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id ? action.payload : event
        ),
        error: null,
      };
    
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload),
        error: null,
      };
    
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.payload };
    
    case 'CLEAR_CONFLICTS':
      return { ...state, conflicts: [] };
    
    default:
      return state;
  }
};

// Context interface
interface TimetableContextType {
  state: TimetableState;
  // Event management
  loadEvents: () => Promise<void>;
  addEvent: (event: Omit<TimetableEvent, 'id'>) => Promise<ValidationResult>;
  updateEvent: (event: TimetableEvent) => Promise<ValidationResult>;
  deleteEvent: (eventId: string) => Promise<void>;
  // Recurring event management
  addRecurringEvent: (event: Omit<TimetableEvent, 'id'>, pattern: RecurrencePattern) => Promise<ValidationResult>;
  updateRecurringEvent: (event: TimetableEvent, pattern?: RecurrencePattern) => Promise<ValidationResult>;
  deleteRecurringEvent: (eventId: string) => Promise<void>;
  // Date management
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'day' | 'week' | 'month') => void;
  getEventsForSelectedDate: () => TimetableEvent[];
  getEventsForDate: (date: Date) => TimetableEvent[];
  getEventsInRange: (startDate: Date, endDate: Date) => TimetableEvent[];
  // Historical data
  getCompletedEventsForDate: (date: Date) => TimetableEvent[];
  getEventHistory: (eventId: string) => TimetableEvent[];
  // Conflict management
  checkEventConflicts: (event: TimetableEvent) => TimetableEvent[];
  validateAndCheckConflicts: (event: Partial<TimetableEvent>) => ValidationResult;
  clearConflicts: () => void;
  // Utility functions
  getTotalScheduledTimeForDate: (date: Date) => number;
  getAvailableSlots: (date: Date, duration?: number) => { start: Date; end: Date }[];
}

// Create context
const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

// Provider component
interface TimetableProviderProps {
  children: ReactNode;
}

export const TimetableProvider: React.FC<TimetableProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(timetableReducer, initialState);
  const { currentDate } = useDateNavigation();
  const { getEventsForDate, getEventsInRange } = useRecurringEvents();

  // Sync selected date with date navigation service
  useEffect(() => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: currentDate });
  }, [currentDate]);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Event management functions
  const loadEvents = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const events = await loadTimetableEvents();
      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load events' });
      console.error('Error loading events:', error);
    }
  };

  const addEvent = async (eventData: Omit<TimetableEvent, 'id'>): Promise<ValidationResult> => {
    try {
      // Validate event data
      const validation = validateTimetableEvent(eventData);
      if (!validation.isValid) {
        return validation;
      }

      // Create event with ID
      const newEvent: TimetableEvent = {
        ...eventData,
        id: generateId(),
      };

      // Check for conflicts
      const conflicts = findConflictingEvents(newEvent, state.events);
      if (conflicts.length > 0) {
        dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
        return {
          isValid: false,
          errors: [`Event conflicts with ${conflicts.length} existing event(s)`],
        };
      }

      // Save to storage
      await addEventToStorage(newEvent);
      
      // Update state
      dispatch({ type: 'ADD_EVENT', payload: newEvent });
      dispatch({ type: 'CLEAR_CONFLICTS' });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to add event';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error adding event:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const updateEvent = async (updatedEvent: TimetableEvent): Promise<ValidationResult> => {
    try {
      // Validate event data
      const validation = validateTimetableEvent(updatedEvent);
      if (!validation.isValid) {
        return validation;
      }

      // Check for conflicts (excluding the event being updated)
      const otherEvents = state.events.filter(event => event.id !== updatedEvent.id);
      const conflicts = findConflictingEvents(updatedEvent, otherEvents);
      if (conflicts.length > 0) {
        dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
        return {
          isValid: false,
          errors: [`Event conflicts with ${conflicts.length} existing event(s)`],
        };
      }

      // Save to storage
      await updateEventInStorage(updatedEvent);
      
      // Update state
      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
      dispatch({ type: 'CLEAR_CONFLICTS' });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to update event';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error updating event:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    try {
      await deleteEventFromStorage(eventId);
      dispatch({ type: 'DELETE_EVENT', payload: eventId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete event' });
      console.error('Error deleting event:', error);
    }
  };

  // Recurring event management functions
  const addRecurringEvent = async (eventData: Omit<TimetableEvent, 'id'>, pattern: RecurrencePattern): Promise<ValidationResult> => {
    try {
      // Validate event data
      const validation = validateTimetableEvent(eventData);
      if (!validation.isValid) {
        return validation;
      }

      // Create recurring event with ID
      const newEvent: TimetableEvent = {
        ...eventData,
        id: generateId(),
        isRecurring: true,
        recurrencePattern: pattern,
      };

      // Save to storage
      await addEventToStorage(newEvent);
      
      // Update state (add to recurring events)
      dispatch({ type: 'SET_RECURRING_EVENTS', payload: [...state.recurringEvents, newEvent] });
      dispatch({ type: 'CLEAR_CONFLICTS' });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to add recurring event';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error adding recurring event:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const updateRecurringEvent = async (updatedEvent: TimetableEvent, pattern?: RecurrencePattern): Promise<ValidationResult> => {
    try {
      // Validate event data
      const validation = validateTimetableEvent(updatedEvent);
      if (!validation.isValid) {
        return validation;
      }

      // Update pattern if provided
      if (pattern) {
        updatedEvent.recurrencePattern = pattern;
      }

      // Save to storage
      await updateEventInStorage(updatedEvent);
      
      // Update state
      if (updatedEvent.isRecurring) {
        dispatch({ 
          type: 'SET_RECURRING_EVENTS', 
          payload: state.recurringEvents.map(event =>
            event.id === updatedEvent.id ? updatedEvent : event
          )
        });
      } else {
        dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
      }
      dispatch({ type: 'CLEAR_CONFLICTS' });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to update recurring event';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error updating recurring event:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const deleteRecurringEvent = async (eventId: string): Promise<void> => {
    try {
      await deleteEventFromStorage(eventId);
      dispatch({ 
        type: 'SET_RECURRING_EVENTS', 
        payload: state.recurringEvents.filter(event => event.id !== eventId)
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete recurring event' });
      console.error('Error deleting recurring event:', error);
    }
  };

  // Date management functions
  const setSelectedDate = (date: Date): void => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
    dispatch({ type: 'CLEAR_CONFLICTS' });
  };

  const setViewMode = (mode: 'day' | 'week' | 'month'): void => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const getEventsForSelectedDate = (): TimetableEvent[] => {
    return getEventsForDate(state.events, state.recurringEvents, state.selectedDate);
  };

  const getEventsForDateUtil = (date: Date): TimetableEvent[] => {
    return getEventsForDate(state.events, state.recurringEvents, date);
  };

  const getEventsInRangeUtil = (startDate: Date, endDate: Date): TimetableEvent[] => {
    return getEventsInRange(state.events, state.recurringEvents, startDate, endDate);
  };

  // Historical data functions
  const getCompletedEventsForDate = (date: Date): TimetableEvent[] => {
    const allEvents = getEventsForDate(state.events, state.recurringEvents, date);
    return allEvents.filter(event => event.isCompleted);
  };

  const getEventHistory = (eventId: string): TimetableEvent[] => {
    // For recurring events, this would return all instances
    // For now, return the base event
    const event = state.events.find(e => e.id === eventId) || 
                  state.recurringEvents.find(e => e.id === eventId);
    return event ? [event] : [];
  };

  // Conflict management functions
  const checkEventConflicts = (event: TimetableEvent): TimetableEvent[] => {
    const conflicts = findConflictingEvents(event, state.events);
    dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
    return conflicts;
  };

  const validateAndCheckConflicts = (eventData: Partial<TimetableEvent>): ValidationResult => {
    // First validate the event data
    const validation = validateTimetableEvent(eventData);
    if (!validation.isValid) {
      return validation;
    }

    // Then check for conflicts if it's a complete event
    if (eventData.id && eventData.startTime && eventData.duration) {
      const event = eventData as TimetableEvent;
      const conflicts = checkEventConflicts(event);
      
      if (conflicts.length > 0) {
        return {
          isValid: false,
          errors: [`Event conflicts with ${conflicts.length} existing event(s)`],
        };
      }
    }

    return { isValid: true, errors: [] };
  };

  const clearConflicts = (): void => {
    dispatch({ type: 'CLEAR_CONFLICTS' });
  };

  // Utility functions
  const getTotalScheduledTimeForDate = (date: Date): number => {
    const dayEvents = getEventsForDate(state.events, date);
    return dayEvents.reduce((total, event) => total + event.duration, 0);
  };

  const getAvailableSlots = (date: Date, duration: number = 60): { start: Date; end: Date }[] => {
    // This is a simplified version - you might want to import from dateUtils
    const dayEvents = getEventsForDate(state.events, date);
    const workingHours = { start: '09:00', end: '17:00' };
    
    // For now, return a basic implementation
    // In a real app, you'd use the getAvailableTimeSlots from dateUtils
    const slots: { start: Date; end: Date }[] = [];
    
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const workStart = new Date(date);
    workStart.setHours(startHour, startMinute, 0, 0);
    
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMinute, 0, 0);
    
    if (dayEvents.length === 0) {
      slots.push({ start: workStart, end: workEnd });
    }
    
    return slots;
  };

  // Context value
  const contextValue: TimetableContextType = {
    state,
    loadEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    addRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
    setSelectedDate,
    setViewMode,
    getEventsForSelectedDate,
    getEventsForDate: getEventsForDateUtil,
    getEventsInRange: getEventsInRangeUtil,
    getCompletedEventsForDate,
    getEventHistory,
    checkEventConflicts,
    validateAndCheckConflicts,
    clearConflicts,
    getTotalScheduledTimeForDate,
    getAvailableSlots,
  };

  return (
    <TimetableContext.Provider value={contextValue}>
      {children}
    </TimetableContext.Provider>
  );
};

// Custom hook to use the context
export const useTimetable = (): TimetableContextType => {
  const context = useContext(TimetableContext);
  if (context === undefined) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};

export default TimetableContext;