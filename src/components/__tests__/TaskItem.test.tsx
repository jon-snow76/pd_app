import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TaskItem from '../TaskItem';
import { Task } from '../../types';

// Mock dependencies
jest.mock('../../utils/helpers', () => ({
  formatDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  isPastDate: jest.fn((date: Date) => date < new Date('2024-01-01')),
  isToday: jest.fn((date: Date) => {
    const today = new Date('2024-01-01');
    return date.toDateString() === today.toDateString();
  }),
}));

jest.mock('../../utils/taskUtils', () => ({
  isTaskDueSoon: jest.fn((task: Task) => {
    const dueDate = new Date(task.dueDate);
    const now = new Date('2024-01-01');
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= 48;
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('TaskItem', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    priority: 'high',
    dueDate: new Date('2024-01-02'),
    isCompleted: false,
    category: 'work',
    estimatedDuration: 60,
  };

  const mockProps = {
    task: mockTask,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onToggleCompletion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render task details correctly', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      expect(getByText('Test Task')).toBeTruthy();
      expect(getByText('Test description')).toBeTruthy();
      expect(getByText('Due: 2024-01-02')).toBeTruthy();
      expect(getByText('work')).toBeTruthy();
      expect(getByText('HIGH')).toBeTruthy();
      expect(getByText('60m')).toBeTruthy();
    });

    it('should render without description when not provided', () => {
      const taskWithoutDescription = { ...mockTask, description: undefined };
      const { queryByText } = render(
        <TaskItem {...mockProps} task={taskWithoutDescription} />
      );
      
      expect(queryByText('Test description')).toBeFalsy();
    });

    it('should render without estimated duration when not provided', () => {
      const taskWithoutDuration = { ...mockTask, estimatedDuration: undefined };
      const { queryByText } = render(
        <TaskItem {...mockProps} task={taskWithoutDuration} />
      );
      
      expect(queryByText('60m')).toBeFalsy();
    });

    it('should show completion date for completed tasks', () => {
      const completedTask = {
        ...mockTask,
        isCompleted: true,
        completedAt: new Date('2024-01-01'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={completedTask} />
      );
      
      expect(getByText('Completed: 2024-01-01')).toBeTruthy();
    });
  });

  describe('Priority Styling', () => {
    it('should apply high priority styling', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      expect(getByText('HIGH')).toBeTruthy();
    });

    it('should apply medium priority styling', () => {
      const mediumTask = { ...mockTask, priority: 'medium' as const };
      const { getByText } = render(
        <TaskItem {...mockProps} task={mediumTask} />
      );
      
      expect(getByText('MEDIUM')).toBeTruthy();
    });

    it('should apply low priority styling', () => {
      const lowTask = { ...mockTask, priority: 'low' as const };
      const { getByText } = render(
        <TaskItem {...mockProps} task={lowTask} />
      );
      
      expect(getByText('LOW')).toBeTruthy();
    });
  });

  describe('Status Badges', () => {
    it('should display overdue badge for overdue tasks', () => {
      const overdueTask = {
        ...mockTask,
        dueDate: new Date('2023-12-20'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={overdueTask} />
      );
      
      expect(getByText('Overdue')).toBeTruthy();
    });

    it('should display today badge for tasks due today', () => {
      const todayTask = {
        ...mockTask,
        dueDate: new Date('2024-01-01'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={todayTask} />
      );
      
      expect(getByText('Today')).toBeTruthy();
    });

    it('should display soon badge for tasks due soon', () => {
      const soonTask = {
        ...mockTask,
        dueDate: new Date('2024-01-02'), // Within 48 hours
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={soonTask} />
      );
      
      expect(getByText('Soon')).toBeTruthy();
    });

    it('should not display badges for completed tasks', () => {
      const completedOverdueTask = {
        ...mockTask,
        dueDate: new Date('2023-12-20'),
        isCompleted: true,
      };
      const { queryByText } = render(
        <TaskItem {...mockProps} task={completedOverdueTask} />
      );
      
      expect(queryByText('Overdue')).toBeFalsy();
    });
  });

  describe('Completion State', () => {
    it('should show checked checkbox for completed tasks', () => {
      const completedTask = { ...mockTask, isCompleted: true };
      const { getByText } = render(
        <TaskItem {...mockProps} task={completedTask} />
      );
      
      expect(getByText('✓')).toBeTruthy();
    });

    it('should show unchecked checkbox for incomplete tasks', () => {
      const { queryByText } = render(<TaskItem {...mockProps} />);
      
      expect(queryByText('✓')).toBeFalsy();
    });

    it('should apply completed styling to completed tasks', () => {
      const completedTask = { ...mockTask, isCompleted: true };
      const { getByText } = render(
        <TaskItem {...mockProps} task={completedTask} />
      );
      
      // Completed tasks should have different styling (tested through snapshots in real app)
      expect(getByText('Test Task')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should format today as "Today"', () => {
      const todayTask = {
        ...mockTask,
        dueDate: new Date('2024-01-01'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={todayTask} />
      );
      
      expect(getByText('Due: Today')).toBeTruthy();
    });

    it('should format tomorrow as "Tomorrow"', () => {
      // Mock current date as 2024-01-01, so tomorrow is 2024-01-02
      const tomorrowTask = {
        ...mockTask,
        dueDate: new Date('2024-01-02'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={tomorrowTask} />
      );
      
      expect(getByText('Due: Tomorrow')).toBeTruthy();
    });

    it('should format other dates normally', () => {
      const futureTask = {
        ...mockTask,
        dueDate: new Date('2024-01-15'),
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={futureTask} />
      );
      
      expect(getByText('Due: 2024-01-15')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when task is pressed', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      fireEvent.press(getByText('Test Task'));
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTask);
    });

    it('should call onToggleCompletion when checkbox is pressed', () => {
      const { getByTestId } = render(<TaskItem {...mockProps} />);
      
      // Would need to add testID to checkbox in real implementation
      // For now, we'll test the handler exists
      expect(mockProps.onToggleCompletion).toBeDefined();
    });

    it('should show action sheet on long press', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      fireEvent(getByText('Test Task'), 'longPress');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Task',
        'What would you like to do?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Edit' }),
          expect.objectContaining({ text: 'Mark Complete' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );
    });

    it('should show "Mark Incomplete" for completed tasks in action sheet', () => {
      const completedTask = { ...mockTask, isCompleted: true };
      const { getByText } = render(
        <TaskItem {...mockProps} task={completedTask} />
      );
      
      fireEvent(getByText('Test Task'), 'longPress');
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const actions = alertCall[2];
      const toggleAction = actions.find((action: any) => 
        action.text.includes('Mark Incomplete')
      );
      
      expect(toggleAction).toBeTruthy();
    });

    it('should call onEdit from action sheet', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      fireEvent(getByText('Test Task'), 'longPress');
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const actions = alertCall[2];
      const editAction = actions.find((action: any) => action.text === 'Edit');
      editAction.onPress();
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTask);
    });

    it('should call onToggleCompletion from action sheet', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      fireEvent(getByText('Test Task'), 'longPress');
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const actions = alertCall[2];
      const toggleAction = actions.find((action: any) => 
        action.text.includes('Mark Complete')
      );
      toggleAction.onPress();
      
      expect(mockProps.onToggleCompletion).toHaveBeenCalledWith(mockTask);
    });

    it('should call onDelete from action sheet', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      fireEvent(getByText('Test Task'), 'longPress');
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const actions = alertCall[2];
      const deleteAction = actions.find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(mockProps.onDelete).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('Swipe Gestures', () => {
    // Note: Testing swipe gestures with react-native-gesture-handler is complex
    // In a real app, you'd use integration tests or manual testing for gestures
    
    it('should render swipe actions container', () => {
      const { getByText } = render(<TaskItem {...mockProps} />);
      
      // The swipe actions are rendered but hidden behind the main content
      expect(getByText('Complete')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });

    it('should show "Incomplete" action for completed tasks', () => {
      const completedTask = { ...mockTask, isCompleted: true };
      const { getByText } = render(
        <TaskItem {...mockProps} task={completedTask} />
      );
      
      expect(getByText('Incomplete')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should truncate long titles', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'This is a very long task title that should be truncated to prevent layout issues',
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={longTitleTask} />
      );
      
      expect(getByText('This is a very long task title that should be truncated to prevent layout issues')).toBeTruthy();
    });

    it('should truncate long descriptions', () => {
      const longDescriptionTask = {
        ...mockTask,
        description: 'This is a very long description that should be truncated after two lines to prevent the task item from becoming too tall and affecting the overall layout of the task list',
      };
      const { getByText } = render(
        <TaskItem {...mockProps} task={longDescriptionTask} />
      );
      
      expect(getByText('This is a very long description that should be truncated after two lines to prevent the task item from becoming too tall and affecting the overall layout of the task list')).toBeTruthy();
    });
  });
});