import { Task } from '../types';
import { isPastDate, formatDateString } from './helpers';

/**
 * Task utility functions for advanced operations
 */

/**
 * Calculates the urgency score of a task based on due date and priority
 */
export const calculateTaskUrgency = (task: Task): number => {
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Priority weights
  const priorityWeights = {
    high: 3,
    medium: 2,
    low: 1,
  };
  
  // Base urgency from priority
  let urgency = priorityWeights[task.priority] * 10;
  
  // Adjust based on due date
  if (daysUntilDue < 0) {
    // Overdue tasks get maximum urgency
    urgency += 50 + Math.abs(daysUntilDue) * 5;
  } else if (daysUntilDue === 0) {
    // Due today
    urgency += 30;
  } else if (daysUntilDue === 1) {
    // Due tomorrow
    urgency += 20;
  } else if (daysUntilDue <= 3) {
    // Due within 3 days
    urgency += 15;
  } else if (daysUntilDue <= 7) {
    // Due within a week
    urgency += 10;
  }
  
  return urgency;
};

/**
 * Groups tasks by their due date
 */
export const groupTasksByDate = (tasks: Task[]): Record<string, Task[]> => {
  const groups: Record<string, Task[]> = {};
  
  tasks.forEach(task => {
    const dateKey = formatDateString(task.dueDate);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(task);
  });
  
  return groups;
};

/**
 * Groups tasks by category
 */
export const groupTasksByCategory = (tasks: Task[]): Record<string, Task[]> => {
  const groups: Record<string, Task[]> = {};
  
  tasks.forEach(task => {
    if (!groups[task.category]) {
      groups[task.category] = [];
    }
    groups[task.category].push(task);
  });
  
  return groups;
};

/**
 * Groups tasks by priority
 */
export const groupTasksByPriority = (tasks: Task[]): Record<string, Task[]> => {
  const groups: Record<string, Task[]> = {
    high: [],
    medium: [],
    low: [],
  };
  
  tasks.forEach(task => {
    groups[task.priority].push(task);
  });
  
  return groups;
};

/**
 * Filters tasks based on search query
 */
export const searchTasks = (tasks: Task[], query: string): Task[] => {
  if (!query.trim()) {
    return tasks;
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm) ||
    (task.description && task.description.toLowerCase().includes(searchTerm)) ||
    task.category.toLowerCase().includes(searchTerm)
  );
};

/**
 * Gets tasks that are due within a specified number of days
 */
export const getTasksDueWithin = (tasks: Task[], days: number): Task[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return tasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    return dueDate >= now && dueDate <= futureDate && !task.isCompleted;
  });
};

/**
 * Gets tasks that were completed within a specified number of days
 */
export const getRecentlyCompletedTasks = (tasks: Task[], days: number): Task[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return tasks.filter(task => 
    task.isCompleted && 
    task.completedAt && 
    task.completedAt >= cutoffDate
  );
};

/**
 * Calculates completion rate for a given time period
 */
export const calculateCompletionRate = (tasks: Task[], days: number): number => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const relevantTasks = tasks.filter(task => {
    const taskDate = task.completedAt || task.dueDate;
    return taskDate >= cutoffDate;
  });
  
  if (relevantTasks.length === 0) {
    return 0;
  }
  
  const completedTasks = relevantTasks.filter(task => task.isCompleted).length;
  return (completedTasks / relevantTasks.length) * 100;
};

/**
 * Suggests optimal time slots for task completion based on estimated duration
 */
export const suggestTaskTimeSlots = (
  task: Task,
  availableSlots: { start: Date; end: Date }[]
): { start: Date; end: Date }[] => {
  if (!task.estimatedDuration) {
    return availableSlots;
  }
  
  const requiredMinutes = task.estimatedDuration;
  
  return availableSlots.filter(slot => {
    const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
    return slotDuration >= requiredMinutes;
  });
};

/**
 * Prioritizes tasks based on multiple factors
 */
export const prioritizeTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // First, sort by completion status (incomplete tasks first)
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    // For incomplete tasks, sort by urgency
    if (!a.isCompleted && !b.isCompleted) {
      const urgencyA = calculateTaskUrgency(a);
      const urgencyB = calculateTaskUrgency(b);
      return urgencyB - urgencyA;
    }
    
    // For completed tasks, sort by completion date (most recent first)
    if (a.isCompleted && b.isCompleted) {
      const completedAtA = a.completedAt?.getTime() || 0;
      const completedAtB = b.completedAt?.getTime() || 0;
      return completedAtB - completedAtA;
    }
    
    return 0;
  });
};

/**
 * Gets task statistics for a specific category
 */
export const getCategoryStats = (tasks: Task[], category: string) => {
  const categoryTasks = tasks.filter(task => task.category === category);
  const completed = categoryTasks.filter(task => task.isCompleted).length;
  const pending = categoryTasks.length - completed;
  const overdue = categoryTasks.filter(task => 
    !task.isCompleted && isPastDate(task.dueDate)
  ).length;
  
  return {
    total: categoryTasks.length,
    completed,
    pending,
    overdue,
    completionRate: categoryTasks.length > 0 ? (completed / categoryTasks.length) * 100 : 0,
  };
};

/**
 * Estimates total time required for a list of tasks
 */
export const estimateTotalTime = (tasks: Task[]): number => {
  return tasks.reduce((total, task) => {
    return total + (task.estimatedDuration || 0);
  }, 0);
};

/**
 * Checks if a task is due soon (within next 24 hours)
 */
export const isTaskDueSoon = (task: Task, hoursThreshold: number = 24): boolean => {
  if (task.isCompleted) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilDue > 0 && hoursUntilDue <= hoursThreshold;
};

/**
 * Gets the next task that should be worked on based on priority and due date
 */
export const getNextTask = (tasks: Task[]): Task | null => {
  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  
  if (incompleteTasks.length === 0) {
    return null;
  }
  
  const prioritizedTasks = prioritizeTasks(incompleteTasks);
  return prioritizedTasks[0];
};

/**
 * Validates if a task can be completed within available time
 */
export const canCompleteTaskInTime = (
  task: Task,
  availableMinutes: number
): boolean => {
  if (!task.estimatedDuration) {
    return true; // Assume it can be completed if no duration is specified
  }
  
  return task.estimatedDuration <= availableMinutes;
};