import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TimetableEvent, Task } from '../types';
import { formatTimeString, formatDateString } from './helpers';

// Notification types
export type NotificationType = 'timetable_event' | 'task_reminder' | 'medication_reminder';

export interface NotificationData {
  id: string;
  type: NotificationType;
  itemId: string;
  title: string;
  message: string;
  data?: any;
}

/**
 * Initialize push notifications
 */
export const initializeNotifications = (): Promise<boolean> => {
  return new Promise((resolve) => {
    PushNotification.configure({
      // Called when token is generated (iOS and Android)
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      // Called when a remote or local notification is opened or received
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          handleNotificationTap(notification);
        }

        // Required on iOS only
        notification.finish(PushNotification.FetchResult.NoData);
      },

      // Called when the user fails to register for remote notifications
      onRegistrationError: function (err) {
        console.error(err.message, err);
      },

      // IOS ONLY: Called when a remote notification is received while app is in foreground
      onRemoteNotification: function (notification) {
        console.log('REMOTE NOTIFICATION:', notification);
      },

      // Android only: GCM or FCM Sender ID
      senderID: 'YOUR_SENDER_ID',

      // IOS only: if true, app will request permissions on launch
      requestPermissions: Platform.OS === 'ios',

      // Should the initial notification be popped automatically
      popInitialNotification: true,
    });

    // Request permissions for iOS
    if (Platform.OS === 'ios') {
      PushNotification.requestPermissions()
        .then((permissions) => {
          console.log('Notification permissions:', permissions);
          resolve(permissions.alert || permissions.badge || permissions.sound);
        })
        .catch((error) => {
          console.error('Failed to request permissions:', error);
          resolve(false);
        });
    } else {
      resolve(true);
    }
  });
};

/**
 * Check if notifications are enabled
 */
export const checkNotificationPermissions = (): Promise<boolean> => {
  return new Promise((resolve) => {
    PushNotification.checkPermissions((permissions) => {
      const hasPermissions = permissions.alert || permissions.badge || permissions.sound;
      resolve(hasPermissions);
    });
  });
};

/**
 * Schedule a timetable event reminder
 */
export const scheduleTimetableEventReminder = (
  event: TimetableEvent,
  reminderOffsetMinutes: number = 15
): void => {
  if (!event.notificationEnabled) {
    return;
  }

  const reminderTime = new Date(event.startTime.getTime() - reminderOffsetMinutes * 60000);
  const now = new Date();

  // Don't schedule notifications for past events
  if (reminderTime <= now) {
    return;
  }

  const notificationId = `timetable_${event.id}`;
  
  // Cancel existing notification for this event
  cancelNotification(notificationId);

  const notificationData: NotificationData = {
    id: notificationId,
    type: 'timetable_event',
    itemId: event.id,
    title: `Upcoming: ${event.title}`,
    message: `Starting in ${reminderOffsetMinutes} minutes at ${formatTimeString(event.startTime)}`,
    data: {
      eventId: event.id,
      eventTitle: event.title,
      startTime: event.startTime.toISOString(),
      category: event.category,
    },
  };

  PushNotification.localNotificationSchedule({
    id: notificationId,
    title: notificationData.title,
    message: notificationData.message,
    date: reminderTime,
    soundName: 'default',
    playSound: true,
    vibrate: true,
    vibration: 300,
    importance: 'high',
    priority: 'high',
    userInfo: notificationData,
    actions: ['View Event', 'Dismiss'],
    category: 'TIMETABLE_EVENT',
  });

  console.log(`Scheduled timetable reminder for ${event.title} at ${reminderTime}`);
};

/**
 * Schedule task reminder notifications
 */
