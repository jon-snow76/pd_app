import { TimetableEvent, Task, Medication } from '../types';
import {
  initializeNotifications,
  scheduleTimetableEventReminder,
  scheduleTaskReminder,
  scheduleHighPriorityTaskReminder,
  scheduleMedicationReminder,
  cancelNotificationsForItem,
  rescheduleNotificationsForEvents,
  rescheduleNotificationsForTasks,
  checkNotificationPermissions,
  handleNotificationAction,
  NotificationData,
} from '../utils/notifications';

/**
 * Centralized notification service for managing all app notifications
 */
class NotificationService {
  private isInitialized = false;
  private hasPermissions = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<boolean> {
    try {
      this.hasPermissions = await initializeNotifications();
      this.isInitialized = true;
      console.log('NotificationService initialized with permissions:', this.hasPermissions);
      return this.hasPermissions;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      return false;
    }
  }

  /**
   * Check if notifications are available and permitted
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.hasPermissions = await checkNotificationPermissions();
    return this.hasPermissions;
  }

  /**
   * Schedule notifications for a timetable event
   */
  async scheduleEventNotifications(event: TimetableEvent, reminderOffsetMinutes: number = 15): Promise<void> {
    if (!this.hasPermissions || !event.notificationEnabled) {
      return;
    }

    try {
      scheduleTimetableEventReminder(event, reminderOffsetMinutes);
      
      // Schedule recurring event notifications if applicable
      if (event.isRecurring && event.recurrencePattern) {
        await this.scheduleRecurringEventNotifications(event, reminderOffsetMinutes);
      }
    } catch (error) {
      console.error('Failed to schedule event notifications:', error);
    }
  }

  /**
   * Schedule notifications for recurring events
   */
  private async scheduleRecurringEventNotifications(
    event: TimetableEvent,
    reminderOffsetMinutes: number
  ): Promise<void> {
    if (!event.recurrencePattern) return;

    const { type, interval, endDate } = event.recurrencePattern;
    const maxOccurrences = 30; // Limit to prevent too many notifications
    let currentDate = new Date(event.startTime);
    let occurrenceCount = 0;

    while (occurrenceCount < maxOccurrences) {
      // Calculate next occurrence
      switch (type) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (interval * 7));
          break;
        case 'custom':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
      }

      // Check if we've exceeded the end date
      if (endDate && currentDate > endDate) {
        break;
      }

      // Check if we've exceeded reasonable future limit (3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      if (currentDate > threeMonthsFromNow) {
        break;
      }

      // Create recurring event instance
      const recurringEvent: TimetableEvent = {
        ...event,
        id: `${event.id}_recurring_${currentDate.getTime()}`,
        startTime: new Date(currentDate),
      };

      scheduleTimetableEventReminder(recurringEvent, reminderOffsetMinutes);
      occurrenceCount++;
    }
  }

  /**
   * Schedule notifications for a task
   */
  async scheduleTaskNotifications(task: Task): Promise<void> {
    if (!this.hasPermissions || task.isCompleted) {
      return;
    }

    try {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      
      // Schedule due today reminder if task is due today
      if (this.isSameDay(dueDate, now)) {
        scheduleTaskReminder(task, 'due_today');
      }
      
      // Schedule overdue reminder for high priority tasks
      if (task.priority === 'high' && dueDate < now) {
        scheduleTaskReminder(task, 'overdue');
      }
      
      // Schedule due soon reminder (24 hours before)
      const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
      if (oneDayBefore > now) {
        await this.scheduleDueSoonReminder(task, oneDayBefore);
      }
    } catch (error) {
      console.error('Failed to schedule task notifications:', error);
    }
  }

  /**
   * Schedule due soon reminder for a task
   */
  private async scheduleDueSoonReminder(task: Task, reminderTime: Date): Promise<void> {
    const notificationId = `task_${task.id}_due_soon`;
    
    // This would use the same notification scheduling logic
    // but with a different message and timing
    console.log(`Scheduling due soon reminder for ${task.title} at ${reminderTime}`);
  }

  /**
   * Schedule batch notifications for high priority tasks
   */
  async scheduleHighPriorityBatchNotifications(tasks: Task[]): Promise<void> {
    if (!this.hasPermissions) {
      return;
    }

    try {
      scheduleHighPriorityTaskReminder(tasks);
    } catch (error) {
      console.error('Failed to schedule high priority batch notifications:', error);
    }
  }

  /**
   * Schedule notifications for medication
   */
  async scheduleMedicationNotifications(medication: Medication): Promise<void> {
    if (!this.hasPermissions || !medication.isActive) {
      return;
    }

    try {
      medication.reminderTimes.forEach(time => {
        scheduleMedicationReminder(medication.name, time, medication.id);
      });
    } catch (error) {
      console.error('Failed to schedule medication notifications:', error);
    }
  }

  /**
   * Cancel notifications for a specific item
   */
  async cancelItemNotifications(itemId: string, type: 'timetable_event' | 'task_reminder' | 'medication_reminder'): Promise<void> {
    try {
      cancelNotificationsForItem(itemId, type);
    } catch (error) {
      console.error('Failed to cancel item notifications:', error);
    }
  }

  /**
   * Reschedule all event notifications
   */
  async rescheduleEventNotifications(events: TimetableEvent[], reminderOffsetMinutes: number = 15): Promise<void> {
    if (!this.hasPermissions) {
      return;
    }

    try {
      rescheduleNotificationsForEvents(events, reminderOffsetMinutes);
    } catch (error) {
      console.error('Failed to reschedule event notifications:', error);
    }
  }

  /**
   * Reschedule all task notifications
   */
  async rescheduleTaskNotifications(tasks: Task[]): Promise<void> {
    if (!this.hasPermissions) {
      return;
    }

    try {
      rescheduleNotificationsForTasks(tasks);
    } catch (error) {
      console.error('Failed to reschedule task notifications:', error);
    }
  }

  /**
   * Handle notification actions from user interaction
   */
  async handleNotificationAction(action: string, notificationData: NotificationData): Promise<void> {
    try {
      handleNotificationAction(action, notificationData);
      
      // Additional handling based on action type
      switch (action) {
        case 'Mark Complete':
          await this.handleTaskCompletion(notificationData.itemId);
          break;
          
        case 'Mark Taken':
          await this.handleMedicationTaken(notificationData.itemId, notificationData.data?.time);
          break;
          
        case 'Snooze':
          await this.handleSnooze(notificationData);
          break;
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  }

  /**
   * Handle task completion from notification
   */
  private async handleTaskCompletion(taskId: string): Promise<void> {
    // This would integrate with the TasksContext
    console.log('Handling task completion from notification:', taskId);
    // TasksContext.toggleTaskCompletion(taskId);
  }

  /**
   * Handle medication taken from notification
   */
  private async handleMedicationTaken(medicationId: string, time: string): Promise<void> {
    // This would integrate with medication tracking
    console.log('Handling medication taken from notification:', medicationId, time);
    // MedicationContext.markMedicationTaken(medicationId, time);
  }

  /**
   * Handle notification snooze
   */
  private async handleSnooze(notificationData: NotificationData): Promise<void> {
    console.log('Handling notification snooze:', notificationData.id);
    // Snooze logic is handled in the notifications utility
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    scheduled: number;
    eventReminders: number;
    taskReminders: number;
    medicationReminders: number;
  }> {
    try {
      // This would query scheduled notifications and categorize them
      return {
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      };
    }
  }

  /**
   * Utility function to check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      // This would remove notifications for past events/tasks
      console.log('Cleaning up old notifications');
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;