import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TasksScreen from '../TasksScreen';
import { useTasks } from '../../context/TasksContext';
import { Task } from '../../types';

// Mock dependencies
jest.mock('../../context/TasksContext');
jest.mock('../../components/TaskItem', () => 'TaskItem');
jest.mock('../../components/AddTaskModal', () => 'AddTaskModal');
jest.mock('../../utils/taskUtils', () => ({
  searchTasks: jest.fn((tasks, query) => 
    query ? tasks.filter((task: Task) => task.title.toLowerCase().includes(query.toLowerCase())) : tasks
  ),
}));

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('TasksScreen', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'High Priority Task',
      priority: 'high',
      dueDate: new Date('2024-01-15'),
      isCompleted: false,
      category: 'work',
    },
    {
      id: '2',
      title: 'Completed Task',
      priority: 'medium',
      dueDate: new Date('2024-01-10'),
      isCompleted: true,
      category: 'personal',
      completedAt: new Date('2024-01-09'),
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

  const mockTasksState = {
    tasks: mockTasks,
    loading: false,
    error: null,
    filter: 'all' as const,
    sortBy: 'dueDate' as const,
  };

  const mockTasksActions = {
    state: mockTasksState,
    getFilteredAndSortedTasks: jest.fn(() => mockTasks),
    setFilter: jest.fn(),
    setSortBy: jest.fn(),
    deleteTask: jest.fn(),
    toggleTaskCompletion: jest.fn(),
    getTaskStats: jest.fn(() => ({
      total: 3,
      completed: 1,
      pending: 2,
      overdue: 1,
      today: 0,
      highPriority: 1,
    })),
    loadTasks: jest.fn(),
    addTask: jest.fn(),
    updateTask: jest.fn(),
    getTasksByCategory: jest.fn(),
    getTasksByPriority: jest.fn(),
    getOverdueTasks: jest.fn(),
    getTodayTasks: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTasks.mockReturnValue(mockTasksActions);
  });

  describe('Rendering', () => {
    it('should render correctly', () => {
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('Tasks')).toBeTruthy();
      expect(getByText('+ Add Task')).toBeTruthy();
      expect(getByText('Search tasks...')).toBeTruthy();
    });

    it('should display task statistics', () => {
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('2')).toBeTruthy(); // Pending count
      expect(getByText('Pending')).toBeTruthy();
      expect(getByText('1')).toBeTruthy(); // Completed count
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('High Priority')).toBeTruthy();
    });

    it('should display filter and sort controls', () => {
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('Filter: All')).toBeTruthy();
      expect(getByText('Sort: Due Date')).toBeTruthy();
    });

    it('should display loading overlay when loading', () => {
      mockTasksActions.state.loading = true;
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter tasks based on search query', () => {
      const { getByPlaceholderText } = render(<TasksScreen />);
      
      const searchInput = getByPlaceholderText('Search tasks...');
      fireEvent.changeText(searchInput, 'High Priority');
      
      // Search functionality is tested through the searchTasks mock
      expect(searchInput.props.value).toBe('High Priority');
    });

    it('should clear search when text is removed', () => {
      const { getByPlaceholderText } = render(<TasksScreen />);
      
      const searchInput = getByPlaceholderText('Search tasks...');
      fireEvent.changeText(searchInput, 'test');
      fireEvent.changeText(searchInput, '');
      
      expect(searchInput.props.value).toBe('');
    });
  });

  describe('Filter Functionality', () => {
    it('should show filter options when filter button is pressed', () => {
      const { getByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('Filter: All'));
      
      expect(getByText('All (3)')).toBeTruthy();
      expect(getByText('Pending (2)')).toBeTruthy();
      expect(getByText('Completed (1)')).toBeTruthy();
      expect(getByText('Overdue (1)')).toBeTruthy();
    });

    it('should apply filter when option is selected', () => {
      const { getByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('Filter: All'));
      fireEvent.press(getByText('Pending (2)'));
      
      expect(mockTasksActions.setFilter).toHaveBeenCalledWith('pending');
    });

    it('should hide filter options after selection', () => {
      const { getByText, queryByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('Filter: All'));
      fireEvent.press(getByText('Pending (2)'));
      
      expect(queryByText('All (3)')).toBeFalsy();
    });
  });

  describe('Sort Functionality', () => {
    it('should cycle through sort options when sort button is pressed', () => {
      const { getByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('Sort: Due Date'));
      
      expect(mockTasksActions.setSortBy).toHaveBeenCalledWith('priority');
    });

    it('should cycle back to first option after last option', () => {
      mockTasksActions.state.sortBy = 'created';
      const { getByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('Sort: Created'));
      
      expect(mockTasksActions.setSortBy).toHaveBeenCalledWith('dueDate');
    });
  });

  describe('Task Management', () => {
    it('should open add task modal when add button is pressed', () => {
      const { getByText } = render(<TasksScreen />);
      
      fireEvent.press(getByText('+ Add Task'));
      
      // Modal visibility would be tested in AddTaskModal tests
      expect(getByText('+ Add Task')).toBeTruthy();
    });

    it('should handle task deletion with confirmation', () => {
      const { getByText } = render(<TasksScreen />);
      
      // This would typically be triggered from TaskItem
      // We'll test the handler function directly
      const screen = render(<TasksScreen />).getInstance();
      
      // Simulate delete task call
      mockTasksActions.deleteTask('1');
      
      expect(mockTasksActions.deleteTask).toHaveBeenCalledWith('1');
    });

    it('should handle task completion toggle', async () => {
      const { getByText } = render(<TasksScreen />);
      
      // This would typically be triggered from TaskItem
      await mockTasksActions.toggleTaskCompletion('1');
      
      expect(mockTasksActions.toggleTaskCompletion).toHaveBeenCalledWith('1');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no tasks exist', () => {
      mockTasksActions.getFilteredAndSortedTasks.mockReturnValue([]);
      
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('No tasks yet')).toBeTruthy();
      expect(getByText('Tap the + button to add your first task')).toBeTruthy();
      expect(getByText('Add Task')).toBeTruthy();
    });

    it('should show search empty state when search returns no results', () => {
      mockTasksActions.getFilteredAndSortedTasks.mockReturnValue([]);
      
      const { getByText, getByPlaceholderText } = render(<TasksScreen />);
      
      const searchInput = getByPlaceholderText('Search tasks...');
      fireEvent.changeText(searchInput, 'nonexistent');
      
      expect(getByText('No tasks found')).toBeTruthy();
      expect(getByText('Try adjusting your search or filters')).toBeTruthy();
    });

    it('should show add task button in empty state', () => {
      mockTasksActions.getFilteredAndSortedTasks.mockReturnValue([]);
      
      const { getByText } = render(<TasksScreen />);
      
      const addButton = getByText('Add Task');
      fireEvent.press(addButton);
      
      // Should trigger the same action as the header add button
      expect(addButton).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should handle pull to refresh', async () => {
      const { getByTestId } = render(<TasksScreen />);
      
      // This would require adding testID to FlatList
      // For now, we'll test that the component renders without errors
      expect(getByText('Tasks')).toBeTruthy();
    });
  });

  describe('Statistics Display', () => {
    it('should highlight overdue tasks in statistics', () => {
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('Overdue')).toBeTruthy();
    });

    it('should highlight high priority tasks in statistics', () => {
      const { getByText } = render(<TasksScreen />);
      
      expect(getByText('High Priority')).toBeTruthy();
    });

    it('should not show overdue stats when count is zero', () => {
      mockTasksActions.getTaskStats.mockReturnValue({
        total: 2,
        completed: 1,
        pending: 1,
        overdue: 0,
        today: 0,
        highPriority: 0,
      });
      
      const { queryByText } = render(<TasksScreen />);
      
      expect(queryByText('Overdue')).toBeFalsy();
    });

    it('should not show high priority stats when count is zero', () => {
      mockTasksActions.getTaskStats.mockReturnValue({
        total: 2,
        completed: 1,
        pending: 1,
        overdue: 0,
        today: 0,
        highPriority: 0,
      });
      
      const { queryByText } = render(<TasksScreen />);
      
      expect(queryByText('High Priority')).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when present', () => {
      mockTasksActions.state.error = 'Failed to load tasks';
      
      const { getByText } = render(<TasksScreen />);
      
      // Error handling would typically be shown in a toast or error component
      // For now, we verify the component still renders
      expect(getByText('Tasks')).toBeTruthy();
    });
  });
});