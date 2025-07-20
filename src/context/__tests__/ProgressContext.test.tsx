import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ProgressProvider, useProgress } from '../ProgressContext';
import { useTimetable } from '../TimetableContext';
import { useTasks } from '../TasksContext';
import { useMedication } from '../MedicationContext';
import * as storage from '../../utils/storage';
import * as progressUtils from '../../utils/progressUtils';
import { TimetableEvent, Task, Medication, ProductivityLog } from '../../types';

// Mock dependencies
jest.mock('../TimetableContext');
jest.mock('../TasksContext');
jest.mock('../MedicationContext');
jest.mock('../../utils/storage');
jest.mock('../../utils/progressUtils');

const mockUseTimetable = useTimetable as jest.MockedFunction<typeof useTimetable>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseMedication = useMedication as jest.MockedFunction<typeof useMedication>;
const mockStorage = storage as jest.Mocked<typeof storage>;
const mockProgressUtils = progressUtils as jest.Mocked<typeof progressUtils>;

describe('ProgressContext', () => {
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
  ];

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      priority: 'high',
      dueDate: new Date('2024-01-01'),
      isCompleted: true,
      category: 'work',
    },
  ];

  const mockMedications: Medication[] = [
    {
      id: '1',
      name: 'Aspirin',
      dosage: '100mg',
      reminderTimes: ['08:00'],
      isActive: true,
      adherenceLog: [],
    },
  ];

  const mockProductivityLog: ProductivityLog = {
    date: '2024-01-01',
    completedTasks: 1,
    totalTasks: 1,
    completedEvents: 1,
    totalEvents: 1,
    medicationAdherence: 1.0,
    productivityScore: 100,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProgressProvider>{children}</ProgressProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00'));

    mockUseTimetable.mockReturnValue({
      state: {
        events: mockEvents,
        selectedDate: new Date(),
        loading: false,
        error: null,
        conflicts: [],
      },
    } as any);

    mockUseTasks.mockReturnValue({
      state: {
        tasks: mockTasks,
        loading: false,
        error: null,
        filter: 'all' as const,
        sortBy: 'dueDate' as const,
      },
    } as any);

    mockUseMedication.mockReturnValue({
      state: {
        medications: mockMedications,
        loading: false,
        error: null,
        missedMedications: [],
      },
    } as any);

    mockProgressUtils.generateProductivityLog.mockReturnValue(mockProductivityLog);
    mockProgressUtils.calculateWeeklyStats.mockReturnValue({
      averageScore: 85,
      totalTasks: 7,
      completedTasks: 6,
      totalEvents: 5,
      completedEvents: 5,
      averageMedicationAdherence: 0.9,
      dailyScores: [80, 85, 90, 85, 80, 85, 90],
      trend: 'stable' as const,
    });
    mockProgressUtils.calculateMonthlyStats.mockReturnValue({
      averageScore: 82,
      totalTasks: 30,
      completedTasks: 25,
      totalEvents: 20,
      completedEvents: 18,
      averageMedicationAdherence: 0.88,
      bestDay: { date: '2024-01-15', score: 95 },
      worstDay: { date: '2024-01-03', score: 65 },
      streaks: { currentStreak: 5, longestStreak: 12 },
    });
    mockProgressUtils.getProductivityInsights.mockReturnValue({
      insights: ['Great productivity this week!'],
      recommendations: ['Try to maintain consistency'],
      achievements: ['5-day streak achieved!'],
    });

    mockStorage.getProductivityLogForDate.mockResolvedValue(null);
    mockStorage.addProductivityLog.mockResolvedValue();
    mockStorage.loadProductivityLogs.mockResolvedValue([mockProductivityLog]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Context Initialization', () => {
    it('should provide context value', () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current.generateTodaysLog).toBe('function');
      expect(typeof result.current.getWeeklyStats).toBe('function');
      expect(typeof result.current.getMonthlyStats).toBe('function');
      expect(typeof result.current.getInsights).toBe('function');
      expect(typeof result.current.loadLogs).toBe('function');
      expect(typeof result.current.saveLog).toBe('function');
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useProgress());

      expect(result.error).toEqual(
        Error('useProgress must be used within a ProgressProvider')
      );
    });
  });

  describe('Auto Log Generation', () => {
    it('should generate today\'s log on mount', async () => {
      renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockProgressUtils.generateProductivityLog).toHaveBeenCalledWith(
        mockTasks,
        mockEvents,
        mockMedications,
        expect.any(Date)
      );
      expect(mockStorage.addProductivityLog).toHaveBeenCalledWith(mockProductivityLog);
    });

    it('should regenerate log when data changes', async () => {
      const { rerender } = renderHook(() => useProgress(), { wrapper });

      // Change tasks data
      mockUseTasks.mockReturnValue({
        state: {
          tasks: [...mockTasks, {
            id: '2',
            title: 'New Task',
            priority: 'medium',
            dueDate: new Date('2024-01-01'),
            isCompleted: false,
            category: 'personal',
          }],
          loading: false,
          error: null,
          filter: 'all' as const,
          sortBy: 'dueDate' as const,
        },
      } as any);

      rerender();

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockProgressUtils.generateProductivityLog).toHaveBeenCalledTimes(2);
    });

    it('should not save log if score hasn\'t changed', async () => {
      mockStorage.getProductivityLogForDate.mockResolvedValue(mockProductivityLog);

      renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockStorage.addProductivityLog).not.toHaveBeenCalled();
    });

    it('should handle log generation errors gracefully', async () => {
      mockProgressUtils.generateProductivityLog.mockImplementation(() => {
        throw new Error('Generation failed');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error generating today\'s log:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics Methods', () => {
    it('should get weekly stats', () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      const stats = result.current.getWeeklyStats();

      expect(mockProgressUtils.calculateWeeklyStats).toHaveBeenCalledWith([]);
      expect(stats.averageScore).toBe(85);
      expect(stats.trend).toBe('stable');
    });

    it('should get monthly stats', () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      const stats = result.current.getMonthlyStats(0, 2024);

      expect(mockProgressUtils.calculateMonthlyStats).toHaveBeenCalledWith([], 0, 2024);
      expect(stats.averageScore).toBe(82);
      expect(stats.bestDay?.score).toBe(95);
    });

    it('should get insights', () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      const insights = result.current.getInsights();

      expect(mockProgressUtils.getProductivityInsights).toHaveBeenCalledWith(
        mockTasks,
        mockEvents,
        mockMedications,
        []
      );
      expect(insights.insights).toContain('Great productivity this week!');
      expect(insights.recommendations).toContain('Try to maintain consistency');
      expect(insights.achievements).toContain('5-day streak achieved!');
    });
  });

  describe('Data Management', () => {
    it('should load logs', async () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      const logs = await act(async () => {
        return await result.current.loadLogs();
      });

      expect(mockStorage.loadProductivityLogs).toHaveBeenCalled();
      expect(logs).toEqual([mockProductivityLog]);
    });

    it('should save log', async () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await result.current.saveLog(mockProductivityLog);
      });

      expect(mockStorage.addProductivityLog).toHaveBeenCalledWith(mockProductivityLog);
    });

    it('should handle load errors gracefully', async () => {
      mockStorage.loadProductivityLogs.mockRejectedValue(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useProgress(), { wrapper });

      const logs = await act(async () => {
        return await result.current.loadLogs();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error loading productivity logs:', expect.any(Error));
      expect(logs).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      mockStorage.addProductivityLog.mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await result.current.saveLog(mockProductivityLog);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error saving productivity log:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Manual Log Generation', () => {
    it('should generate today\'s log manually', async () => {
      const { result } = renderHook(() => useProgress(), { wrapper });

      await act(async () => {
        await result.current.generateTodaysLog();
      });

      expect(mockProgressUtils.generateProductivityLog).toHaveBeenCalledWith(
        mockTasks,
        mockEvents,
        mockMedications,
        expect.any(Date)
      );
      expect(mockStorage.addProductivityLog).toHaveBeenCalledWith(mockProductivityLog);
    });
  });
});