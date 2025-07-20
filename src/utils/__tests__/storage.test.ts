import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveTimetableEvents,
  loadTimetableEvents,
  addTimetableEvent,
  updateTimetableEvent,
  deleteTimetableEvent,
  getTimetableEventsForDate,
  saveTasks,
  loadTasks,
  addTask,
  updateTask,
  deleteTask,
  saveUserPreferences,
  loadUserPreferences,
  addProductivityLog,
  getProductivityLogForDate,
} from '../storage';
import { TimetableEvent, Task, UserPreferences, ProductivityLog } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Storage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timetable Events Storage', () => {
    const mockEvent: TimetableEvent = {
      id: '1',
      title: 'Test Event',
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 60,
      category: 'work',
      isRecurring: false,
      notificationEnabled: true,
    };

    describe('saveTimetableEvents', () => {
      it('should save events to AsyncStorage', async () => {
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await saveTimetableEvents([mockEvent]);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@timetable_events',
          JSON.stringify([mockEvent])
        );
      });
    });

    describe('loadTimetableEvents', () => {
      it('should load and parse events from AsyncStorage', async () => {
        const storedData = JSON.stringify([mockEvent]);
        mockAsyncStorage.getItem.mockResolvedValue(storedData);
        
        const events = await loadTimetableEvents();
        
        expect(events).toHaveLength(1);
        expect(events[0].title).toBe('Test Event');
        expect(events[0].startTime).toBeInstanceOf(Date);
      });

      it('should return empty array when no data exists', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);
        
        const events = await loadTimetableEvents();
        
        expect(events).toEqual([]);
      });
    });

    describe('addTimetableEvent', () => {
      it('should add event to existing events', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await addTimetableEvent(mockEvent);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@timetable_events',
          JSON.stringify([mockEvent])
        );
      });
    });

    describe('updateTimetableEvent', () => {
      it('should update existing event', async () => {
        const existingEvents = [mockEvent];
        const updatedEvent = { ...mockEvent, title: 'Updated Event' };
        
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingEvents));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await updateTimetableEvent(updatedEvent);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@timetable_events',
          JSON.stringify([updatedEvent])
        );
      });

      it('should throw error when event not found', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
        
        await expect(updateTimetableEvent(mockEvent)).rejects.toThrow(
          'Event with id 1 not found'
        );
      });
    });

    describe('deleteTimetableEvent', () => {
      it('should remove event from storage', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([mockEvent]));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await deleteTimetableEvent('1');
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@timetable_events',
          JSON.stringify([])
        );
      });
    });

    describe('getTimetableEventsForDate', () => {
      it('should return events for specific date', async () => {
        const events = [
          mockEvent,
          {
            ...mockEvent,
            id: '2',
            startTime: new Date('2024-01-02T10:00:00'),
          },
        ];
        
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(events));
        
        const result = await getTimetableEventsForDate(new Date('2024-01-01'));
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });
  });

  describe('Tasks Storage', () => {
    const mockTask: Task = {
      id: '1',
      title: 'Test Task',
      priority: 'high',
      dueDate: new Date('2024-01-01'),
      isCompleted: false,
      category: 'work',
    };

    describe('saveTasks', () => {
      it('should save tasks to AsyncStorage', async () => {
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await saveTasks([mockTask]);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@tasks',
          JSON.stringify([mockTask])
        );
      });
    });

    describe('loadTasks', () => {
      it('should load and parse tasks from AsyncStorage', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([mockTask]));
        
        const tasks = await loadTasks();
        
        expect(tasks).toHaveLength(1);
        expect(tasks[0].dueDate).toBeInstanceOf(Date);
      });
    });

    describe('addTask', () => {
      it('should add task to existing tasks', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await addTask(mockTask);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@tasks',
          JSON.stringify([mockTask])
        );
      });
    });
  });

  describe('User Preferences Storage', () => {
    const mockPreferences: UserPreferences = {
      notificationsEnabled: true,
      defaultEventDuration: 60,
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      reminderOffset: 15,
    };

    describe('saveUserPreferences', () => {
      it('should save preferences to AsyncStorage', async () => {
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await saveUserPreferences(mockPreferences);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@user_preferences',
          JSON.stringify(mockPreferences)
        );
      });
    });

    describe('loadUserPreferences', () => {
      it('should load preferences from AsyncStorage', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockPreferences));
        
        const preferences = await loadUserPreferences();
        
        expect(preferences).toEqual(mockPreferences);
      });

      it('should return default preferences when none exist', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);
        
        const preferences = await loadUserPreferences();
        
        expect(preferences.notificationsEnabled).toBe(true);
        expect(preferences.defaultEventDuration).toBe(60);
      });
    });
  });

  describe('Productivity Logs Storage', () => {
    const mockLog: ProductivityLog = {
      date: '2024-01-01',
      completedTasks: 5,
      totalTasks: 8,
      completedEvents: 3,
      totalEvents: 4,
      medicationAdherence: 0.9,
      productivityScore: 85,
    };

    describe('addProductivityLog', () => {
      it('should add new log', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await addProductivityLog(mockLog);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@productivity_logs',
          JSON.stringify([mockLog])
        );
      });

      it('should update existing log for same date', async () => {
        const existingLog = { ...mockLog, productivityScore: 70 };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existingLog]));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await addProductivityLog(mockLog);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@productivity_logs',
          JSON.stringify([mockLog])
        );
      });
    });

    describe('getProductivityLogForDate', () => {
      it('should return log for specific date', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([mockLog]));
        
        const result = await getProductivityLogForDate('2024-01-01');
        
        expect(result).toEqual(mockLog);
      });

      it('should return null when no log exists for date', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
        
        const result = await getProductivityLogForDate('2024-01-02');
        
        expect(result).toBeNull();
      });
    });
  });
});