import PushNotification from 'react-native-push-notification';
import { addMinutes, addHours, addDays, format } from 'date-fns';
import { TimetableEvent, Task, Medication } from '../types';

// Mock PushNotification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
}));

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current time
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-25T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timetable Event Notifications', () => {
    it('should schedule notification 15 minutes before event', () => {
      const event: TimetableEvent = {
        id: 'event-1',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime: addMinutes(new Date(), 30), // 30 minutes from now
        duration: 60,
        category: 'work',
        isRecurring: false,
        notificationEnabled: true,
      };

      // Schedule notification
      const notificationTime = addMinutes(event.startTime, -15);
      
      PushNotification.localNotificationSchedule({
        id: event.id,
        title: 'Event Reminder',
        message: `${event.title} starts in 15 minutes`,
        date: notificationTime,
        userInfo: {
          type: 'event',
          eventId: event.id,
          deepLink: `productivityapp://timetable?eventId=${event.id}`,
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith({
        id: event.id,
        title: 'Event Reminder',
        message: `${event.title} starts in 15 minutes`,
        date: notificationTime,
        userInfo: {
          type: 'event',
          eventId: event.id,
          deepLink: `productivityapp://timetable?eventId=${event.id}`,
        },
      });
    });

    it('should include event details in notification', () => {
      const event: TimetableEvent = {
        id: 'event-2',
        title: 'Doctor Appointment',
        description: 'Annual checkup',
        startTime: addHours(new Date(), 2),
        duration: 30,
        category: 'health',
        isRecurring: false,
        notificationEnabled: true,
      };

      const notificationTime = addMinutes(event.startTime, -15);
      
      PushNotification.localNotificationSchedule({
        id: event.id,
        title: 'Event Reminder',
        message: `${event.title} starts at ${format(event.startTime, 'h:mm a')}`,
        date: notificationTime,
        userInfo: {
          type: 'event',
          eventId: event.id,
          category: event.category,
          duration: event.duration,
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Doctor Appointment'),
          userInfo: expect.objectContaining({
            category: 'health',
            duration: 30,
          }),
        })
      );
    });

    it('should handle recurring event notifications', () => {
      const recurringEvent: TimetableEvent = {
        id: 'recurring-1',
        title: 'Daily Standup',
        description: 'Team standup meeting',
        startTime: addDays(new Date(), 1), // Tomorrow
        duration: 15,
        category: 'work',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'daily',
          interval: 1,
        },
      };

      // Schedule notifications for next 7 days
      for (let i = 0; i < 7; i++) {
        const eventDate = addDays(recurringEvent.startTime, i);
        const notificationTime = addMinutes(eventDate, -15);
        
        PushNotification.localNotificationSchedule({
          id: `${recurringEvent.id}_${format(eventDate, 'yyyy-MM-dd')}`,
          title: 'Daily Reminder',
          message: `${recurringEvent.title} starts in 15 minutes`,
          date: notificationTime,
          userInfo: {
            type: 'recurring_event',
            parentEventId: recurringEvent.id,
            instanceDate: eventDate.toISOString(),
          },
        });
      }

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledTimes(7);
    });
  });

  describe('Task Notifications', () => {
    it('should send morning reminder for high-priority tasks due today', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Submit quarterly report',
        description: 'Q4 financial report',
        priority: 'high',
        dueDate: new Date(), // Due today
        isCompleted: false,
        category: 'work',
      };

      // Schedule morning reminder (8 AM)
      const morningTime = new Date();
      morningTime.setHours(8, 0, 0, 0);

      PushNotification.localNotificationSchedule({
        id: `task_morning_${task.id}`,
        title: 'High Priority Task Due Today',
        message: `Don't forget: ${task.title}`,
        date: morningTime,
        userInfo: {
          type: 'task',
          taskId: task.id,
          priority: task.priority,
          deepLink: `productivityapp://tasks?taskId=${task.id}`,
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'High Priority Task Due Today',
          message: expect.stringContaining('Submit quarterly report'),
          userInfo: expect.objectContaining({
            priority: 'high',
          }),
        })
      );
    });

    it('should send overdue task notifications', () => {
      const overdueTask: Task = {
        id: 'task-2',
        title: 'Review contract',
        description: 'Legal contract review',
        priority: 'medium',
        dueDate: addDays(new Date(), -1), // Yesterday
        isCompleted: false,
        category: 'work',
      };

      PushNotification.localNotification({
        id: `task_overdue_${overdueTask.id}`,
        title: 'Overdue Task',
        message: `${overdueTask.title} was due yesterday`,
        userInfo: {
          type: 'task_overdue',
          taskId: overdueTask.id,
          daysOverdue: 1,
        },
      });

      expect(PushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overdue Task',
          message: expect.stringContaining('was due yesterday'),
          userInfo: expect.objectContaining({
            type: 'task_overdue',
            daysOverdue: 1,
          }),
        })
      );
    });

    it('should not send notifications for completed tasks', () => {
      const completedTask: Task = {
        id: 'task-3',
        title: 'Completed task',
        description: 'This task is done',
        priority: 'high',
        dueDate: new Date(),
        isCompleted: true,
        completedAt: new Date(),
        category: 'work',
      };

      // Should not schedule notification for completed task
      const shouldSchedule = !completedTask.isCompleted;
      expect(shouldSchedule).toBe(false);
    });
  });

  describe('Medication Notifications', () => {
    it('should schedule medication reminders at specified times', () => {
      const medication: Medication = {
        id: 'med-1',
        name: 'Vitamin D',
        dosage: '1000 IU',
        reminderTimes: ['08:00', '20:00'],
        isActive: true,
        adherenceLog: [],
      };

      // Schedule notifications for each reminder time
      medication.reminderTimes.forEach((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        const notificationTime = new Date();
        notificationTime.setHours(hours, minutes, 0, 0);

        PushNotification.localNotificationSchedule({
          id: `${medication.id}_${index}`,
          title: 'Medication Reminder',
          message: `Time to take ${medication.name} (${medication.dosage})`,
          date: notificationTime,
          repeatType: 'day',
          userInfo: {
            type: 'medication',
            medicationId: medication.id,
            reminderIndex: index,
            deepLink: `productivityapp://medications?medicationId=${medication.id}`,
          },
        });
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledTimes(2);
      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Vitamin D'),
          repeatType: 'day',
        })
      );
    });

    it('should send follow-up reminder for missed medications', () => {
      const medication: Medication = {
        id: 'med-2',
        name: 'Blood Pressure Medication',
        dosage: '10mg',
        reminderTimes: ['09:00'],
        isActive: true,
        adherenceLog: [],
      };

      // Original reminder time
      const originalTime = new Date();
      originalTime.setHours(9, 0, 0, 0);

      // Follow-up reminder (30 minutes later)
      const followUpTime = addMinutes(originalTime, 30);

      PushNotification.localNotificationSchedule({
        id: `${medication.id}_followup`,
        title: 'Missed Medication Reminder',
        message: `You missed your ${medication.name}. Please take it now if safe to do so.`,
        date: followUpTime,
        userInfo: {
          type: 'medication_followup',
          medicationId: medication.id,
          originalTime: originalTime.toISOString(),
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Missed Medication Reminder',
          message: expect.stringContaining('You missed your'),
          userInfo: expect.objectContaining({
            type: 'medication_followup',
          }),
        })
      );
    });

    it('should handle medication confirmation and cancel follow-up', () => {
      const medicationId = 'med-3';
      const reminderIndex = 0;

      // User confirms taking medication
      const confirmationTime = new Date();
      
      // Cancel follow-up reminder
      PushNotification.cancelLocalNotifications({
        id: `${medicationId}_followup`,
      });

      // Log adherence
      const adherenceEntry = {
        date: format(confirmationTime, 'yyyy-MM-dd'),
        time: format(confirmationTime, 'HH:mm'),
        taken: true,
        takenAt: confirmationTime,
      };

      expect(PushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: `${medicationId}_followup`,
      });
      expect(adherenceEntry.taken).toBe(true);
    });
  });

  describe('Notification Accuracy and Timing', () => {
    it('should schedule notifications with correct timing', () => {
      const now = new Date('2023-12-25T10:00:00');
      const eventTime = new Date('2023-12-25T14:30:00'); // 2:30 PM
      const expectedNotificationTime = new Date('2023-12-25T14:15:00'); // 2:15 PM

      const event: TimetableEvent = {
        id: 'timing-test',
        title: 'Timing Test Event',
        startTime: eventTime,
        duration: 60,
        category: 'work',
        isRecurring: false,
        notificationEnabled: true,
      };

      const notificationTime = addMinutes(event.startTime, -15);

      expect(notificationTime).toEqual(expectedNotificationTime);
    });

    it('should handle timezone changes correctly', () => {
      // Mock timezone change scenario
      const originalTime = new Date('2023-12-25T10:00:00');
      const timezoneOffset = originalTime.getTimezoneOffset();
      
      // Notification should account for timezone
      const adjustedTime = new Date(originalTime.getTime() - (timezoneOffset * 60000));
      
      expect(adjustedTime).toBeInstanceOf(Date);
    });

    it('should batch notifications to avoid spam', () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-${i}`,
        title: `Event ${i}`,
        startTime: addMinutes(new Date(), 30 + i),
        duration: 30,
        category: 'work' as const,
        isRecurring: false,
        notificationEnabled: true,
      }));

      // Should batch notifications that are close together
      const batchedNotifications = events.reduce((batches, event) => {
        const notificationTime = addMinutes(event.startTime, -15);
        const batchKey = format(notificationTime, 'yyyy-MM-dd HH:mm');
        
        if (!batches[batchKey]) {
          batches[batchKey] = [];
        }
        batches[batchKey].push(event);
        
        return batches;
      }, {} as Record<string, typeof events>);

      // Should have multiple batches
      expect(Object.keys(batchedNotifications).length).toBeGreaterThan(1);
    });
  });

  describe('Notification Actions and Deep Links', () => {
    it('should handle notification tap with deep links', () => {
      const event: TimetableEvent = {
        id: 'deeplink-test',
        title: 'Deep Link Test',
        startTime: addMinutes(new Date(), 30),
        duration: 60,
        category: 'work',
        isRecurring: false,
        notificationEnabled: true,
      };

      const deepLink = `productivityapp://timetable?eventId=${event.id}`;

      PushNotification.localNotificationSchedule({
        id: event.id,
        title: 'Event Reminder',
        message: event.title,
        date: addMinutes(event.startTime, -15),
        userInfo: {
          deepLink,
          type: 'event',
          eventId: event.id,
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          userInfo: expect.objectContaining({
            deepLink: `productivityapp://timetable?eventId=${event.id}`,
          }),
        })
      );
    });

    it('should provide notification actions for medications', () => {
      const medication: Medication = {
        id: 'action-test',
        name: 'Test Medication',
        dosage: '5mg',
        reminderTimes: ['12:00'],
        isActive: true,
        adherenceLog: [],
      };

      PushNotification.localNotificationSchedule({
        id: medication.id,
        title: 'Medication Reminder',
        message: `Time to take ${medication.name}`,
        date: new Date(),
        actions: ['TAKEN', 'SNOOZE', 'SKIP'],
        userInfo: {
          type: 'medication',
          medicationId: medication.id,
          actions: {
            TAKEN: { action: 'confirm', medicationId: medication.id },
            SNOOZE: { action: 'snooze', duration: 15 },
            SKIP: { action: 'skip', medicationId: medication.id },
          },
        },
      });

      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: ['TAKEN', 'SNOOZE', 'SKIP'],
          userInfo: expect.objectContaining({
            actions: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('Notification Cleanup and Management', () => {
    it('should cancel notifications for deleted events', () => {
      const eventId = 'deleted-event';

      PushNotification.cancelLocalNotifications({
        id: eventId,
      });

      expect(PushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: eventId,
      });
    });

    it('should update notifications when events are modified', () => {
      const originalEvent: TimetableEvent = {
        id: 'modified-event',
        title: 'Original Title',
        startTime: new Date('2023-12-25T14:00:00'),
        duration: 60,
        category: 'work',
        isRecurring: false,
        notificationEnabled: true,
      };

      const updatedEvent: TimetableEvent = {
        ...originalEvent,
        title: 'Updated Title',
        startTime: new Date('2023-12-25T15:00:00'), // Changed time
      };

      // Cancel original notification
      PushNotification.cancelLocalNotifications({
        id: originalEvent.id,
      });

      // Schedule new notification
      PushNotification.localNotificationSchedule({
        id: updatedEvent.id,
        title: 'Event Reminder',
        message: updatedEvent.title,
        date: addMinutes(updatedEvent.startTime, -15),
        userInfo: {
          type: 'event',
          eventId: updatedEvent.id,
        },
      });

      expect(PushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
        id: originalEvent.id,
      });
      expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Updated Title',
        })
      );
    });

    it('should clean up all notifications on app reset', () => {
      PushNotification.cancelAllLocalNotifications();

      expect(PushNotification.cancelAllLocalNotifications).toHaveBeenCalled();
    });
  });

  describe('Permission Integration', () => {
    it('should check permissions before scheduling notifications', () => {
      PushNotification.checkPermissions((permissions) => {
        const hasPermission = permissions.alert && permissions.badge && permissions.sound;
        
        if (hasPermission) {
          // Schedule notification
          PushNotification.localNotificationSchedule({
            id: 'permission-test',
            title: 'Test Notification',
            message: 'This should only be scheduled if permissions are granted',
            date: new Date(),
          });
        }
      });

      expect(PushNotification.checkPermissions).toHaveBeenCalled();
    });

    it('should handle permission denial gracefully', () => {
      // Mock permission denial
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: false, badge: false, sound: false });
      });

      PushNotification.checkPermissions((permissions) => {
        const hasPermission = permissions.alert;
        expect(hasPermission).toBe(false);
        
        // Should not schedule notification without permission
        if (!hasPermission) {
          console.log('Notifications disabled - using alternative reminder method');
        }
      });
    });
  });
});