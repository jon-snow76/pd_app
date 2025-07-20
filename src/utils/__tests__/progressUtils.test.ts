import {
  calculateDailyProductivityScore,
  calculateMedicationAdherenceScore,
  generateProductivityLog,
  calculateWeeklyStats,
  calculateMonthlyStats,
  calculateProductivityStreaks,
  getProductivityInsights,
  generateChartData,
  calculateCategoryStats,
} from '../progressUtils';
import { Task, TimetableEvent, Medication, ProductivityLog } from '../../types';

// Mock helpers
jest.mock('../helpers', () => ({
  formatDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  isToday: jest.fn((date: Date) => {
    const today = new Date('2024-01-01');
    return date.toDateString() === today.toDateString();
  }),
  isPastDate: jest.fn((date: Date) => date < new Date('2024-01-01')),
}));

describe('Progress Utils', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      priority: 'high',
      dueDate: new Date('2024-01-01'),
      isCompleted: true,
      category: 'work',
      completedAt: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      title: 'Task 2',
      priority: 'medium',
      dueDate: new Date('2024-01-01'),
      isCompleted: false,
      category: 'personal',
    },
    {
      id: '3',
      title: 'Overdue Task',
      priority: 'high',
      dueDate: new Date('2023-12-31'),
      isCompleted: false,
      category: 'work',
    },
  ];

  const mockEvents: TimetableEvent[] = [
    {
      id: '1',
      title: 'Meeting',
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    },
    {
      id: '2',
      title: 'Workout',
      startTime: new Date('2024-01-01T18:00:00'),
      duration: 45,
      category: 'health',
      isRecurring: false,
      notificationEnabled: true,
    },
  ];

  const mockMedications: Medication[] = [
    {
      id: '1',
      name: 'Aspirin',
      dosage: '100mg',
      reminderTimes: ['08:00', '20:00'],
      isActive: true,
      adherenceLog: [
        {
          date: '2024-01-01',
          time: '08:00',
          taken: true,
          takenAt: new Date('2024-01-01T08:05:00'),
        },
        {
          date: '2024-01-01',
          time: '20:00',
          taken: false,
        },
      ],
    },
  ];

  const mockProductivityLogs: ProductivityLog[] = [
    {
      date: '2024-01-01',
      completedTasks: 5,
      totalTasks: 8,
      completedEvents: 3,
      totalEvents: 4,
      medicationAdherence: 0.8,
      productivityScore: 75,
    },
    {
      date: '2023-12-31',
      completedTasks: 3,
      totalTasks: 5,
      completedEvents: 2,
      totalEvents: 3,
      medicationAdherence: 0.9,
      productivityScore: 80,
    },
    {
      date: '2023-12-30',
      completedTasks: 4,
      totalTasks: 6,
      completedEvents: 1,
      totalEvents: 2,
      medicationAdherence: 0.7,
      productivityScore: 65,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateDailyProductivityScore', () => {
    it('should calculate productivity score correctly', () => {
      const score = calculateDailyProductivityScore(
        mockTasks,
        mockEvents,
        mockMedications,
        new Date('2024-01-01')
      );

      // Task score: 1/2 * 40 = 20
      // Event score: 40 (has events)
      // Medication score: 0.5 * 20 = 10 (1 taken out of 2)
      // Total: 20 + 40 + 10 = 70
      expect(score).toBe(70);
    });

    it('should handle empty data', () => {
      const score = calculateDailyProductivityScore([], [], [], new Date('2024-01-01'));
      expect(score).toBe(20); // Only medication score (perfect when no medications)
    });

    it('should handle date with no tasks or events', () => {
      const score = calculateDailyProductivityScore(
        mockTasks,
        mockEvents,
        mockMedications,
        new Date('2024-01-02')
      );

      // No tasks or events for this date, only medication score
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMedicationAdherenceScore', () => {
    it('should calculate adherence score correctly', () => {
      const score = calculateMedicationAdherenceScore(mockMedications, new Date('2024-01-01'));
      
      // 1 taken out of 2 expected = 0.5
      expect(score).toBe(0.5);
    });

    it('should return perfect score when no medications', () => {
      const score = calculateMedicationAdherenceScore([], new Date('2024-01-01'));
      expect(score).toBe(1);
    });

    it('should only consider active medications', () => {
      const inactiveMedications = [
        { ...mockMedications[0], isActive: false },
      ];
      
      const score = calculateMedicationAdherenceScore(inactiveMedications, new Date('2024-01-01'));
      expect(score).toBe(1);
    });
  });

  describe('generateProductivityLog', () => {
    it('should generate complete productivity log', () => {
      const log = generateProductivityLog(
        mockTasks,
        mockEvents,
        mockMedications,
        new Date('2024-01-01')
      );

      expect(log).toEqual({
        date: '2024-01-01',
        completedTasks: 1,
        totalTasks: 2,
        completedEvents: 2,
        totalEvents: 2,
        medicationAdherence: 0.5,
        productivityScore: 70,
      });
    });

    it('should handle empty data gracefully', () => {
      const log = generateProductivityLog([], [], [], new Date('2024-01-01'));

      expect(log).toEqual({
        date: '2024-01-01',
        completedTasks: 0,
        totalTasks: 0,
        completedEvents: 0,
        totalEvents: 0,
        medicationAdherence: 1,
        productivityScore: 20,
      });
    });
  });

  describe('calculateWeeklyStats', () => {
    it('should calculate weekly statistics correctly', () => {
      const stats = calculateWeeklyStats(mockProductivityLogs, new Date('2024-01-01'));

      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);
      expect(stats.completedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.dailyScores).toHaveLength(7);
      expect(['improving', 'declining', 'stable']).toContain(stats.trend);
    });

    it('should determine trend correctly', () => {
      const improvingLogs: ProductivityLog[] = [
        { date: '2023-12-26', completedTasks: 1, totalTasks: 3, completedEvents: 1, totalEvents: 2, medicationAdherence: 0.5, productivityScore: 40 },
        { date: '2023-12-27', completedTasks: 2, totalTasks: 3, completedEvents: 1, totalEvents: 2, medicationAdherence: 0.6, productivityScore: 50 },
        { date: '2023-12-28', completedTasks: 2, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.7, productivityScore: 60 },
        { date: '2023-12-29', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.8, productivityScore: 80 },
        { date: '2023-12-30', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.9, productivityScore: 85 },
        { date: '2023-12-31', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.9, productivityScore: 90 },
        { date: '2024-01-01', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 1.0, productivityScore: 95 },
      ];

      const stats = calculateWeeklyStats(improvingLogs, new Date('2024-01-01'));
      expect(stats.trend).toBe('improving');
    });
  });

  describe('calculateMonthlyStats', () => {
    it('should calculate monthly statistics correctly', () => {
      const stats = calculateMonthlyStats(mockProductivityLogs, 0, 2024); // January 2024

      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);
      expect(stats.completedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.bestDay).toBeTruthy();
      expect(stats.worstDay).toBeTruthy();
      expect(stats.streaks).toBeDefined();
    });

    it('should handle empty month data', () => {
      const stats = calculateMonthlyStats([], 5, 2024); // June 2024 (no data)

      expect(stats.averageScore).toBe(0);
      expect(stats.totalTasks).toBe(0);
      expect(stats.bestDay).toBeNull();
      expect(stats.worstDay).toBeNull();
    });

    it('should identify best and worst days correctly', () => {
      const stats = calculateMonthlyStats(mockProductivityLogs, 0, 2024);

      expect(stats.bestDay?.score).toBeGreaterThanOrEqual(stats.worstDay?.score || 0);
    });
  });

  describe('calculateProductivityStreaks', () => {
    it('should calculate streaks correctly', () => {
      const highScoreLogs: ProductivityLog[] = [
        { date: '2023-12-28', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.9, productivityScore: 85 },
        { date: '2023-12-29', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.9, productivityScore: 80 },
        { date: '2023-12-30', completedTasks: 2, totalTasks: 3, completedEvents: 1, totalEvents: 2, medicationAdherence: 0.7, productivityScore: 60 }, // Below threshold
        { date: '2023-12-31', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 0.9, productivityScore: 90 },
        { date: '2024-01-01', completedTasks: 3, totalTasks: 3, completedEvents: 2, totalEvents: 2, medicationAdherence: 1.0, productivityScore: 95 },
      ];

      const streaks = calculateProductivityStreaks(highScoreLogs, 70);

      expect(streaks.currentStreak).toBeGreaterThanOrEqual(0);
      expect(streaks.longestStreak).toBeGreaterThanOrEqual(streaks.currentStreak);
    });

    it('should handle empty logs', () => {
      const streaks = calculateProductivityStreaks([]);

      expect(streaks.currentStreak).toBe(0);
      expect(streaks.longestStreak).toBe(0);
    });
  });

  describe('getProductivityInsights', () => {
    it('should generate insights and recommendations', () => {
      const result = getProductivityInsights(
        mockTasks,
        mockEvents,
        mockMedications,
        mockProductivityLogs
      );

      expect(result.insights).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.achievements).toBeInstanceOf(Array);
    });

    it('should identify overdue tasks', () => {
      const result = getProductivityInsights(
        mockTasks,
        mockEvents,
        mockMedications,
        mockProductivityLogs
      );

      const overdueInsight = result.insights.find(insight => insight.includes('overdue'));
      expect(overdueInsight).toBeTruthy();
    });

    it('should provide medication recommendations when adherence is low', () => {
      const lowAdherenceMedications: Medication[] = [
        {
          ...mockMedications[0],
          adherenceLog: [
            { date: '2024-01-01', time: '08:00', taken: false },
            { date: '2024-01-01', time: '20:00', taken: false },
          ],
        },
      ];

      const result = getProductivityInsights(
        mockTasks,
        mockEvents,
        lowAdherenceMedications,
        mockProductivityLogs
      );

      const medicationRecommendation = result.recommendations.find(rec => 
        rec.includes('medication')
      );
      expect(medicationRecommendation).toBeTruthy();
    });

    it('should recognize achievements', () => {
      const highScoreLogs: ProductivityLog[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        completedTasks: 8,
        totalTasks: 10,
        completedEvents: 3,
        totalEvents: 3,
        medicationAdherence: 1.0,
        productivityScore: 95,
      }));

      const result = getProductivityInsights(
        mockTasks,
        mockEvents,
        mockMedications,
        highScoreLogs
      );

      expect(result.achievements.length).toBeGreaterThan(0);
    });
  });

  describe('generateChartData', () => {
    it('should generate weekly chart data', () => {
      const chartData = generateChartData(mockProductivityLogs, 'week');

      expect(chartData.labels).toHaveLength(7);
      expect(chartData.scores).toHaveLength(7);
      expect(chartData.tasks).toHaveLength(7);
      expect(chartData.events).toHaveLength(7);
      expect(chartData.medications).toHaveLength(7);
    });

    it('should generate monthly chart data', () => {
      const chartData = generateChartData(mockProductivityLogs, 'month');

      expect(chartData.labels).toHaveLength(30);
      expect(chartData.scores).toHaveLength(30);
      expect(chartData.tasks).toHaveLength(30);
      expect(chartData.events).toHaveLength(30);
      expect(chartData.medications).toHaveLength(30);
    });

    it('should handle missing data gracefully', () => {
      const chartData = generateChartData([], 'week');

      expect(chartData.labels).toHaveLength(7);
      expect(chartData.scores.every(score => score === 0)).toBe(true);
    });
  });

  describe('calculateCategoryStats', () => {
    it('should calculate category statistics correctly', () => {
      const stats = calculateCategoryStats(mockTasks, 'week');

      expect(stats.work).toBeDefined();
      expect(stats.personal).toBeDefined();
      expect(stats.work.total).toBe(2); // 2 work tasks
      expect(stats.work.completed).toBe(1); // 1 completed work task
      expect(stats.work.percentage).toBe(50);
    });

    it('should handle empty tasks', () => {
      const stats = calculateCategoryStats([], 'week');

      expect(Object.keys(stats)).toHaveLength(0);
    });

    it('should filter by time period correctly', () => {
      const oldTasks: Task[] = [
        {
          id: '4',
          title: 'Old Task',
          priority: 'low',
          dueDate: new Date('2023-01-01'), // Very old task
          isCompleted: true,
          category: 'archive',
        },
      ];

      const stats = calculateCategoryStats([...mockTasks, ...oldTasks], 'week');

      expect(stats.archive).toBeUndefined(); // Should not include old tasks
    });
  });
});