export const scheduleTaskReminder = (task: Task, reminderType: 'due_today' | 'overdue' = 'due_today'): void => {
  const now = new Date();
  let reminderTime: Date;
  let title: string;
  let message: string;

  if (reminderType === 'due_today') {
    // Schedule for 9 AM on the due date
    reminderTime = new Date(task.dueDate);
    reminderTime.setHours(9, 0, 0, 0);
    
    title = `Task Due Today: ${task.title}`;
    message = `Don't forget to complete your ${task.priority} priority task`;
  } else {
    // Schedule overdue reminder for 1 hour after due date
    reminderTime = new Date(task.dueDate.getTime() + 60 * 60 * 1000);
    
    title = `Overdue Task: ${task.title}`;
    message = `This ${task.priority} priority task is now overdue`;
  }

  // Don't schedule notifications for past times or completed tasks
  if (reminderTime <= now || task.isCompleted) {
    return;
  }

  const notificationId = `task_${task.id}_${reminderType}`;
  
  // Cancel existing notification
  cancelNotification(notificationId);

  const notificationData: NotificationData = {
    id: notificationId,
    type: 'task_reminder',
    itemId: task.id,
    title,
    message,
    data: {
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      dueDate: task.dueDate.toISOString(),
      category: task.category,
      reminderType,
    },
  };

  PushNotification.localNotificationSchedule({
    id: notificationId,
    title: notificationData.title,
    message: notificationData.message,
    date: reminderTime,
    soundName: 'default',
    playSound: true,
    vibrate: true,
    vibration: 300,
    importance: task.priority === 'high' ? 'max' : 'high',
    priority: task.priority === 'high' ? 'max' : 'high',
    userInfo: notificationData,
    actions: ['View Task', 'Mark Complete', 'Dismiss'],
    category: 'TASK_REMINDER',
  });

  console.log(`Scheduled task reminder for ${task.title} at ${reminderTime}`);
};

/**
 * Schedule high-priority task morning reminder
 */
export const scheduleHighPriorityTaskReminder = (tasks: Task[]): void => {
  const highPriorityTasks = tasks.filter(
    task => task.priority === 'high' && !task.isCompleted
  );

  if (highPriorityTasks.length === 0) {
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0); // 8 AM reminder

  const notificationId = 'high_priority_morning';
  
  // Cancel existing notification
  cancelNotification(notificationId);

  const taskTitles = highPriorityTasks.slice(0, 3).map(task => task.title).join(', ');
  const remainingCount = Math.max(0, highPriorityTasks.length - 3);
  
  let message = `You have ${highPriorityTasks.length} high-priority task${highPriorityTasks.length > 1 ? 's' : ''}: ${taskTitles}`;
  if (remainingCount > 0) {
    message += ` and ${remainingCount} more`;
  }

  const notificationData: NotificationData = {
    id: notificationId,
    type: 'task_reminder',
    itemId: 'high_priority_batch',
    title: 'High Priority Tasks',
    message,
    data: {
      taskIds: highPriorityTasks.map(task => task.id),
      count: highPriorityTasks.length,
    },
  };

  PushNotification.localNotificationSchedule({
    id: notificationId,
    title: notificationData.title,
    message: notificationData.message,
    date: tomorrow,
    soundName: 'default',
    playSound: true,
    vibrate: true,
    vibration: 300,
    importance: 'high',
    priority: 'high',
    userInfo: notificationData,
    actions: ['View Tasks', 'Dismiss'],
    category: 'HIGH_PRIORITY_TASKS',
  });

  console.log(`Scheduled high-priority tasks reminder for ${tomorrow}`);
};

/**
 * Schedule medication reminder (enhanced from existing)
 */
export const scheduleMedicationReminder = (
  medicineName: string,
  time: string,
  medicationId: string
): void => {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const notificationId = `medication_${medicationId}_${time}`;
  
  // Cancel existing notification
  cancelNotification(notificationId);

  const notificationData: NotificationData = {
    id: notificationId,
    type: 'medication_reminder',
    itemId: medicationId,
    title: `Time for ${medicineName}`,
    message: `Don't forget to take your medication`,
    data: {
      medicationId,
      medicineName,
      time,
    },
  };

  PushNotification.localNotificationSchedule({
    id: notificationId,
    title: notificationData.title,
    message: notificationData.message,
    date: reminderTime,
    soundName: 'default',
    playSound: true,
    vibrate: true,
    vibration: 300,
    importance: 'max',
    priority: 'max',
    repeatType: 'day', // Repeat daily
    userInfo: notificationData,
    actions: ['Mark Taken', 'Snooze', 'Dismiss'],
    category: 'MEDICATION_REMINDER',
  });

  console.log(`Scheduled medication reminder for ${medicineName} at ${time}`);
};

