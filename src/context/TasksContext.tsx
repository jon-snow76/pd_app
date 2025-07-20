import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Task, ValidationResult } from '../types';
import {
  loadTasks,
  saveTasks,
  addTask as addTaskToStorage,
  updateTask as updateTaskInStorage,
  deleteTask as deleteTaskFromStorage,
} from '../utils/storage';
import { validateTask } from '../utils/validation';
import { generateId, isPastDate, formatDateString } from '../utils/helpers';

// State interface
interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filter: TaskFilter;
  sortBy: TaskSortOption;
}

// Filter and sort options
export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'today' | 'high' | 'medium' | 'low';
export type TaskSortOption = 'dueDate' | 'priority' | 'created' | 'alphabetical';

// Action types
type TasksAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: TaskFilter }
  | { type: 'SET_SORT'; payload: TaskSortOption }
  | { type: 'TOGGLE_TASK_COMPLETION'; payload: string };

// Initial state
const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
  filter: 'all',
  sortBy: 'dueDate',
};

// Reducer function
const tasksReducer = (state: TasksState, action: TasksAction): TasksState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false, error: null };
    
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
        error: null,
      };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
        error: null,
      };
    
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        error: null,
      };
    
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    
    case 'TOGGLE_TASK_COMPLETION':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload
            ? {
                ...task,
                isCompleted: !task.isCompleted,
                completedAt: !task.isCompleted ? new Date() : undefined,
              }
            : task
        ),
        error: null,
      };
    
    default:
      return state;
  }
};

// Context interface
interface TasksContextType {
  state: TasksState;
  // Task management
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<ValidationResult>;
  updateTask: (task: Task) => Promise<ValidationResult>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  // Filtering and sorting
  setFilter: (filter: TaskFilter) => void;
  setSortBy: (sortBy: TaskSortOption) => void;
  getFilteredAndSortedTasks: () => Task[];
  // Statistics
  getTaskStats: () => {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    today: number;
    highPriority: number;
  };
  // Utility functions
  getTasksByCategory: (category: string) => Task[];
  getTasksByPriority: (priority: 'high' | 'medium' | 'low') => Task[];
  getOverdueTasks: () => Task[];
  getTodayTasks: () => Task[];
}

// Create context
const TasksContext = createContext<TasksContextType | undefined>(undefined);

// Provider component
interface TasksProviderProps {
  children: ReactNode;
}

export const TasksProvider: React.FC<TasksProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  // Load tasks on mount
  useEffect(() => {
    loadTasksData();
  }, []);

  // Task management functions
  const loadTasksData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tasks = await loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load tasks' });
      console.error('Error loading tasks:', error);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id'>): Promise<ValidationResult> => {
    try {
      // Validate task data
      const validation = validateTask(taskData);
      if (!validation.isValid) {
        return validation;
      }

      // Create task with ID
      const newTask: Task = {
        ...taskData,
        id: generateId(),
      };

      // Save to storage
      await addTaskToStorage(newTask);
      
      // Update state
      dispatch({ type: 'ADD_TASK', payload: newTask });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to add task';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error adding task:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const updateTask = async (updatedTask: Task): Promise<ValidationResult> => {
    try {
      // Validate task data
      const validation = validateTask(updatedTask);
      if (!validation.isValid) {
        return validation;
      }

      // Save to storage
      await updateTaskInStorage(updatedTask);
      
      // Update state
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });

      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = 'Failed to update task';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error updating task:', error);
      return { isValid: false, errors: [errorMessage] };
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      await deleteTaskFromStorage(taskId);
      dispatch({ type: 'DELETE_TASK', payload: taskId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete task' });
      console.error('Error deleting task:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: string): Promise<void> => {
    try {
      // Update state first for immediate UI feedback
      dispatch({ type: 'TOGGLE_TASK_COMPLETION', payload: taskId });
      
      // Find the updated task and save to storage
      const updatedTask = state.tasks.find(task => task.id === taskId);
      if (updatedTask) {
        const taskToSave = {
          ...updatedTask,
          isCompleted: !updatedTask.isCompleted,
          completedAt: !updatedTask.isCompleted ? new Date() : undefined,
        };
        await updateTaskInStorage(taskToSave);
      }
    } catch (error) {
      // Revert the state change if storage fails
      dispatch({ type: 'TOGGLE_TASK_COMPLETION', payload: taskId });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update task status' });
      console.error('Error toggling task completion:', error);
    }
  };

  // Filtering and sorting functions
  const setFilter = (filter: TaskFilter): void => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  };

  const setSortBy = (sortBy: TaskSortOption): void => {
    dispatch({ type: 'SET_SORT', payload: sortBy });
  };

  const getFilteredAndSortedTasks = (): Task[] => {
    let filteredTasks = [...state.tasks];

    // Apply filter
    switch (state.filter) {
      case 'pending':
        filteredTasks = filteredTasks.filter(task => !task.isCompleted);
        break;
      case 'completed':
        filteredTasks = filteredTasks.filter(task => task.isCompleted);
        break;
      case 'overdue':
        filteredTasks = filteredTasks.filter(task => 
          !task.isCompleted && isPastDate(task.dueDate)
        );
        break;
      case 'today':
        const today = formatDateString(new Date());
        filteredTasks = filteredTasks.filter(task => 
          formatDateString(task.dueDate) === today
        );
        break;
      case 'high':
        filteredTasks = filteredTasks.filter(task => task.priority === 'high');
        break;
      case 'medium':
        filteredTasks = filteredTasks.filter(task => task.priority === 'medium');
        break;
      case 'low':
        filteredTasks = filteredTasks.filter(task => task.priority === 'low');
        break;
      case 'all':
      default:
        // No filtering
        break;
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      switch (state.sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        
        case 'created':
          // Assuming tasks are created in order of their IDs
          return a.id.localeCompare(b.id);
        
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        
        case 'dueDate':
        default:
          return a.dueDate.getTime() - b.dueDate.getTime();
      }
    });

    return filteredTasks;
  };

  // Statistics functions
  const getTaskStats = () => {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.isCompleted).length;
    const pending = total - completed;
    const overdue = state.tasks.filter(task => 
      !task.isCompleted && isPastDate(task.dueDate)
    ).length;
    
    const today = formatDateString(new Date());
    const todayTasks = state.tasks.filter(task => 
      formatDateString(task.dueDate) === today
    ).length;
    
    const highPriority = state.tasks.filter(task => 
      task.priority === 'high' && !task.isCompleted
    ).length;

    return {
      total,
      completed,
      pending,
      overdue,
      today: todayTasks,
      highPriority,
    };
  };

  // Utility functions
  const getTasksByCategory = (category: string): Task[] => {
    return state.tasks.filter(task => task.category === category);
  };

  const getTasksByPriority = (priority: 'high' | 'medium' | 'low'): Task[] => {
    return state.tasks.filter(task => task.priority === priority);
  };

  const getOverdueTasks = (): Task[] => {
    return state.tasks.filter(task => 
      !task.isCompleted && isPastDate(task.dueDate)
    );
  };

  const getTodayTasks = (): Task[] => {
    const today = formatDateString(new Date());
    return state.tasks.filter(task => 
      formatDateString(task.dueDate) === today
    );
  };

  // Context value
  const contextValue: TasksContextType = {
    state,
    loadTasks: loadTasksData,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    setFilter,
    setSortBy,
    getFilteredAndSortedTasks,
    getTaskStats,
    getTasksByCategory,
    getTasksByPriority,
    getOverdueTasks,
    getTodayTasks,
  };

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
};

// Custom hook to use the context
export const useTasks = (): TasksContextType => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

export default TasksContext;