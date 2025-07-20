import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { TasksProvider, useTasks } from '../TasksContext';
import { Task } from '../../types';
import * as storage from '../../utils/storage';
import * as validation from '../../utils/validation';

// Mock dependencies
jest.mock('../../utils/storage');
jest.mock('../../utils/validation');
jest.mock('../../utils/helpers', () => ({
  ...jest.requireActual('../../utils/helpers'),
  generateId: jest.fn(() => 'mock-id'),
  isPastDate: jest.fn((date: Date) => date < new Date('2024-01-01')),
  formatDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockValidation = validation as jest.Mocked<typeof validation>;

describe('TasksContext', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    priority: 'high',
    dueDate: new Date('2024-01-15'),
    isCompleted: false,
    category: 'work',
    estimatedDuration: 60,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TasksProvider>{children}</TasksProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.loadTasks.mockResolvedValue([]);
    mockValidation.validateTask.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      expect(result.current.state.tasks).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.filter).toBe('all');
      expect(result.current.state.sortBy).toBe('dueDate');
    });

    it('should load tasks on mount', async () => {
      mockStorage.loadTasks.mockResolvedValue([mockTask]);

      const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

      await waitForNextUpdate();

      expect(mockStorage.loadTasks).toHaveBeenCalled();
      expect(result.current.state.tasks).toEqual([mockTask]);
    });
  });

  describe('Task Management', () => {
    describe('addTask', () => {
      it('should add valid task successfully', async () => {
        mockStorage.addTask.mockResolvedValue();
        const { result } = renderHook(() => useTasks(), { wrapper });

        const taskData = {
          title: 'New Task',
          priority: 'medium' as const,
          dueDate: new Date('2024-01-20'),
          isCompleted: false,
          category: 'personal',
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addTask(taskData);
        });

        expect(addResult.isValid).toBe(true);
        expect(mockStorage.addTask).toHaveBeenCalled();
        expect(result.current.state.tasks).toHaveLength(1);
      });

      it('should reject invalid task', async () => {
        mockValidation.validateTask.mockReturnValue({
          isValid: false,
          errors: ['Title is required'],
        });

        const { result } = renderHook(() => useTasks(), { wrapper });

        const taskData = {
          title: '',
          priority: 'medium' as const,
          dueDate: new Date('2024-01-20'),
          isCompleted: false,
          category: 'personal',
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addTask(taskData);
        });

        expect(addResult.isValid).toBe(false);
        expect(addResult.errors).toContain('Title is required');
        expect(mockStorage.addTask).not.toHaveBeenCalled();
      });
    });

    describe('updateTask', () => {
      it('should update valid task successfully', async () => {
        mockStorage.updateTask.mockResolvedValue();
        const { result } = renderHook(() => useTasks(), { wrapper });

        const updatedTask = { ...mockTask, title: 'Updated Task' };

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateTask(updatedTask);
        });

        expect(updateResult.isValid).toBe(true);
        expect(mockStorage.updateTask).toHaveBeenCalledWith(updatedTask);
      });

      it('should handle validation errors', async () => {
        mockValidation.validateTask.mockReturnValue({
          isValid: false,
          errors: ['Invalid task data'],
        });

        const { result } = renderHook(() => useTasks(), { wrapper });

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateTask(mockTask);
        });

        expect(updateResult.isValid).toBe(false);
        expect(updateResult.errors).toContain('Invalid task data');
      });
    });

    describe('deleteTask', () => {
      it('should delete task successfully', async () => {
        mockStorage.deleteTask.mockResolvedValue();
        const { result } = renderHook(() => useTasks(), { wrapper });

        await act(async () => {
          await result.current.deleteTask('1');
        });

        expect(mockStorage.deleteTask).toHaveBeenCalledWith('1');
      });

      it('should handle delete errors', async () => {
        mockStorage.deleteTask.mockRejectedValue(new Error('Delete failed'));
        const { result } = renderHook(() => useTasks(), { wrapper });

        await act(async () => {
          await result.current.deleteTask('1');
        });

        expect(result.current.state.error).toBe('Failed to delete task');
      });
    });

    describe('toggleTaskCompletion', () => {
      it('should toggle task completion status', async () => {
        mockStorage.updateTask.mockResolvedValue();
        const { result } = renderHook(() => useTasks(), { wrapper });

        // Set initial state with a task
        act(() => {
          result.current.state.tasks.push(mockTask);
        });

        await act(async () => {
          await result.current.toggleTaskCompletion('1');
        });

        expect(mockStorage.updateTask).toHaveBeenCalled();
      });

      it('should handle toggle errors and revert state', async () => {
        mockStorage.updateTask.mockRejectedValue(new Error('Update failed'));
        const { result } = renderHook(() => useTasks(), { wrapper });

        // Set initial state with a task
        act(() => {
          result.current.state.tasks.push(mockTask);
        });

        await act(async () => {
          await result.current.toggleTaskCompletion('1');
        });

        expect(result.current.state.error).toBe('Failed to update task status');
      });
    });
  });

  describe('Filtering and Sorting', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'High Priority Task',
        priority: 'high',
        dueDate: new Date('2024-01-10'),
        isCompleted: false,
        category: 'work',
      },
      {
        id: '2',
        title: 'Completed Task',
        priority: 'medium',
        dueDate: new Date('2024-01-15'),
        isCompleted: true,
        category: 'personal',
        completedAt: new Date('2024-01-14'),
      },
      {
        id: '3',
        title: 'Overdue Task',
        priority: 'low',
        dueDate: new Date('2023-12-20'),
        isCompleted: false,
        category: 'work',
      },
    ];

    beforeEach(() => {
      mockStorage.loadTasks.mockResolvedValue(tasks);
    });

    describe('setFilter', () => {
      it('should set filter correctly', () => {
        const { result } = renderHook(() => useTasks(), { wrapper });

        act(() => {
          result.current.setFilter('completed');
        });

        expect(result.current.state.filter).toBe('completed');
      });
    });

    describe('setSortBy', () => {
      it('should set sort option correctly', () => {
        const { result } = renderHook(() => useTasks(), { wrapper });

        act(() => {
          result.current.setSortBy('priority');
        });

        expect(result.current.state.sortBy).toBe('priority');
      });
    });

    describe('getFilteredAndSortedTasks', () => {
      it('should filter pending tasks', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

        await waitForNextUpdate();

        act(() => {
          result.current.setFilter('pending');
        });

        const filteredTasks = result.current.getFilteredAndSortedTasks();
        expect(filteredTasks).toHaveLength(2);
        expect(filteredTasks.every(task => !task.isCompleted)).toBe(true);
      });

      it('should filter completed tasks', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

        await waitForNextUpdate();

        act(() => {
          result.current.setFilter('completed');
        });

        const filteredTasks = result.current.getFilteredAndSortedTasks();
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].isCompleted).toBe(true);
      });

      it('should filter by priority', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

        await waitForNextUpdate();

        act(() => {
          result.current.setFilter('high');
        });

        const filteredTasks = result.current.getFilteredAndSortedTasks();
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].priority).toBe('high');
      });

      it('should sort by priority', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

        await waitForNextUpdate();

        act(() => {
          result.current.setSortBy('priority');
        });

        const sortedTasks = result.current.getFilteredAndSortedTasks();
        expect(sortedTasks[0].priority).toBe('high');
        expect(sortedTasks[1].priority).toBe('medium');
        expect(sortedTasks[2].priority).toBe('low');
      });

      it('should sort alphabetically', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

        await waitForNextUpdate();

        act(() => {
          result.current.setSortBy('alphabetical');
        });

        const sortedTasks = result.current.getFilteredAndSortedTasks();
        expect(sortedTasks[0].title).toBe('Completed Task');
        expect(sortedTasks[1].title).toBe('High Priority Task');
        expect(sortedTasks[2].title).toBe('Overdue Task');
      });
    });
  });

  describe('Statistics', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        priority: 'high',
        dueDate: new Date('2024-01-01'),
        isCompleted: false,
        category: 'work',
      },
      {
        id: '2',
        title: 'Task 2',
        priority: 'medium',
        dueDate: new Date('2024-01-01'),
        isCompleted: true,
        category: 'personal',
        completedAt: new Date(),
      },
      {
        id: '3',
        title: 'Task 3',
        priority: 'high',
        dueDate: new Date('2023-12-20'),
        isCompleted: false,
        category: 'work',
      },
    ];

    beforeEach(() => {
      mockStorage.loadTasks.mockResolvedValue(tasks);
    });

    it('should calculate task statistics correctly', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

      await waitForNextUpdate();

      const stats = result.current.getTaskStats();

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.highPriority).toBe(2);
    });
  });

  describe('Utility Functions', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Work Task',
        priority: 'high',
        dueDate: new Date('2024-01-15'),
        isCompleted: false,
        category: 'work',
      },
      {
        id: '2',
        title: 'Personal Task',
        priority: 'medium',
        dueDate: new Date('2024-01-15'),
        isCompleted: false,
        category: 'personal',
      },
    ];

    beforeEach(() => {
      mockStorage.loadTasks.mockResolvedValue(tasks);
    });

    it('should get tasks by category', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

      await waitForNextUpdate();

      const workTasks = result.current.getTasksByCategory('work');
      expect(workTasks).toHaveLength(1);
      expect(workTasks[0].category).toBe('work');
    });

    it('should get tasks by priority', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

      await waitForNextUpdate();

      const highPriorityTasks = result.current.getTasksByPriority('high');
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].priority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors', async () => {
      mockStorage.loadTasks.mockRejectedValue(new Error('Load failed'));

      const { result, waitForNextUpdate } = renderHook(() => useTasks(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.state.error).toBe('Failed to load tasks');
      expect(result.current.state.loading).toBe(false);
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useTasks());

      expect(result.error).toEqual(
        Error('useTasks must be used within a TasksProvider')
      );
    });
  });
});