/**
 * Cancel a specific notification
 */
export const cancelNotification = (notificationId: string): void => {
  PushNotification.cancelLocalNotifications({ id: notificationId });
  console.log(`Cancelled notification: ${notificationId}`);
};

/**
 * Cancel all notifications for a specific item
 */
export const cancelNotificationsForItem = (itemId: string, type: NotificationType): void => {
  // Get all scheduled notifications and cancel matching ones
  PushNotification.getScheduledLocalNotifications((notifications) => {
    notifications.forEach((notification) => {
      const userData = notification.userInfo as NotificationData;
      if (userData && userData.type === type && userData.itemId === itemId) {
        cancelNotification(userData.id);
      }
    });
  });
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = (): void => {
  PushNotification.cancelAllLocalNotifications();
  console.log('Cancelled all notifications');
};

/**
 * Handle notification tap
 */
export const handleNotificationTap = (notification: any): void => {
  const notificationData = notification.userInfo as NotificationData;
  
  if (!notificationData) {
    return;
  }

  console.log('Handling notification tap:', notificationData);

  // Import navigation service dynamically to avoid circular dependencies
  import('../services/NavigationService').then(({ navigationService }) => {
    navigationService.handleNotificationTap({
      type: notificationData.type,
      itemId: notificationData.itemId,
      ...notificationData.data,
    });
  }).catch(error => {
    console.error('Error importing navigation service:', error);
  });
};

/**
 * Handle notification actions
 */
export const handleNotificationAction = (action: string, notificationData: NotificationData): void => {
  console.log('Handling notification action:', action, notificationData);

  switch (action) {
    case 'View Event':
    case 'View Task':
    case 'View Tasks':
      handleNotificationTap({ userInfo: notificationData });
      break;
      
    case 'Mark Complete':
      // This would call the task completion function
      console.log('Mark task complete:', notificationData.itemId);
      break;
      
    case 'Mark Taken':
      // This would call the medication taken function
      console.log('Mark medication taken:', notificationData.itemId);
      break;
      
    case 'Snooze':
      // Reschedule notification for 10 minutes later
      const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
      PushNotification.localNotificationSchedule({
        id: `${notificationData.id}_snooze`,
        title: notificationData.title,
        message: `${notificationData.message} (Snoozed)`,
        date: snoozeTime,
        soundName: 'default',
        userInfo: notificationData,
      });
      break;
      
    case 'Dismiss':
    default:
      // Do nothing, notification is dismissed
      break;
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = (): Promise<any[]> => {
  return new Promise((resolve) => {
    PushNotification.getScheduledLocalNotifications((notifications) => {
      resolve(notifications);
    });
  });
};

/**
 * Reschedule all notifications for updated items
 */
export const rescheduleNotificationsForEvents = (
  events: TimetableEvent[],
  reminderOffsetMinutes: number = 15
): void => {
  // Cancel all existing timetable notifications
  events.forEach(event => {
    cancelNotificationsForItem(event.id, 'timetable_event');
  });

  // Schedule new notifications
  events.forEach(event => {
    scheduleTimetableEventReminder(event, reminderOffsetMinutes);
  });
};

/**
 * Reschedule all notifications for updated tasks
 */
export const rescheduleNotificationsForTasks = (tasks: Task[]): void => {
  // Cancel all existing task notifications
  tasks.forEach(task => {
    cancelNotificationsForItem(task.id, 'task_reminder');
  });

  // Schedule new notifications for incomplete tasks
  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  
  incompleteTasks.forEach(task => {
    // Schedule due today reminder
    const today = new Date();
    const taskDueDate = new Date(task.dueDate);
    
    if (
      taskDueDate.getFullYear() === today.getFullYear() &&
      taskDueDate.getMonth() === today.getMonth() &&
      taskDueDate.getDate() === today.getDate()
    ) {
      scheduleTaskReminder(task, 'due_today');
    }
    
    // Schedule overdue reminder if task is high priority
    if (task.priority === 'high' && taskDueDate < today) {
      scheduleTaskReminder(task, 'overdue');
    }
  });

  // Schedule high-priority morning reminder
  scheduleHighPriorityTaskReminder(incompleteTasks);
};