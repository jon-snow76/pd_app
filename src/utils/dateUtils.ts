import { TimetableEvent, RecurrencePattern } from '../types';
import { formatDateString } from './helpers';

/**
 * Date manipulation utilities for timetable management
 */

/**
 * Adds days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Adds weeks to a date
 */
export const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

/**
 * Gets the next occurrence of a recurring event
 */
export const getNextRecurrence = (event: TimetableEvent, fromDate: Date = new Date()): Date | null => {
  if (!event.isRecurring || !event.recurrencePattern) {
    return null;
  }

  const { type, interval, endDate } = event.recurrencePattern;
  let nextDate = new Date(event.startTime);

  // Find the next occurrence after fromDate
  while (nextDate <= fromDate) {
    switch (type) {
      case 'daily':
        nextDate = addDays(nextDate, interval);
        break;
      case 'weekly':
        nextDate = addWeeks(nextDate, interval);
        break;
      case 'custom':
        // For custom recurrence, treat as daily for now
        nextDate = addDays(nextDate, interval);
        break;
    }
  }

  // Check if the next occurrence is beyond the end date
  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
};

/**
 * Generates all recurring events for a date range
 */
export const generateRecurringEvents = (
  baseEvent: TimetableEvent,
  startDate: Date,
  endDate: Date
): TimetableEvent[] => {
  if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
    return [];
  }

  const events: TimetableEvent[] = [];
  const { type, interval, endDate: recurrenceEndDate } = baseEvent.recurrencePattern;
  
  let currentDate = new Date(baseEvent.startTime);
  const rangeEnd = recurrenceEndDate && recurrenceEndDate < endDate ? recurrenceEndDate : endDate;

  while (currentDate <= rangeEnd) {
    if (currentDate >= startDate) {
      const eventCopy: TimetableEvent = {
        ...baseEvent,
        id: `${baseEvent.id}_${formatDateString(currentDate)}`,
        startTime: new Date(currentDate),
      };
      events.push(eventCopy);
    }

    switch (type) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'custom':
        currentDate = addDays(currentDate, interval);
        break;
    }
  }

  return events;
};

/**
 * Gets all events for a specific date, including recurring events
 */
export const getEventsForDate = (
  events: TimetableEvent[],
  targetDate: Date
): TimetableEvent[] => {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEvents: TimetableEvent[] = [];

  events.forEach(event => {
    // Check if it's a regular event on this date
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate.getTime() === dayStart.getTime()) {
      dayEvents.push(event);
    }
    
    // Check for recurring events
    if (event.isRecurring && event.recurrencePattern) {
      const recurringEvents = generateRecurringEvents(event, dayStart, dayEnd);
      dayEvents.push(...recurringEvents);
    }
  });

  // Sort events by start time
  return dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
};

/**
 * Checks if two time periods overlap
 */
export const doTimePeriodsOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 < end2 && end1 > start2;
};

/**
 * Gets the end time of an event
 */
export const getEventEndTime = (event: TimetableEvent): Date => {
  return new Date(event.startTime.getTime() + event.duration * 60000);
};

/**
 * Finds conflicting events for a given event
 */
export const findConflictingEvents = (
  targetEvent: TimetableEvent,
  allEvents: TimetableEvent[]
): TimetableEvent[] => {
  const targetEnd = getEventEndTime(targetEvent);
  
  return allEvents.filter(event => {
    if (event.id === targetEvent.id) return false;
    
    const eventEnd = getEventEndTime(event);
    return doTimePeriodsOverlap(
      targetEvent.startTime,
      targetEnd,
      event.startTime,
      eventEnd
    );
  });
};

/**
 * Gets available time slots for a given date
 */
export const getAvailableTimeSlots = (
  events: TimetableEvent[],
  date: Date,
  slotDuration: number = 60, // in minutes
  workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
): { start: Date; end: Date }[] => {
  const dayEvents = getEventsForDate(events, date);
  const availableSlots: { start: Date; end: Date }[] = [];
  
  // Parse working hours
  const [startHour, startMinute] = workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = workingHours.end.split(':').map(Number);
  
  const workStart = new Date(date);
  workStart.setHours(startHour, startMinute, 0, 0);
  
  const workEnd = new Date(date);
  workEnd.setHours(endHour, endMinute, 0, 0);
  
  // Sort events by start time
  const sortedEvents = dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  let currentTime = new Date(workStart);
  
  for (const event of sortedEvents) {
    // Check if there's a gap before this event
    if (event.startTime > currentTime) {
      const gapDuration = (event.startTime.getTime() - currentTime.getTime()) / 60000;
      if (gapDuration >= slotDuration) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(event.startTime),
        });
      }
    }
    
    // Move current time to after this event
    const eventEnd = getEventEndTime(event);
    if (eventEnd > currentTime) {
      currentTime = new Date(eventEnd);
    }
  }
  
  // Check if there's time after the last event
  if (currentTime < workEnd) {
    const remainingDuration = (workEnd.getTime() - currentTime.getTime()) / 60000;
    if (remainingDuration >= slotDuration) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(workEnd),
      });
    }
  }
  
  return availableSlots;
};

/**
 * Suggests optimal time for a new event
 */
export const suggestOptimalTime = (
  events: TimetableEvent[],
  date: Date,
  duration: number,
  preferredTime?: string // HH:MM format
): Date | null => {
  const availableSlots = getAvailableTimeSlots(events, date, duration);
  
  if (availableSlots.length === 0) {
    return null;
  }
  
  // If preferred time is specified, try to find a slot around that time
  if (preferredTime) {
    const [hour, minute] = preferredTime.split(':').map(Number);
    const preferred = new Date(date);
    preferred.setHours(hour, minute, 0, 0);
    
    // Find the slot that contains or is closest to the preferred time
    const suitableSlot = availableSlots.find(slot => {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
      return slot.start <= preferred && 
             preferred.getTime() + (duration * 60000) <= slot.end.getTime() &&
             slotDuration >= duration;
    });
    
    if (suitableSlot) {
      return new Date(Math.max(preferred.getTime(), suitableSlot.start.getTime()));
    }
  }
  
  // Return the start of the first available slot
  return availableSlots[0].start;
};

/**
 * Calculates the total scheduled time for a date
 */
export const getTotalScheduledTime = (events: TimetableEvent[], date: Date): number => {
  const dayEvents = getEventsForDate(events, date);
  return dayEvents.reduce((total, event) => total + event.duration, 0);
};

/**
 * Gets events within a date range
 */
export const getEventsInRange = (
  events: TimetableEvent[],
  startDate: Date,
  endDate: Date
): TimetableEvent[] => {
  const rangeEvents: TimetableEvent[] = [];
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayEvents = getEventsForDate(events, currentDate);
    rangeEvents.push(...dayEvents);
    currentDate = addDays(currentDate, 1);
  }
  
  return rangeEvents;
};