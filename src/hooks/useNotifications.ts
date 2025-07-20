import { useEffect, useCallback } from 'react';
import { notificationService } from '../services/NotificationService';
import { useTimetable } from '../context/TimetableContext';
import { useTasks } from '../context/TasksContext';
import { useApp } from '../context/AppContext';
import { TimetableEvent, Task } from '../types';

/**
 * Custom hook for managing notifications across the app
 */
export const useNotifications = () => {
  const { state: timetableState } = useTimetable();
  const { state: tasksState } = useTasks();
  const { state: appState } = useApp();

  // Initialize notifications on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const hasPermissions = await notificationService.initialize();
        if (!hasPermissions) {
          console.warn('Notification permissions not granted');
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Reschedule event notifications when events change
  useEffect(() => {
    const rescheduleEventNotifications = async () => {
      if (!appState.preferences.notificationsEnabled) {
        return;
      }

      try {
        await notificationService.rescheduleEventNotifications(
          timetableState.events,
          appState.preferences.reminderOffset
        );
      } catch (error) {
        console.error('Failed to reschedule event notifications:', error);
      }
    };

    if (timetableState.events.length > 0) {
      rescheduleEventNotifications();
    }
  }, [timetableState.events, appState.preferences.notificationsEnabled, appState.preferences.reminderOffset]);

  // Reschedule task notifications when tasks change
  useEffect(() => {
    const rescheduleTaskNotifications = async () => {
      if (!appState.preferences.notificationsEnabled) {
        return;
      }

      try {
        await notificationService.rescheduleTaskNotifications(tasksState.tasks);
      } catch (error) {
        console.error('Failed to reschedule task notifications:', error);
      }
    };

    if (tasksState.tasks.length > 0) {
      rescheduleTaskNotifications();
    }
  }, [tasksState.tasks, appState.preferences.notificationsEnabled]);

  // Schedule notification for a specific event
  const scheduleEventNotification = useCallback(async (event: TimetableEvent) => {
    if (!appState.preferences.notificationsEnabled) {
      return;
    }

    try {
      await notificationService.scheduleEventNotifications(
        event,
        appState.preferences.reminderOffset
      );
    } catch (error) {
      console.error('Failed to schedule event notification:', error);
    }
  }, [appState.preferences.notificationsEnabled, appState.preferences.reminderOffset]);

  // Schedule notification for a specific task
  const scheduleTaskNotification = useCallback(async (task: Task) => {
    if (!appState.preferences.notificationsEnabled) {
      return;
    }

    try {
      await notificationService.scheduleTaskNotifications(task);
    } catch (error) {
      console.error('Failed to schedule task notification:', error);
    }
  }, [appState.preferences.notificationsEnabled]);

  // Cancel notifications for a specific event
  const cancelEventNotifications = useCallback(async (eventId: string) => {
    try {
      await notificationService.cancelItemNotifications(eventId, 'timetable_event');
    } catch (error) {
      console.error('Failed to cancel event notifications:', error);
    }
  }, []);

  // Cancel notifications for a specific task
  const cancelTaskNotifications = useCallback(async (taskId: string) => {
    try {
      await notificationService.cancelItemNotifications(taskId, 'task_reminder');
    } catch (error) {
      console.error('Failed to cancel task notifications:', error);
    }
  }, []);

  // Check notification permissions
  const checkPermissions = useCallback(async () => {
    try {
      return await notificationService.checkPermissions();
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }, []);

  // Get notification statistics
  const getNotificationStats = useCallback(async () => {
    try {
      return await notificationService.getNotificationStats();
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        scheduled: 0,
        eventReminders: 0,
        taskReminders: 0,
        medicationReminders: 0,
      };
    }
  }, []);

  // Handle notification actions
  const handleNotificationAction = useCallback(async (action: string, notificationData: any) => {
    try {
      await notificationService.handleNotificationAction(action, notificationData);
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  }, []);

  // Schedule high priority task batch notifications
  const scheduleHighPriorityBatchNotifications = useCallback(async () => {
    if (!appState.preferences.notificationsEnabled) {
      return;
    }

    try {
      const highPriorityTasks = tasksState.tasks.filter(
        task => task.priority === 'high' && !task.isCompleted
      );
      
      if (highPriorityTasks.length > 0) {
        await notificationService.scheduleHighPriorityBatchNotifications(highPriorityTasks);
      }
    } catch (error) {
      console.error('Failed to schedule high priority batch notifications:', error);
    }
  }, [tasksState.tasks, appState.preferences.notificationsEnabled]);

  // Clean up old notifications
  const cleanupOldNotifications = useCallback(async () => {
    try {
      await notificationService.cleanupOldNotifications();
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }, []);

  return {
    // Notification management
    scheduleEventNotification,
    scheduleTaskNotification,
    cancelEventNotifications,
    cancelTaskNotifications,
    scheduleHighPriorityBatchNotifications,
    
    // Utility functions
    checkPermissions,
    getNotificationStats,
    handleNotificationAction,
    cleanupOldNotifications,
    
    // State
    notificationsEnabled: appState.preferences.notificationsEnabled,
    reminderOffset: appState.preferences.reminderOffset,
  };
};

export default useNotifications;