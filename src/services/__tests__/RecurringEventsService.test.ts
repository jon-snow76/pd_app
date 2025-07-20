import { addDays, addWeeks, addMonths, startOfDay } from 'date-fns';
import RecurringEventsService, { recurringEventsService, RecurrencePattern } from '../RecurringEventsService';
import { TimetableEvent } from '../../types';

describe('RecurringEventsService', () => {
  let service: RecurringEventsService;
  let baseEvent: TimetableEvent;

  beforeEach(() => {
    service = new RecurringEventsService();
    
    baseEvent = {
      id: 'test-event-1',
      title: 'Daily Standup',
      description: 'Team standup meeting',
      startTime: new Date('2023-12-25T09:00:00'),
      duration: 30,
      category: 'work',
      isRecurring: true,
      notificationEnabled: true,
      recurrencePattern: {
        type: 'daily',
        interval: 1,
      },
    };
  });

  describe('Recurring Instance Generation', () => {
    it('should generate daily recurring instances', () => {
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2023-12-30');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(6); // 25, 26, 27, 28, 29, 30
      expect(instances[0].id).toBe('test-event-1_2023-12-25');
      expect(instances[1].id).toBe('test-event-1_2023-12-26');
      expect(instances[0].isRecurringInstance).toBe(true);
      expect(instances[0].parentEventId).toBe('test-event-1');
    });

    it('should generate weekly recurring instances', () => {
      baseEvent.recurrencePattern = { type: 'weekly', interval: 1 };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-15');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(4); // Every 7 days
      expect(instances[1].startTime).toEqual(addWeeks(baseEvent.startTime, 1));
    });

    it('should generate monthly recurring instances', () => {
      baseEvent.recurrencePattern = { type: 'monthly', interval: 1 };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-03-25');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(4); // Dec, Jan, Feb, Mar
      expect(instances[1].startTime).toEqual(addMonths(baseEvent.startTime, 1));
    });

    it('should respect interval settings', () => {
      baseEvent.recurrencePattern = { type: 'daily', interval: 3 };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-05');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(4); // Every 3 days
      expect(instances[1].startTime).toEqual(addDays(baseEvent.startTime, 3));
    });

    it('should respect end date', () => {
      baseEvent.recurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate: new Date('2023-12-28'),
      };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-05');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(4); // 25, 26, 27, 28 (stops at end date)
    });

    it('should handle non-recurring events', () => {
      baseEvent.isRecurring = false;
      baseEvent.recurrencePattern = undefined;
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2023-12-30');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      expect(instances).toHaveLength(0);
    });

    it('should prevent infinite loops', () => {
      baseEvent.recurrencePattern = { type: 'daily', interval: 0 }; // Invalid interval
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-12-25');
      
      const instances = service.generateRecurringInstances(baseEvent, startDate, endDate);
      
      // Should stop at max iterations
      expect(instances.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Event Instance Creation', () => {
    it('should create event instance with correct properties', () => {
      const targetDate = new Date('2023-12-26');
      
      const instance = service.createEventInstance(baseEvent, targetDate);
      
      expect(instance.id).toBe('test-event-1_2023-12-26');
      expect(instance.title).toBe(baseEvent.title);
      expect(instance.duration).toBe(baseEvent.duration);
      expect(instance.isRecurringInstance).toBe(true);
      expect(instance.parentEventId).toBe('test-event-1');
      
      // Should preserve time from original event
      expect(instance.startTime.getHours()).toBe(9);
      expect(instance.startTime.getMinutes()).toBe(0);
    });

    it('should preserve time across different dates', () => {
      const targetDate = new Date('2024-01-15T15:30:00'); // Different time
      
      const instance = service.createEventInstance(baseEvent, targetDate);
      
      // Should use original event time, not target date time
      expect(instance.startTime.getHours()).toBe(9);
      expect(instance.startTime.getMinutes()).toBe(0);
      expect(instance.startTime.getDate()).toBe(15);
    });
  });

  describe('Next Occurrence Finding', () => {
    it('should find next occurrence from base event', () => {
      const fromDate = new Date('2023-12-25');
      
      const nextOccurrence = service.findNextOccurrence(baseEvent, fromDate);
      
      expect(nextOccurrence).toEqual(baseEvent.startTime);
    });

    it('should find next occurrence after base event', () => {
      const fromDate = new Date('2023-12-26');
      
      const nextOccurrence = service.findNextOccurrence(baseEvent, fromDate);
      
      expect(nextOccurrence).toEqual(addDays(baseEvent.startTime, 1));
    });

    it('should handle weekly patterns', () => {
      baseEvent.recurrencePattern = { type: 'weekly', interval: 1 };
      const fromDate = new Date('2023-12-26');
      
      const nextOccurrence = service.findNextOccurrence(baseEvent, fromDate);
      
      expect(nextOccurrence).toEqual(addWeeks(baseEvent.startTime, 1));
    });
  });

  describe('Date Occurrence Checking', () => {
    it('should check if event occurs on specific date', () => {
      const targetDate = new Date('2023-12-26');
      
      const shouldOccur = service.shouldEventOccurOnDate(baseEvent, targetDate);
      
      expect(shouldOccur).toBe(true);
    });

    it('should check daily pattern correctly', () => {
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-26'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-24'))).toBe(false);
    });

    it('should check weekly pattern correctly', () => {
      baseEvent.recurrencePattern = { type: 'weekly', interval: 1 };
      
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2024-01-01'))).toBe(true); // 7 days later
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-26'))).toBe(false);
    });

    it('should check monthly pattern correctly', () => {
      baseEvent.recurrencePattern = { type: 'monthly', interval: 1 };
      
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2024-01-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2024-01-26'))).toBe(false);
    });

    it('should respect interval in patterns', () => {
      baseEvent.recurrencePattern = { type: 'daily', interval: 2 };
      
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-27'))).toBe(true); // 2 days later
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-26'))).toBe(false);
    });

    it('should respect end date', () => {
      baseEvent.recurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate: new Date('2023-12-26'),
      };
      
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-25'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-26'))).toBe(true);
      expect(service.shouldEventOccurOnDate(baseEvent, new Date('2023-12-27'))).toBe(false);
    });
  });

  describe('Recurring Events for Date', () => {
    it('should get recurring events for specific date', () => {
      const recurringEvents = [baseEvent];
      const targetDate = new Date('2023-12-26');
      
      const events = service.getRecurringEventsForDate(recurringEvents, targetDate);
      
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('test-event-1_2023-12-26');
      expect(events[0].isRecurringInstance).toBe(true);
    });

    it('should filter out non-matching events', () => {
      const weeklyEvent = {
        ...baseEvent,
        id: 'weekly-event',
        recurrencePattern: { type: 'weekly' as const, interval: 1 },
      };
      
      const recurringEvents = [baseEvent, weeklyEvent];
      const targetDate = new Date('2023-12-26'); // Day after base event
      
      const events = service.getRecurringEventsForDate(recurringEvents, targetDate);
      
      expect(events).toHaveLength(1); // Only daily event should match
      expect(events[0].id).toBe('test-event-1_2023-12-26');
    });
  });

  describe('Pattern Validation', () => {
    it('should validate correct patterns', () => {
      const validPatterns: RecurrencePattern[] = [
        { type: 'daily', interval: 1 },
        { type: 'weekly', interval: 2 },
        { type: 'monthly', interval: 1, endDate: new Date('2024-12-25') },
      ];
      
      validPatterns.forEach(pattern => {
        expect(service.validateRecurrencePattern(pattern)).toBe(true);
      });
    });

    it('should reject invalid patterns', () => {
      const invalidPatterns: any[] = [
        { interval: 1 }, // Missing type
        { type: 'daily', interval: 0 }, // Invalid interval
        { type: 'daily', interval: -1 }, // Negative interval
        { type: 'daily', interval: 1, endDate: new Date('2020-01-01') }, // Past end date
      ];
      
      invalidPatterns.forEach(pattern => {
        expect(service.validateRecurrencePattern(pattern)).toBe(false);
      });
    });
  });

  describe('Pattern Description', () => {
    it('should generate correct descriptions', () => {
      expect(service.getRecurrenceDescription({ type: 'daily', interval: 1 })).toBe('Daily');
      expect(service.getRecurrenceDescription({ type: 'daily', interval: 2 })).toBe('Every 2 days');
      expect(service.getRecurrenceDescription({ type: 'weekly', interval: 1 })).toBe('Weekly');
      expect(service.getRecurrenceDescription({ type: 'weekly', interval: 3 })).toBe('Every 3 weeks');
      expect(service.getRecurrenceDescription({ type: 'monthly', interval: 1 })).toBe('Monthly');
      expect(service.getRecurrenceDescription({ type: 'custom', interval: 5 })).toBe('Every 5 days (custom)');
    });
  });

  describe('Upcoming Occurrences', () => {
    it('should get upcoming occurrences', () => {
      const occurrences = service.getUpcomingOccurrences(baseEvent, 3);
      
      expect(occurrences).toHaveLength(3);
      expect(occurrences[0]).toEqual(baseEvent.startTime);
      expect(occurrences[1]).toEqual(addDays(baseEvent.startTime, 1));
      expect(occurrences[2]).toEqual(addDays(baseEvent.startTime, 2));
    });

    it('should start from today if base event is in past', () => {
      const pastEvent = {
        ...baseEvent,
        startTime: new Date('2020-01-01T09:00:00'),
      };
      
      const occurrences = service.getUpcomingOccurrences(pastEvent, 2);
      
      expect(occurrences).toHaveLength(2);
      expect(occurrences[0]).toBeInstanceOf(Date);
      expect(occurrences[0].getTime()).toBeGreaterThanOrEqual(new Date().getTime());
    });

    it('should respect end date in upcoming occurrences', () => {
      baseEvent.recurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate: addDays(baseEvent.startTime, 2),
      };
      
      const occurrences = service.getUpcomingOccurrences(baseEvent, 5);
      
      expect(occurrences.length).toBeLessThanOrEqual(3); // Limited by end date
    });

    it('should handle non-recurring events', () => {
      baseEvent.isRecurring = false;
      baseEvent.recurrencePattern = undefined;
      
      const occurrences = service.getUpcomingOccurrences(baseEvent, 3);
      
      expect(occurrences).toEqual([baseEvent.startTime]);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(recurringEventsService).toBeInstanceOf(RecurringEventsService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = recurringEventsService;
      const instance2 = recurringEventsService;
      
      expect(instance1).toBe(instance2);
    });
  });
});