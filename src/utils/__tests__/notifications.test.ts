import PushNotification from 'react-native-push-notification';
import {
  initializeNotifications,
  scheduleTimetableEventReminder,
  scheduleTaskReminder,
  scheduleHighPriorityTaskReminder,
  scheduleMedicationReminder,
  cancelNotification,
  cancelNotificationsForItem,
  handleNotificationTap,
  handleNotificationAction,
  rescheduleNotificationsForEvents,
  rescheduleNotificationsForTasks,
} from '../notifications';
import { TimetableEvent, Task } from '../../types';

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  requestPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  getScheduledLocalNotifications: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

const mockPushNotification = PushNotification as jest.Mocked<typeof PushNotification>;

describe('Notifications Utils', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T08:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initializeNotifications', () => {
    it('should configure push notifications', async () => {
      mockPushNotification.requestPermissions.mockResolvedValue({
        alert: true,
        badge: true,
        sound: true,
      });

      const result = await initializeNotifications();

      expect(mockPushNotification.configure).toHaveBeenCalled();
      expect(mockPushNotification.requestPermissions).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle permission denial', async () => {
      mockPushNotification.requestPermissions.mockResolvedValue({
        alert: false,
        badge: false,
        sound: false,
      });

      const result = await initializeNotifications();

      expect(result).toBe(false);
    });

    it('should handle permission request errors', async () => {
      mockPushNotification.requestPermissions.mockRejectedValue(new Error('Permission denied'));

      const result = await initializeNotifications();

      expect(result).toBe(false);
    });
  });

  describe('scheduleTimetableEventReminder', () => {
    it('should schedule notification for enabled event', () => {
      scheduleTimetableEventReminder(mockEvent, 15);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'timetable_1',
          title: 'Upcoming: Test Event',
          message: 'Starting in 15 minutes at 10:00',
          date: new Date('2024-01-01T09:45:00'),
          category: 'TIMETABLE_EVENT',
        })
      );
    });

    it('should not schedule notification for disabled event', () => {
      const disabledEvent = { ...mockEvent, notificationEnabled: false };
      
      scheduleTimetableEventReminder(disabledEvent, 15);

      expect(mockPushNotification.localNotificationSchedule).not.toHaveBeenCalled();
    });

    it('should not schedule notification for past event', () => {
      const pastEvent = {
        ...mockEvent,
        startTime: new Date('2024-01-01T07:00:00'),
      };
      
      scheduleTimetableEventReminder(pastEvent, 15);

      expect(mockPushNotification.localNotificationSchedule).not.toHaveBeenCalled();
    });

    it('should cancel existing notification before scheduling new one', () => {
      scheduleTimetableEventReminder(mockEvent, 15);

      expect(mockPushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: 'timetable_1',
      });
    });
  });

  describe('scheduleTaskReminder', () => {
    it('should schedule due today reminder', () => {
      scheduleTaskReminder(mockTask, 'due_today');

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task_1_due_today',
          title: 'Task Due Today: Test Task',
          message: "Don't forget to complete your high priority task",
          importance: 'max',
          priority: 'max',
          category: 'TASK_REMINDER',
        })
      );
    });

    it('should schedule overdue reminder', () => {
      scheduleTaskReminder(mockTask, 'overdue');

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task_1_overdue',
          title: 'Overdue Task: Test Task',
          message: 'This high priority task is now overdue',
          category: 'TASK_REMINDER',
        })
      );
    });

    it('should not schedule reminder for completed task', () => {
      const completedTask = { ...mockTask, isCompleted: true };
      
      scheduleTaskReminder(completedTask, 'due_today');

      expect(mockPushNotification.localNotificationSchedule).not.toHaveBeenCalled();
    });

    it('should not schedule reminder for past time', () => {
      const pastTask = {
        ...mockTask,
        dueDate: new Date('2024-01-01T07:00:00'),
      };
      
      scheduleTaskReminder(pastTask, 'due_today');

      expect(mockPushNotification.localNotificationSchedule).not.toHaveBeenCalled();
    });

    it('should use different priority for medium/low priority tasks', () => {
      const mediumTask = { ...mockTask, priority: 'medium' as const };
      
      scheduleTaskReminder(mediumTask, 'due_today');

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          importance: 'high',
          priority: 'high',
        })
      );
    });
  });

  describe('scheduleHighPriorityTaskReminder', () => {
    it('should schedule morning reminder for high priority tasks', () => {
      const highPriorityTasks = [
        mockTask,
        { ...mockTask, id: '2', title: 'Another High Priority Task' },
      ];
      
      scheduleHighPriorityTaskReminder(highPriorityTasks);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'high_priority_morning',
          title: 'High Priority Tasks',
          message: 'You have 2 high-priority tasks: Test Task, Another High Priority Task',
          category: 'HIGH_PRIORITY_TASKS',
        })
      );
    });

    it('should not schedule reminder when no high priority tasks', () => {
      scheduleHighPriorityTaskReminder([]);

      expect(mockPushNotification.localNotificationSchedule).not.toHaveBeenCalled();
    });

    it('should limit task names in message and show count', () => {
      const manyTasks = Array.from({ length: 5 }, (_, i) => ({
        ...mockTask,
        id: `${i + 1}`,
        title: `Task ${i + 1}`,
      }));
      
      scheduleHighPriorityTaskReminder(manyTasks);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('and 2 more'),
        })
      );
    });

    it('should filter out completed tasks', () => {
      const tasks = [
        mockTask,
        { ...mockTask, id: '2', isCompleted: true },
      ];
      
      scheduleHighPriorityTaskReminder(tasks);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You have 1 high-priority task: Test Task',
        })
      );
    });
  });

  describe('scheduleMedicationReminder', () => {
    it('should schedule daily medication reminder', () => {
      scheduleMedicationReminder('Aspirin', '08:00', 'med1');

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'medication_med1_08:00',
          title: 'Time for Aspirin',
          message: "Don't forget to take your medication",
          repeatType: 'day',
          importance: 'max',
          priority: 'max',
          category: 'MEDICATION_REMINDER',
        })
      );
    });

    it('should schedule for next day if time has passed', () => {
      // Current time is 08:00, scheduling for 07:00 should be tomorrow
      scheduleMedicationReminder('Aspirin', '07:00', 'med1');

      const expectedDate = new Date('2024-01-02T07:00:00');
      
      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expectedDate,
        })
      );
    });
  });

  describe('cancelNotification', () => {
    it('should cancel specific notification', () => {
      cancelNotification('test_notification');

      expect(mockPushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: 'test_notification',
      });
    });
  });

  describe('cancelNotificationsForItem', () => {
    it('should cancel all notifications for specific item', () => {
      const mockNotifications = [
        {
          userInfo: {
            id: 'timetable_1',
            type: 'timetable_event',
            itemId: '1',
          },
        },
        {
          userInfo: {
            id: 'task_2_due_today',
            type: 'task_reminder',
            itemId: '2',
          },
        },
      ];
      
      mockPushNotification.getScheduledLocalNotifications.mockImplementation((callback) => {
        callback(mockNotifications);
      });

      cancelNotificationsForItem('1', 'timetable_event');

      expect(mockPushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: 'timetable_1',
      });
    });
  });

  describe('handleNotificationTap', () => {
    it('should handle timetable event notification tap', () => {
      const notification = {
        userInfo: {
          type: 'timetable_event',
          itemId: '1',
        },
      };
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationTap(notification);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to timetable event:', '1');
      
      consoleSpy.mockRestore();
    });

    it('should handle task reminder notification tap', () => {
      const notification = {
        userInfo: {
          type: 'task_reminder',
          itemId: '1',
        },
      };
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationTap(notification);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to task:', '1');
      
      consoleSpy.mockRestore();
    });

    it('should handle medication reminder notification tap', () => {
      const notification = {
        userInfo: {
          type: 'medication_reminder',
          itemId: '1',
        },
      };
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationTap(notification);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to medication:', '1');
      
      consoleSpy.mockRestore();
    });

    it('should handle notification without userInfo', () => {
      const notification = {};
      
      expect(() => handleNotificationTap(notification)).not.toThrow();
    });
  });

  describe('handleNotificationAction', () => {
    const mockNotificationData = {
      id: 'test_notification',
      type: 'task_reminder' as const,
      itemId: '1',
      title: 'Test',
      message: 'Test message',
    };

    it('should handle Mark Complete action', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationAction('Mark Complete', mockNotificationData);

      expect(consoleSpy).toHaveBeenCalledWith('Mark task complete:', '1');
      
      consoleSpy.mockRestore();
    });

    it('should handle Mark Taken action', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationAction('Mark Taken', mockNotificationData);

      expect(consoleSpy).toHaveBeenCalledWith('Mark medication taken:', '1');
      
      consoleSpy.mockRestore();
    });

    it('should handle Snooze action', () => {
      handleNotificationAction('Snooze', mockNotificationData);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test_notification_snooze',
          title: 'Test',
          message: 'Test message (Snoozed)',
        })
      );
    });

    it('should handle View actions', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      handleNotificationAction('View Task', mockNotificationData);

      expect(consoleSpy).toHaveBeenCalledWith('Handling notification tap:', mockNotificationData);
      
      consoleSpy.mockRestore();
    });
  });

  describe('rescheduleNotificationsForEvents', () => {
    it('should reschedule notifications for all events', () => {
      const events = [mockEvent, { ...mockEvent, id: '2' }];
      
      rescheduleNotificationsForEvents(events, 15);

      // Should cancel existing notifications for each event
      expect(mockPushNotification.getScheduledLocalNotifications).toHaveBeenCalled();
      
      // Should schedule new notifications for each event
      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('rescheduleNotificationsForTasks', () => {
    it('should reschedule notifications for incomplete tasks', () => {
      const tasks = [
        mockTask,
        { ...mockTask, id: '2', isCompleted: true },
      ];
      
      rescheduleNotificationsForTasks(tasks);

      // Should cancel existing notifications for each task
      expect(mockPushNotification.getScheduledLocalNotifications).toHaveBeenCalled();
      
      // Should schedule notifications for incomplete tasks only
      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalled();
    });

    it('should schedule high priority morning reminder', () => {
      const highPriorityTasks = [mockTask];
      
      rescheduleNotificationsForTasks(highPriorityTasks);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'high_priority_morning',
          title: 'High Priority Tasks',
        })
      );
    });
  });
});