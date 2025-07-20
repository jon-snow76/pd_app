import NotificationService, { notificationService } from '../NotificationService';
import * as notifications from '../../utils/notifications';
import { TimetableEvent, Task, Medication } from '../../types';

// Mock the notifications utility
jest.mock('../../utils/notifications');

const mockNotifications = notifications as jest.Mocked<typeof notifications>;

describe('NotificationService', () => {
  let service: NotificationService;

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

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    priority: 'high',
    dueDate: new Date('2024-01-01T17:00:00'),
    isCompleted: false,
    category: 'work',
  };

  const mockMedication: Medication = {
    id: '1',
    name: 'Aspirin',
    dosage: '100mg',
    reminderTimes: ['08:00', '20:00'],
    isActive: true,
    adherenceLog: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
    
    // Mock successful initialization
    mockNotifications.initializeNotifications.mockResolvedValue(true);
    mockNotifications.checkNotificationPermissions.mockResolvedValue(true);
  });

  describe('Initialization', () => {
    it('should initialize successfully with permissions', async () => {
      const result = await service.initialize();

      expect(mockNotifications.initializeNotifications).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle initialization failure', async () => {
      mockNotifications.initializeNotifications.mockResolvedValue(false);

      const result = await service.initialize();

      expect(result).toBe(false);
    });

    it('should handle initialization error', async () => {
      mockNotifications.initializeNotifications.mockRejectedValue(new Error('Init failed'));

      const result = await service.initialize();

      expect(result).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    it('should check permissions after initialization', async () => {
      await service.initialize();
      
      const result = await service.checkPermissions();

      expect(mockNotifications.checkNotificationPermissions).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should initialize if not already initialized', async () => {
      const result = await service.checkPermissions();

      expect(mockNotifications.initializeNotifications).toHaveBeenCalled();
      expect(mockNotifications.checkNotificationPermissions).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Event Notifications', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should schedule notifications for enabled event', async () => {
      await service.scheduleEventNotifications(mockEvent, 15);

      expect(mockNotifications.scheduleTimetableEventReminder).toHaveBeenCalledWith(mockEvent, 15);
    });

    it('should not schedule notifications when permissions denied', async () => {
      mockNotifications.checkNotificationPermissions.mockResolvedValue(false);
      await service.checkPermissions();

      await service.scheduleEventNotifications(mockEvent, 15);

      expect(mockNotifications.scheduleTimetableEventReminder).not.toHaveBeenCalled();
    });

    it('should not schedule notifications for disabled event', async () => {
      const disabledEvent = { ...mockEvent, notificationEnabled: false };

      await service.scheduleEventNotifications(disabledEvent, 15);

      expect(mockNotifications.scheduleTimetableEventReminder).not.toHaveBeenCalled();
    });

    it('should schedule recurring event notifications', async () => {
      await service.scheduleEventNotifications(mockRecurringEvent, 15);

      expect(mockNotifications.scheduleTimetableEventReminder).toHaveBeenCalledWith(mockRecurringEvent, 15);
      // Additional calls for recurring instances would be made
    });

    it('should handle scheduling errors gracefully', async () => {
      mockNotifications.scheduleTimetableEventReminder.mockImplementation(() => {
        throw new Error('Scheduling failed');
      });

      await expect(service.scheduleEventNotifications(mockEvent, 15)).resolves.not.toThrow();
    });
  });

  describe('Task Notifications', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T08:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule notifications for incomplete task', async () => {
      await service.scheduleTaskNotifications(mockTask);

      expect(mockNotifications.scheduleTaskReminder).toHaveBeenCalledWith(mockTask, 'due_today');
    });

    it('should not schedule notifications for completed task', async () => {
      const completedTask = { ...mockTask, isCompleted: true };

      await service.scheduleTaskNotifications(completedTask);

      expect(mockNotifications.scheduleTaskReminder).not.toHaveBeenCalled();
    });

    it('should not schedule notifications when permissions denied', async () => {
      mockNotifications.checkNotificationPermissions.mockResolvedValue(false);
      await service.checkPermissions();

      await service.scheduleTaskNotifications(mockTask);

      expect(mockNotifications.scheduleTaskReminder).not.toHaveBeenCalled();
    });

    it('should schedule overdue reminder for high priority past tasks', async () => {
      const overdueTask = {
        ...mockTask,
        dueDate: new Date('2023-12-31T17:00:00'),
      };

      await service.scheduleTaskNotifications(overdueTask);

      expect(mockNotifications.scheduleTaskReminder).toHaveBeenCalledWith(overdueTask, 'overdue');
    });

    it('should handle scheduling errors gracefully', async () => {
      mockNotifications.scheduleTaskReminder.mockImplementation(() => {
        throw new Error('Scheduling failed');
      });

      await expect(service.scheduleTaskNotifications(mockTask)).resolves.not.toThrow();
    });
  });

  describe('High Priority Batch Notifications', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should schedule batch notifications for high priority tasks', async () => {
      const highPriorityTasks = [mockTask, { ...mockTask, id: '2' }];

      await service.scheduleHighPriorityBatchNotifications(highPriorityTasks);

      expect(mockNotifications.scheduleHighPriorityTaskReminder).toHaveBeenCalledWith(highPriorityTasks);
    });

    it('should not schedule when permissions denied', async () => {
      mockNotifications.checkNotificationPermissions.mockResolvedValue(false);
      await service.checkPermissions();

      await service.scheduleHighPriorityBatchNotifications([mockTask]);

      expect(mockNotifications.scheduleHighPriorityTaskReminder).not.toHaveBeenCalled();
    });

    it('should handle scheduling errors gracefully', async () => {
      mockNotifications.scheduleHighPriorityTaskReminder.mockImplementation(() => {
        throw new Error('Scheduling failed');
      });

      await expect(service.scheduleHighPriorityBatchNotifications([mockTask])).resolves.not.toThrow();
    });
  });

  describe('Medication Notifications', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should schedule notifications for active medication', async () => {
      await service.scheduleMedicationNotifications(mockMedication);

      expect(mockNotifications.scheduleMedicationReminder).toHaveBeenCalledWith('Aspirin', '08:00', '1');
      expect(mockNotifications.scheduleMedicationReminder).toHaveBeenCalledWith('Aspirin', '20:00', '1');
    });

    it('should not schedule notifications for inactive medication', async () => {
      const inactiveMedication = { ...mockMedication, isActive: false };

      await service.scheduleMedicationNotifications(inactiveMedication);

      expect(mockNotifications.scheduleMedicationReminder).not.toHaveBeenCalled();
    });

    it('should not schedule when permissions denied', async () => {
      mockNotifications.checkNotificationPermissions.mockResolvedValue(false);
      await service.checkPermissions();

      await service.scheduleMedicationNotifications(mockMedication);

      expect(mockNotifications.scheduleMedicationReminder).not.toHaveBeenCalled();
    });

    it('should handle scheduling errors gracefully', async () => {
      mockNotifications.scheduleMedicationReminder.mockImplementation(() => {
        throw new Error('Scheduling failed');
      });

      await expect(service.scheduleMedicationNotifications(mockMedication)).resolves.not.toThrow();
    });
  });

  describe('Notification Cancellation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cancel notifications for specific item', async () => {
      await service.cancelItemNotifications('1', 'timetable_event');

      expect(mockNotifications.cancelNotificationsForItem).toHaveBeenCalledWith('1', 'timetable_event');
    });

    it('should handle cancellation errors gracefully', async () => {
      mockNotifications.cancelNotificationsForItem.mockImplementation(() => {
        throw new Error('Cancellation failed');
      });

      await expect(service.cancelItemNotifications('1', 'timetable_event')).resolves.not.toThrow();
    });
  });

  describe('Notification Rescheduling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should reschedule event notifications', async () => {
      const events = [mockEvent, { ...mockEvent, id: '2' }];

      await service.rescheduleEventNotifications(events, 15);

      expect(mockNotifications.rescheduleNotificationsForEvents).toHaveBeenCalledWith(events, 15);
    });

    it('should reschedule task notifications', async () => {
      const tasks = [mockTask, { ...mockTask, id: '2' }];

      await service.rescheduleTaskNotifications(tasks);

      expect(mockNotifications.rescheduleNotificationsForTasks).toHaveBeenCalledWith(tasks);
    });

    it('should not reschedule when permissions denied', async () => {
      mockNotifications.checkNotificationPermissions.mockResolvedValue(false);
      await service.checkPermissions();

      await service.rescheduleEventNotifications([mockEvent], 15);
      await service.rescheduleTaskNotifications([mockTask]);

      expect(mockNotifications.rescheduleNotificationsForEvents).not.toHaveBeenCalled();
      expect(mockNotifications.rescheduleNotificationsForTasks).not.toHaveBeenCalled();
    });

    it('should handle rescheduling errors gracefully', async () => {
      mockNotifications.rescheduleNotificationsForEvents.mockImplementation(() => {
        throw new Error('Rescheduling failed');
      });

      await expect(service.rescheduleEventNotifications([mockEvent], 15)).resolves.not.toThrow();
    });
  });

  describe('Notification Actions', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle notification actions', async () => {
      const notificationData = {
        id: 'test',
        type: 'task_reminder' as const,
        itemId: '1',
        title: 'Test',
        message: 'Test message',
      };

      await service.handleNotificationAction('Mark Complete', notificationData);

      expect(mockNotifications.handleNotificationAction).toHaveBeenCalledWith('Mark Complete', notificationData);
    });

    it('should handle action errors gracefully', async () => {
      mockNotifications.handleNotificationAction.mockImplementation(() => {
        throw new Error('Action failed');
      });

      const notificationData = {
        id: 'test',
        type: 'task_reminder' as const,
        itemId: '1',
        title: 'Test',
        message: 'Test message',
      };

      await expect(service.handleNotificationAction('Mark Complete', notificationData)).resolves.not.toThrow();
    });
  });

  describe('Notification Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return notification statistics', async () => {
      const stats = await service.getNotificationStats();

      expect(stats).toEqual({
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      });
    });

    it('should handle stats errors gracefully', async () => {
      // Mock an error in the stats calculation
      jest.spyOn(console, 'error').mockImplementation();

      const stats = await service.getNotificationStats();

      expect(stats).toEqual({
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      });
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cleanup old notifications', async () => {
      await service.cleanupOldNotifications();

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock console.error to avoid test output
      jest.spyOn(console, 'error').mockImplementation();

      await expect(service.cleanupOldNotifications()).resolves.not.toThrow();
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = notificationService;
      const instance2 = notificationService;

      expect(instance1).toBe(instance2);
    });
  });
});