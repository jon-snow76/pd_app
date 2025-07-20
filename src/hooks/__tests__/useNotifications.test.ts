import { renderHook, act } from '@testing-library/react-hooks';
import { useNotifications } from '../useNotifications';
import { notificationService } from '../../services/NotificationService';
import { useTimetable } from '../../context/TimetableContext';
import { useTasks } from '../../context/TasksContext';
import { useApp } from '../../context/AppContext';
import { TimetableEvent, Task } from '../../types';

// Mock dependencies
jest.mock('../../services/NotificationService');
jest.mock('../../context/TimetableContext');
jest.mock('../../context/TasksContext');
jest.mock('../../context/AppContext');

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockUseTimetable = useTimetable as jest.MockedFunction<typeof useTimetable>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

describe('useNotifications', () => {
  const mockEvent: TimetableEvent = {
    id: '1',
    title: 'Test Event',
    startTime: new Date('2024-01-01T10:00:00'),
    duration: 60,
    category: 'work',
    isRecurring: false,
    notificationEnabled: true,
  };

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    priority: 'high',
    dueDate: new Date('2024-01-01T17:00:00'),
    isCompleted: false,
    category: 'work',
  };

  const mockTimetableState = {
    events: [mockEvent],
    selectedDate: new Date(),
    loading: false,
    error: null,
    conflicts: [],
  };

  const mockTasksState = {
    tasks: [mockTask],
    loading: false,
    error: null,
    filter: 'all' as const,
    sortBy: 'dueDate' as const,
  };

  const mockAppState = {
    preferences: {
      notificationsEnabled: true,
      defaultEventDuration: 60,
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      reminderOffset: 15,
    },
    isInitialized: true,
    loading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTimetable.mockReturnValue({
      state: mockTimetableState,
    } as any);
    
    mockUseTasks.mockReturnValue({
      state: mockTasksState,
    } as any);
    
    mockUseApp.mockReturnValue({
      state: mockAppState,
    } as any);

    mockNotificationService.initialize.mockResolvedValue(true);
    mockNotificationService.rescheduleEventNotifications.mockResolvedValue();
    mockNotificationService.rescheduleTaskNotifications.mockResolvedValue();
    mockNotificationService.scheduleEventNotifications.mockResolvedValue();
    mockNotificationService.scheduleTaskNotifications.mockResolvedValue();
    mockNotificationService.cancelItemNotifications.mockResolvedValue();
    mockNotificationService.checkPermissions.mockResolvedValue(true);
    mockNotificationService.getNotificationStats.mockResolvedValue({
      scheduled: 5,
      eventReminders: 2,
      taskReminders: 2,
      medicationReminders: 1,
    });
    mockNotificationService.handleNotificationAction.mockResolvedValue();
    mockNotificationService.scheduleHighPriorityBatchNotifications.mockResolvedValue();
    mockNotificationService.cleanupOldNotifications.mockResolvedValue();
  });

  describe('Initialization', () => {
    it('should initialize notification service on mount', async () => {
      renderHook(() => useNotifications());

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockNotificationService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockNotificationService.initialize.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(consoleSpy).toHaveBeenCalledWith('Notification permissions not granted');
      consoleSpy.mockRestore();
    });

    it('should handle initialization error', async () => {
      mockNotificationService.initialize.mockRejectedValue(new Error('Init failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize notifications:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Event Notifications', () => {
    it('should reschedule event notifications when events change', async () => {
      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockNotificationService.rescheduleEventNotifications).toHaveBeenCalledWith(
        mockTimetableState.events,
        mockAppState.preferences.reminderOffset
      );
    });

    it('should not reschedule when notifications disabled', async () => {
      mockUseApp.mockReturnValue({
        state: {
          ...mockAppState,
          preferences: {
            ...mockAppState.preferences,
            notificationsEnabled: false,
          },
        },
      } as any);

      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockNotificationService.rescheduleEventNotifications).not.toHaveBeenCalled();
    });

    it('should schedule notification for specific event', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.scheduleEventNotification(mockEvent);
      });

      expect(mockNotificationService.scheduleEventNotifications).toHaveBeenCalledWith(
        mockEvent,
        mockAppState.preferences.reminderOffset
      );
    });

    it('should cancel event notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.cancelEventNotifications('1');
      });

      expect(mockNotificationService.cancelItemNotifications).toHaveBeenCalledWith('1', 'timetable_event');
    });
  });

  describe('Task Notifications', () => {
    it('should reschedule task notifications when tasks change', async () => {
      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockNotificationService.rescheduleTaskNotifications).toHaveBeenCalledWith(
        mockTasksState.tasks
      );
    });

    it('should not reschedule when notifications disabled', async () => {
      mockUseApp.mockReturnValue({
        state: {
          ...mockAppState,
          preferences: {
            ...mockAppState.preferences,
            notificationsEnabled: false,
          },
        },
      } as any);

      renderHook(() => useNotifications());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockNotificationService.rescheduleTaskNotifications).not.toHaveBeenCalled();
    });

    it('should schedule notification for specific task', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.scheduleTaskNotification(mockTask);
      });

      expect(mockNotificationService.scheduleTaskNotifications).toHaveBeenCalledWith(mockTask);
    });

    it('should cancel task notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.cancelTaskNotifications('1');
      });

      expect(mockNotificationService.cancelItemNotifications).toHaveBeenCalledWith('1', 'task_reminder');
    });

    it('should schedule high priority batch notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.scheduleHighPriorityBatchNotifications();
      });

      expect(mockNotificationService.scheduleHighPriorityBatchNotifications).toHaveBeenCalledWith([mockTask]);
    });
  });

  describe('Utility Functions', () => {
    it('should check permissions', async () => {
      const { result } = renderHook(() => useNotifications());

      const hasPermissions = await act(async () => {
        return await result.current.checkPermissions();
      });

      expect(mockNotificationService.checkPermissions).toHaveBeenCalled();
      expect(hasPermissions).toBe(true);
    });

    it('should get notification stats', async () => {
      const { result } = renderHook(() => useNotifications());

      const stats = await act(async () => {
        return await result.current.getNotificationStats();
      });

      expect(mockNotificationService.getNotificationStats).toHaveBeenCalled();
      expect(stats).toEqual({
        scheduled: 5,
        eventReminders: 2,
        taskReminders: 2,
        medicationReminders: 1,
      });
    });

    it('should handle notification action', async () => {
      const { result } = renderHook(() => useNotifications());
      const notificationData = {
        id: 'test',
        type: 'task_reminder' as const,
        itemId: '1',
        title: 'Test',
        message: 'Test message',
      };

      await act(async () => {
        await result.current.handleNotificationAction('Mark Complete', notificationData);
      });

      expect(mockNotificationService.handleNotificationAction).toHaveBeenCalledWith('Mark Complete', notificationData);
    });

    it('should cleanup old notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.cleanupOldNotifications();
      });

      expect(mockNotificationService.cleanupOldNotifications).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle event notification scheduling errors', async () => {
      mockNotificationService.scheduleEventNotifications.mockRejectedValue(new Error('Schedule failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.scheduleEventNotification(mockEvent);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to schedule event notification:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle task notification scheduling errors', async () => {
      mockNotificationService.scheduleTaskNotifications.mockRejectedValue(new Error('Schedule failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.scheduleTaskNotification(mockTask);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to schedule task notification:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle permission check errors', async () => {
      mockNotificationService.checkPermissions.mockRejectedValue(new Error('Permission check failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useNotifications());

      const hasPermissions = await act(async () => {
        return await result.current.checkPermissions();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check notification permissions:', expect.any(Error));
      expect(hasPermissions).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should handle stats retrieval errors', async () => {
      mockNotificationService.getNotificationStats.mockRejectedValue(new Error('Stats failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useNotifications());

      const stats = await act(async () => {
        return await result.current.getNotificationStats();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to get notification stats:', expect.any(Error));
      expect(stats).toEqual({
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      });
      consoleSpy.mockRestore();
    });
  });

  describe('State Properties', () => {
    it('should expose notification settings from app state', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notificationsEnabled).toBe(true);
      expect(result.current.reminderOffset).toBe(15);
    });

    it('should update when app state changes', () => {
      const { result, rerender } = renderHook(() => useNotifications());

      expect(result.current.notificationsEnabled).toBe(true);

      // Update app state
      mockUseApp.mockReturnValue({
        state: {
          ...mockAppState,
          preferences: {
            ...mockAppState.preferences,
            notificationsEnabled: false,
          },
        },
      } as any);

      rerender();

      expect(result.current.notificationsEnabled).toBe(false);
    });
  });
});