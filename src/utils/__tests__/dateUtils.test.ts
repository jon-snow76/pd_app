import {
  addDays,
  addWeeks,
  getNextRecurrence,
  generateRecurringEvents,
  getEventsForDate,
  doTimePeriodsOverlap,
  getEventEndTime,
  findConflictingEvents,
  getAvailableTimeSlots,
  suggestOptimalTime,
  getTotalScheduledTime,
  getEventsInRange,
} from '../dateUtils';
import { TimetableEvent } from '../../types';

describe('Date Utils', () => {
  const mockEvent: TimetableEvent = {
    id: '1',
    title: 'Test Event',
    startTime: new Date('2024-01-01T10:00:00'),
    duration: 60,
    category: 'work',
    isRecurring: false,
    notificationEnabled: true,
  };

  const mockRecurringEvent: TimetableEvent = {
    ...mockEvent,
    id: '2',
    isRecurring: true,
    recurrencePattern: {
      type: 'daily',
      interval: 1,
      endDate: new Date('2024-01-07T10:00:00'),
    },
  };

  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle month boundaries', () => {
      const date = new Date('2024-01-30');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('addWeeks', () => {
    it('should add weeks to a date', () => {
      const date = new Date('2024-01-01');
      const result = addWeeks(date, 2);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('getNextRecurrence', () => {
    it('should return next occurrence for daily recurrence', () => {
      const fromDate = new Date('2024-01-02T08:00:00');
      const result = getNextRecurrence(mockRecurringEvent, fromDate);
      
      expect(result).toEqual(new Date('2024-01-02T10:00:00'));
    });

    it('should return null for non-recurring events', () => {
      const result = getNextRecurrence(mockEvent);
      expect(result).toBeNull();
    });

    it('should return null when past end date', () => {
      const fromDate = new Date('2024-01-08T08:00:00');
      const result = getNextRecurrence(mockRecurringEvent, fromDate);
      expect(result).toBeNull();
    });
  });

  describe('generateRecurringEvents', () => {
    it('should generate recurring events within date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');
      
      const events = generateRecurringEvents(mockRecurringEvent, startDate, endDate);
      
      expect(events).toHaveLength(5); // Jan 1-5
      expect(events[0].startTime).toEqual(new Date('2024-01-01T10:00:00'));
      expect(events[4].startTime).toEqual(new Date('2024-01-05T10:00:00'));
    });

    it('should respect recurrence end date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      
      const events = generateRecurringEvents(mockRecurringEvent, startDate, endDate);
      
      expect(events).toHaveLength(7); // Jan 1-7 (end date is Jan 7)
    });

    it('should return empty array for non-recurring events', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');
      
      const events = generateRecurringEvents(mockEvent, startDate, endDate);
      
      expect(events).toHaveLength(0);
    });
  });

  describe('getEventsForDate', () => {
    it('should return events for specific date', () => {
      const events = [mockEvent];
      const targetDate = new Date('2024-01-01');
      
      const result = getEventsForDate(events, targetDate);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should include recurring events for date', () => {
      const events = [mockRecurringEvent];
      const targetDate = new Date('2024-01-03');
      
      const result = getEventsForDate(events, targetDate);
      
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toEqual(new Date('2024-01-03T10:00:00'));
    });

    it('should sort events by start time', () => {
      const event1 = { ...mockEvent, startTime: new Date('2024-01-01T14:00:00') };
      const event2 = { ...mockEvent, id: '2', startTime: new Date('2024-01-01T09:00:00') };
      
      const result = getEventsForDate([event1, event2], new Date('2024-01-01'));
      
      expect(result[0].startTime.getHours()).toBe(9);
      expect(result[1].startTime.getHours()).toBe(14);
    });
  });

  describe('doTimePeriodsOverlap', () => {
    it('should detect overlapping periods', () => {
      const start1 = new Date('2024-01-01T10:00:00');
      const end1 = new Date('2024-01-01T11:00:00');
      const start2 = new Date('2024-01-01T10:30:00');
      const end2 = new Date('2024-01-01T11:30:00');
      
      expect(doTimePeriodsOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should not detect non-overlapping periods', () => {
      const start1 = new Date('2024-01-01T10:00:00');
      const end1 = new Date('2024-01-01T11:00:00');
      const start2 = new Date('2024-01-01T11:00:00');
      const end2 = new Date('2024-01-01T12:00:00');
      
      expect(doTimePeriodsOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('getEventEndTime', () => {
    it('should calculate correct end time', () => {
      const endTime = getEventEndTime(mockEvent);
      expect(endTime).toEqual(new Date('2024-01-01T11:00:00'));
    });
  });

  describe('findConflictingEvents', () => {
    it('should find conflicting events', () => {
      const event1 = mockEvent;
      const event2 = {
        ...mockEvent,
        id: '2',
        startTime: new Date('2024-01-01T10:30:00'),
      };
      
      const conflicts = findConflictingEvents(event1, [event1, event2]);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('2');
    });

    it('should not include the target event itself', () => {
      const conflicts = findConflictingEvents(mockEvent, [mockEvent]);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should find available slots between events', () => {
      const events = [
        { ...mockEvent, startTime: new Date('2024-01-01T10:00:00'), duration: 60 },
        { ...mockEvent, id: '2', startTime: new Date('2024-01-01T14:00:00'), duration: 60 },
      ];
      
      const slots = getAvailableTimeSlots(events, new Date('2024-01-01'));
      
      expect(slots.length).toBeGreaterThan(0);
      // Should have slot between 9-10, 11-14, and 15-17
      expect(slots).toHaveLength(3);
    });

    it('should respect working hours', () => {
      const events: TimetableEvent[] = [];
      const workingHours = { start: '10:00', end: '16:00' };
      
      const slots = getAvailableTimeSlots(events, new Date('2024-01-01'), 60, workingHours);
      
      expect(slots).toHaveLength(1);
      expect(slots[0].start.getHours()).toBe(10);
      expect(slots[0].end.getHours()).toBe(16);
    });
  });

  describe('suggestOptimalTime', () => {
    it('should suggest time in available slot', () => {
      const events: TimetableEvent[] = [];
      const date = new Date('2024-01-01');
      
      const suggestion = suggestOptimalTime(events, date, 60);
      
      expect(suggestion).not.toBeNull();
      expect(suggestion!.getHours()).toBe(9); // Start of working hours
    });

    it('should prefer specified time when available', () => {
      const events: TimetableEvent[] = [];
      const date = new Date('2024-01-01');
      
      const suggestion = suggestOptimalTime(events, date, 60, '14:00');
      
      expect(suggestion).not.toBeNull();
      expect(suggestion!.getHours()).toBe(14);
    });

    it('should return null when no slots available', () => {
      const events = [
        { ...mockEvent, startTime: new Date('2024-01-01T09:00:00'), duration: 480 }, // 8 hours
      ];
      
      const suggestion = suggestOptimalTime(events, new Date('2024-01-01'), 60);
      
      expect(suggestion).toBeNull();
    });
  });

  describe('getTotalScheduledTime', () => {
    it('should calculate total scheduled time', () => {
      const events = [
        { ...mockEvent, duration: 60 },
        { ...mockEvent, id: '2', duration: 90 },
      ];
      
      const total = getTotalScheduledTime(events, new Date('2024-01-01'));
      
      expect(total).toBe(150); // 60 + 90 minutes
    });
  });

  describe('getEventsInRange', () => {
    it('should return events within date range', () => {
      const events = [
        mockEvent, // Jan 1
        { ...mockEvent, id: '2', startTime: new Date('2024-01-03T10:00:00') }, // Jan 3
        { ...mockEvent, id: '3', startTime: new Date('2024-01-05T10:00:00') }, // Jan 5
      ];
      
      const result = getEventsInRange(
        events,
        new Date('2024-01-01'),
        new Date('2024-01-03')
      );
      
      expect(result).toHaveLength(2); // Jan 1 and Jan 3 events
    });

    it('should include recurring events in range', () => {
      const events = [mockRecurringEvent];
      
      const result = getEventsInRange(
        events,
        new Date('2024-01-01'),
        new Date('2024-01-03')
      );
      
      expect(result).toHaveLength(3); // Jan 1, 2, 3 recurring events
    });
  });
});