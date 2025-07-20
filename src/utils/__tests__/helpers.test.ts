import {
  generateId,
  createDefaultTimetableEvent,
  createDefaultTask,
  createDefaultMedication,
  formatDateString,
  formatTimeString,
  parseTimeToMinutes,
  minutesToTimeString,
  isToday,
  isPastDate,
  getDayBounds,
  calculateProductivityScore,
} from '../helpers';

describe('Helper Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('createDefaultTimetableEvent', () => {
    it('should create default timetable event', () => {
      const event = createDefaultTimetableEvent();
      expect(event.title).toBe('');
      expect(event.duration).toBe(60);
      expect(event.category).toBe('personal');
      expect(event.isRecurring).toBe(false);
      expect(event.notificationEnabled).toBe(true);
    });

    it('should apply overrides', () => {
      const event = createDefaultTimetableEvent({ title: 'Test Event', duration: 30 });
      expect(event.title).toBe('Test Event');
      expect(event.duration).toBe(30);
    });
  });

  describe('createDefaultTask', () => {
    it('should create default task', () => {
      const task = createDefaultTask();
      expect(task.title).toBe('');
      expect(task.priority).toBe('medium');
      expect(task.isCompleted).toBe(false);
      expect(task.category).toBe('general');
    });

    it('should apply overrides', () => {
      const task = createDefaultTask({ title: 'Test Task', priority: 'high' });
      expect(task.title).toBe('Test Task');
      expect(task.priority).toBe('high');
    });
  });

  describe('createDefaultMedication', () => {
    it('should create default medication', () => {
      const medication = createDefaultMedication();
      expect(medication.name).toBe('');
      expect(medication.dosage).toBe('');
      expect(medication.reminderTimes).toEqual([]);
      expect(medication.isActive).toBe(true);
      expect(medication.adherenceLog).toEqual([]);
    });

    it('should apply overrides', () => {
      const medication = createDefaultMedication({ name: 'Test Med', dosage: '10mg' });
      expect(medication.name).toBe('Test Med');
      expect(medication.dosage).toBe('10mg');
    });
  });

  describe('formatDateString', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDateString(date)).toBe('2024-01-15');
    });
  });

  describe('formatTimeString', () => {
    it('should format time to HH:MM', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatTimeString(date)).toBe('10:30');
    });
  });

  describe('parseTimeToMinutes', () => {
    it('should convert time string to minutes', () => {
      expect(parseTimeToMinutes('10:30')).toBe(630);
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('minutesToTimeString', () => {
    it('should convert minutes to time string', () => {
      expect(minutesToTimeString(630)).toBe('10:30');
      expect(minutesToTimeString(0)).toBe('00:00');
      expect(minutesToTimeString(1439)).toBe('23:59');
    });
  });

  describe('isToday', () => {
    it('should correctly identify today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should correctly identify past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPastDate(yesterday)).toBe(true);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPastDate(tomorrow)).toBe(false);
    });
  });

  describe('getDayBounds', () => {
    it('should return start and end of day', () => {
      const date = new Date('2024-01-15T10:30:00');
      const bounds = getDayBounds(date);
      
      expect(bounds.start.getHours()).toBe(0);
      expect(bounds.start.getMinutes()).toBe(0);
      expect(bounds.start.getSeconds()).toBe(0);
      
      expect(bounds.end.getHours()).toBe(23);
      expect(bounds.end.getMinutes()).toBe(59);
      expect(bounds.end.getSeconds()).toBe(59);
    });
  });

  describe('calculateProductivityScore', () => {
    it('should calculate correct productivity score', () => {
      const score = calculateProductivityScore(8, 10, 4, 5, 0.9);
      // Task score: (8/10) * 40 = 32
      // Event score: (4/5) * 40 = 32
      // Medication score: 0.9 * 20 = 18
      // Total: 32 + 32 + 18 = 82
      expect(score).toBe(82);
    });

    it('should handle zero totals', () => {
      const score = calculateProductivityScore(0, 0, 0, 0, 1.0);
      expect(score).toBe(20); // Only medication score
    });

    it('should return score between 0 and 100', () => {
      const score1 = calculateProductivityScore(0, 10, 0, 5, 0);
      expect(score1).toBe(0);
      
      const score2 = calculateProductivityScore(10, 10, 5, 5, 1.0);
      expect(score2).toBe(100);
    });
  });
});