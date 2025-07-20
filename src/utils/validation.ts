import { TimetableEvent, Task, Medication, ValidationResult } from '../types';

/**
 * Validates a timetable event object
 */
export const validateTimetableEvent = (event: Partial<TimetableEvent>): ValidationResult => {
  const errors: string[] = [];

  if (!event.title || event.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!event.startTime || !(event.startTime instanceof Date) || isNaN(event.startTime.getTime())) {
    errors.push('Valid start time is required');
  }

  if (!event.duration || event.duration <= 0) {
    errors.push('Duration must be greater than 0 minutes');
  }

  if (event.duration && event.duration > 1440) { // 24 hours
    errors.push('Duration cannot exceed 24 hours');
  }

  if (!event.category || !['work', 'personal', 'health', 'other'].includes(event.category)) {
    errors.push('Valid category is required');
  }

  if (event.isRecurring && event.recurrencePattern) {
    if (!['daily', 'weekly', 'custom'].includes(event.recurrencePattern.type)) {
      errors.push('Valid recurrence type is required');
    }
    if (event.recurrencePattern.interval <= 0) {
      errors.push('Recurrence interval must be greater than 0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a task object
 */
export const validateTask = (task: Partial<Task>): ValidationResult => {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!task.priority || !['high', 'medium', 'low'].includes(task.priority)) {
    errors.push('Valid priority is required');
  }

  if (!task.dueDate || !(task.dueDate instanceof Date) || isNaN(task.dueDate.getTime())) {
    errors.push('Valid due date is required');
  }

  if (!task.category || task.category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (task.estimatedDuration && task.estimatedDuration <= 0) {
    errors.push('Estimated duration must be greater than 0 minutes');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a medication object
 */
export const validateMedication = (medication: Partial<Medication>): ValidationResult => {
  const errors: string[] = [];

  if (!medication.name || medication.name.trim().length === 0) {
    errors.push('Medication name is required');
  }

  if (!medication.dosage || medication.dosage.trim().length === 0) {
    errors.push('Dosage is required');
  }

  if (!medication.reminderTimes || medication.reminderTimes.length === 0) {
    errors.push('At least one reminder time is required');
  }

  if (medication.reminderTimes) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    medication.reminderTimes.forEach((time, index) => {
      if (!timeRegex.test(time)) {
        errors.push(`Reminder time ${index + 1} must be in HH:MM format`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates time format (HH:MM)
 */
export const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Checks if two timetable events overlap
 */
export const checkEventOverlap = (event1: TimetableEvent, event2: TimetableEvent): boolean => {
  const event1End = new Date(event1.startTime.getTime() + event1.duration * 60000);
  const event2End = new Date(event2.startTime.getTime() + event2.duration * 60000);

  return (
    (event1.startTime < event2End && event1End > event2.startTime) ||
    (event2.startTime < event1End && event2End > event1.startTime)
  );
};

/**
 * Validates that a new event doesn't conflict with existing events
 */
export const validateEventConflicts = (
  newEvent: TimetableEvent,
  existingEvents: TimetableEvent[]
): ValidationResult => {
  const errors: string[] = [];
  
  const conflictingEvents = existingEvents.filter(event => 
    event.id !== newEvent.id && checkEventOverlap(newEvent, event)
  );

  if (conflictingEvents.length > 0) {
    errors.push(`Event conflicts with ${conflictingEvents.length} existing event(s)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};