import {
  calculateTaskUrgency,
  groupTasksByDate,
  groupTasksByCategory,
  groupTasksByPriority,
  searchTasks,
  getTasksDueWithin,
  getRecentlyCompletedTasks,
  calculateCompletionRate,
  suggestTaskTimeSlots,
  prioritizeTasks,
  getCategoryStats,
  estimateTotalTime,
  isTaskDueSoon,
  getNextTask,
  canCompleteTaskInTime,
} from '../taskUtils';
import { Task } from '../../types';

// Mock helpers
jest.mock('../helpers', () => ({
  isPastDate: jest.fn((date: Date) => date < new Date('2024-01-01')),
  formatDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

describe('Task Utils', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'High Priority Task',
      description: 'Important work task',
      priority: 'high',
      dueDate: new Date('2024-01-02'),
      isCompleted: false,
      category: 'work',
      estimatedDuration: 120,
    },
    {
      id: '2',
      title: 'Medium Priority Task',
      priority: 'medium',
      dueDate: new Date('2024-01-05'),
      isCompleted: true,
      category: 'personal',
      completedAt: new Date('2024-01-04'),
      estimatedDuration: 60,
    },
    {
      id: '3',
      title: 'Low Priority Task',
      priority: 'low',
      dueDate: new Date('2024-01-10'),
      isCompleted: false,
      category: 'work',
      estimatedDuration: 30,
    },
    {
      id: '4',
      title: 'Overdue Task',
      priority: 'high',
      dueDate: new Date('2023-12-25'),
      isCompleted: false,
      category: 'personal',
      estimatedDuration: 90,
    },
  ];

  describe('calculateTaskUrgency', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-01
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate higher urgency for high priority tasks', () => {
      const highPriorityTask = mockTasks[0];
      const lowPriorityTask = mockTasks[2];
      
      const highUrgency = calculateTaskUrgency(highPriorityTask);
      const lowUrgency = calculateTaskUrgency(lowPriorityTask);
      
      expect(highUrgency).toBeGreaterThan(lowUrgency);
    });

    it('should calculate maximum urgency for overdue tasks', () => {
      const overdueTask = mockTasks[3];
      const regularTask = mockTasks[0];
      
      const overdueUrgency = calculateTaskUrgency(overdueTask);
      const regularUrgency = calculateTaskUrgency(regularTask);
      
      expect(overdueUrgency).toBeGreaterThan(regularUrgency);
    });

    it('should handle tasks due today with high urgency', () => {
      const todayTask = {
        ...mockTasks[0],
        dueDate: new Date('2024-01-01'),
      };
      
      const urgency = calculateTaskUrgency(todayTask);
      
      expect(urgency).toBeGreaterThan(50); // Should have high urgency
    });
  });

  describe('groupTasksByDate', () => {
    it('should group tasks by due date', () => {
      const grouped = groupTasksByDate(mockTasks);
      
      expect(grouped['2024-01-02']).toHaveLength(1);
      expect(grouped['2024-01-05']).toHaveLength(1);
      expect(grouped['2024-01-10']).toHaveLength(1);
      expect(grouped['2023-12-25']).toHaveLength(1);
    });

    it('should handle empty task list', () => {
      const grouped = groupTasksByDate([]);
      
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('groupTasksByCategory', () => {
    it('should group tasks by category', () => {
      const grouped = groupTasksByCategory(mockTasks);
      
      expect(grouped['work']).toHaveLength(2);
      expect(grouped['personal']).toHaveLength(2);
    });

    it('should create groups for all categories', () => {
      const grouped = groupTasksByCategory(mockTasks);
      
      expect(Object.keys(grouped)).toContain('work');
      expect(Object.keys(grouped)).toContain('personal');
    });
  });

  describe('groupTasksByPriority', () => {
    it('should group tasks by priority', () => {
      const grouped = groupTasksByPriority(mockTasks);
      
      expect(grouped['high']).toHaveLength(2);
      expect(grouped['medium']).toHaveLength(1);
      expect(grouped['low']).toHaveLength(1);
    });

    it('should always include all priority levels', () => {
      const grouped = groupTasksByPriority([]);
      
      expect(grouped).toHaveProperty('high');
      expect(grouped).toHaveProperty('medium');
      expect(grouped).toHaveProperty('low');
      expect(grouped['high']).toEqual([]);
    });
  });

  describe('searchTasks', () => {
    it('should search by title', () => {
      const results = searchTasks(mockTasks, 'High Priority');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('High Priority Task');
    });

    it('should search by description', () => {
      const results = searchTasks(mockTasks, 'Important work');
      
      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Important work');
    });

    it('should search by category', () => {
      const results = searchTasks(mockTasks, 'work');
      
      expect(results).toHaveLength(2);
      expect(results.every(task => task.category === 'work')).toBe(true);
    });

    it('should be case insensitive', () => {
      const results = searchTasks(mockTasks, 'HIGH PRIORITY');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('High Priority Task');
    });

    it('should return all tasks for empty query', () => {
      const results = searchTasks(mockTasks, '');
      
      expect(results).toHaveLength(mockTasks.length);
    });
  });

  describe('getTasksDueWithin', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should get tasks due within specified days', () => {
      const results = getTasksDueWithin(mockTasks, 5);
      
      // Should include tasks due on 2024-01-02 and 2024-01-05
      expect(results).toHaveLength(1); // Only incomplete tasks
      expect(results[0].id).toBe('1');
    });

    it('should exclude completed tasks', () => {
      const results = getTasksDueWithin(mockTasks, 10);
      
      // Should not include the completed task
      expect(results.every(task => !task.isCompleted)).toBe(true);
    });
  });

  describe('getRecentlyCompletedTasks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-05'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should get recently completed tasks', () => {
      const results = getRecentlyCompletedTasks(mockTasks, 2);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
      expect(results[0].isCompleted).toBe(true);
    });

    it('should exclude tasks without completion date', () => {
      const tasksWithoutCompletionDate = [
        {
          ...mockTasks[1],
          completedAt: undefined,
        },
      ];
      
      const results = getRecentlyCompletedTasks(tasksWithoutCompletionDate, 5);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('calculateCompletionRate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-10'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate completion rate correctly', () => {
      const rate = calculateCompletionRate(mockTasks, 30);
      
      // 1 completed out of 4 tasks = 25%
      expect(rate).toBe(25);
    });

    it('should return 0 for empty task list', () => {
      const rate = calculateCompletionRate([], 30);
      
      expect(rate).toBe(0);
    });
  });

  describe('suggestTaskTimeSlots', () => {
    const availableSlots = [
      {
        start: new Date('2024-01-01T09:00:00'),
        end: new Date('2024-01-01T10:00:00'),
      },
      {
        start: new Date('2024-01-01T14:00:00'),
        end: new Date('2024-01-01T16:00:00'),
      },
    ];

    it('should suggest slots that fit task duration', () => {
      const task = { ...mockTasks[0], estimatedDuration: 60 }; // 1 hour
      
      const suggestions = suggestTaskTimeSlots(task, availableSlots);
      
      expect(suggestions).toHaveLength(2); // Both slots fit
    });

    it('should filter out slots too small for task', () => {
      const task = { ...mockTasks[0], estimatedDuration: 90 }; // 1.5 hours
      
      const suggestions = suggestTaskTimeSlots(task, availableSlots);
      
      expect(suggestions).toHaveLength(1); // Only the 2-hour slot fits
      expect(suggestions[0].start.getHours()).toBe(14);
    });

    it('should return all slots for tasks without duration', () => {
      const task = { ...mockTasks[0], estimatedDuration: undefined };
      
      const suggestions = suggestTaskTimeSlots(task, availableSlots);
      
      expect(suggestions).toHaveLength(2);
    });
  });

  describe('prioritizeTasks', () => {
    it('should put incomplete tasks before completed ones', () => {
      const prioritized = prioritizeTasks(mockTasks);
      
      const firstCompletedIndex = prioritized.findIndex(task => task.isCompleted);
      const lastIncompleteIndex = prioritized.map(task => task.isCompleted).lastIndexOf(false);
      
      expect(lastIncompleteIndex).toBeLessThan(firstCompletedIndex);
    });

    it('should sort incomplete tasks by urgency', () => {
      const incompleteTasks = mockTasks.filter(task => !task.isCompleted);
      const prioritized = prioritizeTasks(incompleteTasks);
      
      // Should prioritize overdue high priority task first
      expect(prioritized[0].id).toBe('4'); // Overdue task
    });
  });

  describe('getCategoryStats', () => {
    it('should calculate category statistics correctly', () => {
      const stats = getCategoryStats(mockTasks, 'work');
      
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(2);
      expect(stats.completionRate).toBe(0);
    });

    it('should handle categories with completed tasks', () => {
      const stats = getCategoryStats(mockTasks, 'personal');
      
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.completionRate).toBe(50);
    });
  });

  describe('estimateTotalTime', () => {
    it('should calculate total estimated time', () => {
      const totalTime = estimateTotalTime(mockTasks);
      
      // 120 + 60 + 30 + 90 = 300 minutes
      expect(totalTime).toBe(300);
    });

    it('should handle tasks without estimated duration', () => {
      const tasksWithoutDuration = [
        { ...mockTasks[0], estimatedDuration: undefined },
      ];
      
      const totalTime = estimateTotalTime(tasksWithoutDuration);
      
      expect(totalTime).toBe(0);
    });
  });

  describe('isTaskDueSoon', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should identify tasks due within threshold', () => {
      const soonTask = {
        ...mockTasks[0],
        dueDate: new Date('2024-01-01T18:00:00'), // 6 hours away
      };
      
      const isDueSoon = isTaskDueSoon(soonTask, 24);
      
      expect(isDueSoon).toBe(true);
    });

    it('should not identify completed tasks as due soon', () => {
      const completedTask = {
        ...mockTasks[1],
        dueDate: new Date('2024-01-01T18:00:00'),
      };
      
      const isDueSoon = isTaskDueSoon(completedTask, 24);
      
      expect(isDueSoon).toBe(false);
    });
  });

  describe('getNextTask', () => {
    it('should return the highest priority incomplete task', () => {
      const nextTask = getNextTask(mockTasks);
      
      expect(nextTask).not.toBeNull();
      expect(nextTask!.isCompleted).toBe(false);
      // Should be the overdue high priority task
      expect(nextTask!.id).toBe('4');
    });

    it('should return null for empty task list', () => {
      const nextTask = getNextTask([]);
      
      expect(nextTask).toBeNull();
    });

    it('should return null when all tasks are completed', () => {
      const completedTasks = mockTasks.map(task => ({ ...task, isCompleted: true }));
      const nextTask = getNextTask(completedTasks);
      
      expect(nextTask).toBeNull();
    });
  });

  describe('canCompleteTaskInTime', () => {
    it('should return true when task fits in available time', () => {
      const task = { ...mockTasks[0], estimatedDuration: 60 };
      
      const canComplete = canCompleteTaskInTime(task, 120);
      
      expect(canComplete).toBe(true);
    });

    it('should return false when task exceeds available time', () => {
      const task = { ...mockTasks[0], estimatedDuration: 120 };
      
      const canComplete = canCompleteTaskInTime(task, 60);
      
      expect(canComplete).toBe(false);
    });

    it('should return true for tasks without estimated duration', () => {
      const task = { ...mockTasks[0], estimatedDuration: undefined };
      
      const canComplete = canCompleteTaskInTime(task, 30);
      
      expect(canComplete).toBe(true);
    });
  });
});