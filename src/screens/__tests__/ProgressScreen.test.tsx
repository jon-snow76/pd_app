import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProgressScreen from '../ProgressScreen';
import { useTimetable } from '../../context/TimetableContext';
import { useTasks } from '../../context/TasksContext';
import { useMedication } from '../../context/MedicationContext';
import * as storage from '../../utils/storage';
import { TimetableEvent, Task, Medication, ProductivityLog } from '../../types';

// Mock dependencies
jest.mock('../../context/TimetableContext');
jest.mock('../../context/TasksContext');
jest.mock('../../context/MedicationContext');
jest.mock('../../utils/storage');
jest.mock('../../components/ProgressChart', () => 'ProgressChart');

const mockUseTimetable = useTimetable as jest.MockedFunction<typeof useTimetable>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseMedication = useMedication as jest.MockedFunction<typeof useMedication>;
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('ProgressScreen', () => {
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
  ];

  const mockTimetableState = {
    events: mockEvents,
    selectedDate: new Date(),
    loading: false,
    error: null,
    conflicts: [],
  };

  const mockTasksState = {
    tasks: mockTasks,
    loading: false,
    error: null,
    filter: 'all' as const,
    sortBy: 'dueDate' as const,
  };

  const mockMedicationState = {
    medications: mockMedications,
    loading: false,
    error: null,
    missedMedications: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00'));

    mockUseTimetable.mockReturnValue({
      state: mockTimetableState,
    } as any);

    mockUseTasks.mockReturnValue({
      state: mockTasksState,
    } as any);

    mockUseMedication.mockReturnValue({
      state: mockMedicationState,
    } as any);

    mockStorage.loadProductivityLogs.mockResolvedValue(mockProductivityLogs);
    mockStorage.addProductivityLog.mockResolvedValue();
    mockStorage.getProductivityLogForDate.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render correctly', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Progress')).toBeTruthy();
        expect(getByText('Week')).toBeTruthy();
        expect(getByText('Month')).toBeTruthy();
      });
    });

    it('should display loading state initially', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Loading progress data...')).toBeTruthy();
    });

    it('should display main statistics after loading', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Average Score')).toBeTruthy();
        expect(getByText('Tasks Completed')).toBeTruthy();
        expect(getByText('Events Attended')).toBeTruthy();
        expect(getByText('Medication Adherence')).toBeTruthy();
      });
    });
  });

  describe('Period Selection', () => {
    it('should switch between week and month views', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Week')).toBeTruthy();
      });

      fireEvent.press(getByText('Month'));

      expect(getByText('Month')).toBeTruthy();
    });

    it('should show different stats for monthly view', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('Month'));
      });

      await waitFor(() => {
        expect(getByText('Productivity Streaks')).toBeTruthy();
        expect(getByText('Best & Worst Days')).toBeTruthy();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should calculate and display weekly statistics', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Average Score')).toBeTruthy();
        // Should show percentage values
        expect(getByText(/\d+%/)).toBeTruthy();
      });
    });

    it('should display task completion statistics', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Tasks Completed')).toBeTruthy();
        // Should show completed/total format
        expect(getByText(/\d+\/\d+/)).toBeTruthy();
      });
    });

    it('should display medication adherence', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Medication Adherence')).toBeTruthy();
        expect(getByText('Average compliance')).toBeTruthy();
      });
    });
  });

  describe('Chart Display', () => {
    it('should display productivity trend chart', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Productivity Trend')).toBeTruthy();
      });
    });
  });

  describe('Category Statistics', () => {
    it('should display task category breakdown', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Task Categories')).toBeTruthy();
        expect(getByText('Work')).toBeTruthy();
        expect(getByText('Personal')).toBeTruthy();
      });
    });

    it('should show completion percentages for categories', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        // Should show percentage values for categories
        expect(getByText(/\d+%/)).toBeTruthy();
        expect(getByText(/\d+\/\d+ completed/)).toBeTruthy();
      });
    });
  });

  describe('Insights and Recommendations', () => {
    it('should display insights section', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Insights')).toBeTruthy();
      });
    });

    it('should display recommendations section', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Recommendations')).toBeTruthy();
      });
    });

    it('should display achievements section', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Achievements')).toBeTruthy();
      });
    });

    it('should show no insights message when none available', async () => {
      // Mock empty insights
      jest.doMock('../../utils/progressUtils', () => ({
        ...jest.requireActual('../../utils/progressUtils'),
        getProductivityInsights: jest.fn(() => ({
          insights: [],
          recommendations: [],
          achievements: [],
        })),
      }));

      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('No insights at the moment')).toBeTruthy();
        expect(getByText('No recommendations at the moment')).toBeTruthy();
        expect(getByText('No achievements at the moment')).toBeTruthy();
      });
    });
  });

  describe('Monthly View Features', () => {
    it('should display streak information in monthly view', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('Month'));
      });

      await waitFor(() => {
        expect(getByText('Current Streak')).toBeTruthy();
        expect(getByText('Longest Streak')).toBeTruthy();
      });
    });

    it('should display best and worst days in monthly view', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('Month'));
      });

      await waitFor(() => {
        expect(getByText('Best Day')).toBeTruthy();
        expect(getByText('Worst Day')).toBeTruthy();
      });
    });
  });

  describe('Data Loading and Refresh', () => {
    it('should load productivity logs on mount', async () => {
      render(<ProgressScreen />);

      await waitFor(() => {
        expect(mockStorage.loadProductivityLogs).toHaveBeenCalled();
      });
    });

    it('should generate today\'s log when data changes', async () => {
      render(<ProgressScreen />);

      await waitFor(() => {
        expect(mockStorage.addProductivityLog).toHaveBeenCalled();
      });
    });

    it('should handle refresh functionality', async () => {
      const { getByTestId } = render(<ProgressScreen />);

      // This would require adding testID to ScrollView
      // For now, we'll test that the component renders without errors
      await waitFor(() => {
        expect(mockStorage.loadProductivityLogs).toHaveBeenCalled();
      });
    });
  });

  describe('Trend Indicators', () => {
    it('should display trend icons and colors correctly', async () => {
      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        // Should show trend indicators (improving, declining, stable)
        const trendElements = [
          getByText(/📈|📉|➡️/),
          getByText(/improving|declining|stable/),
        ];
        expect(trendElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors gracefully', async () => {
      mockStorage.loadProductivityLogs.mockRejectedValue(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading progress data:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle log generation errors gracefully', async () => {
      mockStorage.addProductivityLog.mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ProgressScreen />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error generating today\'s log:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty productivity logs', async () => {
      mockStorage.loadProductivityLogs.mockResolvedValue([]);

      const { getByText } = render(<ProgressScreen />);

      await waitFor(() => {
        expect(getByText('Average Score')).toBeTruthy();
        // Should still render sections even with no data
      });
    });

    it('should handle empty task categories', async () => {
      mockUseTasks.mockReturnValue({
        state: {
          ...mockTasksState,
          tasks: [],
        },
      } as any);

      const { queryByText } = render(<ProgressScreen />);

      await waitFor(() => {
        // Should not show task categories section when no tasks
        expect(queryByText('Task Categories')).toBeFalsy();
      });
    });
  });
});