import { useCallback, useMemo } from 'react';
import { recurringEventsService, RecurrencePattern } from '../services/RecurringEventsService';
import { TimetableEvent } from '../types';

/**
 * Hook for managing recurring events
 */
export const useRecurringEvents = () => {
  const generateRecurringInstances = useCallback((
    baseEvent: TimetableEvent,
    startDate: Date,
    endDate: Date
  ): TimetableEvent[] => {
    return recurringEventsService.generateRecurringInstances(baseEvent, startDate, endDate);
  }, []);

  const createEventInstance = useCallback((
    baseEvent: TimetableEvent,
    date: Date
  ): TimetableEvent => {
    return recurringEventsService.createEventInstance(baseEvent, date);
  }, []);

  const findNextOccurrence = useCallback((
    baseEvent: TimetableEvent,
    fromDate: Date
  ): Date => {
    return recurringEventsService.findNextOccurrence(baseEvent, fromDate);
  }, []);

  const shouldEventOccurOnDate = useCallback((
    baseEvent: TimetableEvent,
    targetDate: Date
  ): boolean => {
    return recurringEventsService.shouldEventOccurOnDate(baseEvent, targetDate);
  }, []);

  const getRecurringEventsForDate = useCallback((
    recurringEvents: TimetableEvent[],
    targetDate: Date
  ): TimetableEvent[] => {
    return recurringEventsService.getRecurringEventsForDate(recurringEvents, targetDate);
  }, []);

  const validateRecurrencePattern = useCallback((
    pattern: RecurrencePattern
  ): boolean => {
    return recurringEventsService.validateRecurrencePattern(pattern);
  }, []);

  const getRecurrenceDescription = useCallback((
    pattern: RecurrencePattern
  ): string => {
    return recurringEventsService.getRecurrenceDescription(pattern);
  }, []);

  const getUpcomingOccurrences = useCallback((
    baseEvent: TimetableEvent,
    count?: number
  ): Date[] => {
    return recurringEventsService.getUpcomingOccurrences(baseEvent, count);
  }, []);

  // Helper function to combine regular and recurring events for a specific date
  const getEventsForDate = useCallback((
    regularEvents: TimetableEvent[],
    recurringEvents: TimetableEvent[],
    targetDate: Date
  ): TimetableEvent[] => {
    // Get regular events for the date
    const dateEvents = regularEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === targetDate.toDateString();
    });

    // Get recurring event instances for the date
    const recurringInstances = getRecurringEventsForDate(recurringEvents, targetDate);

    // Combine and sort by start time
    return [...dateEvents, ...recurringInstances].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [getRecurringEventsForDate]);

  // Helper function to get all events in a date range
  const getEventsInRange = useCallback((
    regularEvents: TimetableEvent[],
    recurringEvents: TimetableEvent[],
    startDate: Date,
    endDate: Date
  ): TimetableEvent[] => {
    // Get regular events in range
    const rangeEvents = regularEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Get recurring event instances in range
    const recurringInstances: TimetableEvent[] = [];
    recurringEvents.forEach(baseEvent => {
      const instances = generateRecurringInstances(baseEvent, startDate, endDate);
      recurringInstances.push(...instances);
    });

    // Combine and sort by start time
    return [...rangeEvents, ...recurringInstances].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [generateRecurringInstances]);

  // Predefined recurrence patterns for easy use
  const recurrencePatterns = useMemo(() => ({
    daily: { type: 'daily' as const, interval: 1 },
    weekly: { type: 'weekly' as const, interval: 1 },
    monthly: { type: 'monthly' as const, interval: 1 },
    everyTwoDays: { type: 'daily' as const, interval: 2 },
    everyWeekday: { type: 'custom' as const, interval: 1, daysOfWeek: [1, 2, 3, 4, 5] },
    everyWeekend: { type: 'custom' as const, interval: 1, daysOfWeek: [0, 6] },
  }), []);

  return {
    generateRecurringInstances,
    createEventInstance,
    findNextOccurrence,
    shouldEventOccurOnDate,
    getRecurringEventsForDate,
    validateRecurrencePattern,
    getRecurrenceDescription,
    getUpcomingOccurrences,
    getEventsForDate,
    getEventsInRange,
    recurrencePatterns,
  };
};

export default useRecurringEvents;