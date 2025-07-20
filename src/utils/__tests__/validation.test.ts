import {
  validateTimetableEvent,
  validateTask,
  validateMedication,
  validateTimeFormat,
  checkEventOverlap,
  validateEventConflicts,
} from '../validation';
import { TimetableEvent, Task, Medication } from '../../types';

describe('Validation Utils', () => {
  describe('validateTimetableEvent', () => {
    const validEvent: Partial<TimetableEvent> = {
      title: 'Test Event',
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    };

    it('should validate a correct timetable event', () => {
      const result = validateTimetableEvent(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject event without title', () => {
      const result = validateTimetableEvent({ ...validEvent, title: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject event without valid start time', () => {
      const result = validateTimetableEvent({ ...validEvent, startTime: undefined });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid start time is required');
    });

    it('should reject event with invalid duration', () => {
      const result = validateTimetableEvent({ ...validEvent, duration: 0 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be greater than 0 minutes');
    });

    it('should reject event with duration exceeding 24 hours', () => {
      const result = validateTimetableEvent({ ...validEvent, duration: 1500 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration cannot exceed 24 hours');
    });

    it('should reject event with invalid category', () => {
      const result = validateTimetableEvent({ ...validEvent, category: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid category is required');
    });
  });

  describe('validateTask', () => {
    const validTask: Partial<Task> = {
      title: 'Test Task',
      priority: 'medium',
      dueDate: new Date('2024-01-01'),
      category: 'work',
      isCompleted: false,
    };

    it('should validate a correct task', () => {
      const result = validateTask(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject task without title', () => {
      const result = validateTask({ ...validTask, title: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject task with invalid priority', () => {
      const result = validateTask({ ...validTask, priority: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid priority is required');
    });

    it('should reject task without valid due date', () => {
      const result = validateTask({ ...validTask, dueDate: undefined });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid due date is required');
    });

    it('should reject task without category', () => {
      const result = validateTask({ ...validTask, category: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });
  });

  describe('validateMedication', () => {
    const validMedication: Partial<Medication> = {
      name: 'Test Medicine',
      dosage: '10mg',
      reminderTimes: ['08:00', '20:00'],
      isActive: true,
      adherenceLog: [],
    };

    it('should validate a correct medication', () => {
      const result = validateMedication(validMedication);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject medication without name', () => {
      const result = validateMedication({ ...validMedication, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Medication name is required');
    });

    it('should reject medication without dosage', () => {
      const result = validateMedication({ ...validMedication, dosage: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dosage is required');
    });

    it('should reject medication without reminder times', () => {
      const result = validateMedication({ ...validMedication, reminderTimes: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one reminder time is required');
    });

    it('should reject medication with invalid time format', () => {
      const result = validateMedication({ ...validMedication, reminderTimes: ['25:00'] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reminder time 1 must be in HH:MM format');
    });
  });

  describe('validateTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(validateTimeFormat('08:00')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
      expect(validateTimeFormat('00:00')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(validateTimeFormat('25:00')).toBe(false);
      expect(validateTimeFormat('08:60')).toBe(false);
      expect(validateTimeFormat('8:00')).toBe(false);
      expect(validateTimeFormat('invalid')).toBe(false);
    });
  });

  describe('checkEventOverlap', () => {
    const event1: TimetableEvent = {
      id: '1',
      title: 'Event 1',
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    };

    it('should detect overlapping events', () => {
      const event2: TimetableEvent = {
        ...event1,
        id: '2',
        startTime: new Date('2024-01-01T10:30:00'),
      };
      expect(checkEventOverlap(event1, event2)).toBe(true);
    });

    it('should not detect non-overlapping events', () => {
      const event2: TimetableEvent = {
        ...event1,
        id: '2',
        startTime: new Date('2024-01-01T11:00:00'),
      };
      expect(checkEventOverlap(event1, event2)).toBe(false);
    });
  });

  describe('validateEventConflicts', () => {
    const newEvent: TimetableEvent = {
      id: '1',
      title: 'New Event',
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    };

    const existingEvent: TimetableEvent = {
      id: '2',
      title: 'Existing Event',
      startTime: new Date('2024-01-01T10:30:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    };

    it('should detect conflicts with existing events', () => {
      const result = validateEventConflicts(newEvent, [existingEvent]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event conflicts with 1 existing event(s)');
    });

    it('should not detect conflicts when events do not overlap', () => {
      const nonConflictingEvent = {
        ...existingEvent,
        startTime: new Date('2024-01-01T11:00:00'),
      };
      const result = validateEventConflicts(newEvent, [nonConflictingEvent]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});