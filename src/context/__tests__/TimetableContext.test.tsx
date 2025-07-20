import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { TimetableProvider, useTimetable } from '../TimetableContext';
import { TimetableEvent } from '../../types';
import * as storage from '../../utils/storage';
import * as validation from '../../utils/validation';
import * as dateUtils from '../../utils/dateUtils';

// Mock dependencies
jest.mock('../../utils/storage');
jest.mock('../../utils/validation');
jest.mock('../../utils/dateUtils');
jest.mock('../../utils/helpers', () => ({
  generateId: jest.fn(() => 'mock-id'),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockValidation = validation as jest.Mocked<typeof validation>;
const mockDateUtils = dateUtils as jest.Mocked<typeof dateUtils>;

describe('TimetableContext', () => {
  const mockEvent: TimetableEvent = {
    id: '1',
    title: 'Test Event',
    startTime: new Date('2024-01-01T10:00:00'),
    duration: 60,
    category: 'work',
    isRecurring: false,
    notificationEnabled: true,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TimetableProvider>{children}</TimetableProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.loadTimetableEvents.mockResolvedValue([]);
    mockValidation.validateTimetableEvent.mockReturnValue({ isValid: true, errors: [] });
    mockDateUtils.findConflictingEvents.mockReturnValue([]);
    mockDateUtils.getEventsForDate.mockReturnValue([]);
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTimetable(), { wrapper });

      expect(result.current.state.events).toEqual([]);
      expect(result.current.state.selectedDate).toBeInstanceOf(Date);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.conflicts).toEqual([]);
    });

    it('should load events on mount', async () => {
      mockStorage.loadTimetableEvents.mockResolvedValue([mockEvent]);

      const { result, waitForNextUpdate } = renderHook(() => useTimetable(), { wrapper });

      await waitForNextUpdate();

      expect(mockStorage.loadTimetableEvents).toHaveBeenCalled();
      expect(result.current.state.events).toEqual([mockEvent]);
    });
  });

  describe('Event Management', () => {
    describe('addEvent', () => {
      it('should add valid event successfully', async () => {
        mockStorage.addTimetableEvent.mockResolvedValue();
        const { result } = renderHook(() => useTimetable(), { wrapper });

        const eventData = {
          title: 'New Event',
          startTime: new Date('2024-01-01T14:00:00'),
          duration: 60,
          category: 'work' as const,
          isRecurring: false,
          notificationEnabled: true,
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addEvent(eventData);
        });

        expect(addResult.isValid).toBe(true);
        expect(mockStorage.addTimetableEvent).toHaveBeenCalled();
        expect(result.current.state.events).toHaveLength(1);
      });

      it('should reject invalid event', async () => {
        mockValidation.validateTimetableEvent.mockReturnValue({
          isValid: false,
          errors: ['Title is required'],
        });

        const { result } = renderHook(() => useTimetable(), { wrapper });

        const eventData = {
          title: '',
          startTime: new Date('2024-01-01T14:00:00'),
          duration: 60,
          category: 'work' as const,
          isRecurring: false,
          notificationEnabled: true,
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addEvent(eventData);
        });

        expect(addResult.isValid).toBe(false);
        expect(addResult.errors).toContain('Title is required');
        expect(mockStorage.addTimetableEvent).not.toHaveBeenCalled();
      });

      it('should detect and handle conflicts', async () => {
        const conflictingEvent = { ...mockEvent, id: '2' };
        mockDateUtils.findConflictingEvents.mockReturnValue([conflictingEvent]);

        const { result } = renderHook(() => useTimetable(), { wrapper });

        const eventData = {
          title: 'Conflicting Event',
          startTime: new Date('2024-01-01T10:30:00'),
          duration: 60,
          category: 'work' as const,
          isRecurring: false,
          notificationEnabled: true,
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addEvent(eventData);
        });

        expect(addResult.isValid).toBe(false);
        expect(addResult.errors[0]).toContain('conflicts with 1 existing event');
        expect(result.current.state.conflicts).toEqual([conflictingEvent]);
      });
    });

    describe('updateEvent', () => {
      it('should update valid event successfully', async () => {
        mockStorage.updateTimetableEvent.mockResolvedValue();
        const { result } = renderHook(() => useTimetable(), { wrapper });

        // Set initial state with an event
        await act(async () => {
          result.current.state.events.push(mockEvent);
        });

        const updatedEvent = { ...mockEvent, title: 'Updated Event' };

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateEvent(updatedEvent);
        });

        expect(updateResult.isValid).toBe(true);
        expect(mockStorage.updateTimetableEvent).toHaveBeenCalledWith(updatedEvent);
      });

      it('should handle update conflicts', async () => {
        const conflictingEvent = { ...mockEvent, id: '2' };
        mockDateUtils.findConflictingEvents.mockReturnValue([conflictingEvent]);

        const { result } = renderHook(() => useTimetable(), { wrapper });

        const updatedEvent = { ...mockEvent, startTime: new Date('2024-01-01T10:30:00') };

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateEvent(updatedEvent);
        });

        expect(updateResult.isValid).toBe(false);
        expect(result.current.state.conflicts).toEqual([conflictingEvent]);
      });
    });

    describe('deleteEvent', () => {
      it('should delete event successfully', async () => {
        mockStorage.deleteTimetableEvent.mockResolvedValue();
        const { result } = renderHook(() => useTimetable(), { wrapper });

        // Set initial state with an event
        act(() => {
          result.current.state.events.push(mockEvent);
        });

        await act(async () => {
          await result.current.deleteEvent('1');
        });

        expect(mockStorage.deleteTimetableEvent).toHaveBeenCalledWith('1');
      });

      it('should handle delete errors', async () => {
        mockStorage.deleteTimetableEvent.mockRejectedValue(new Error('Delete failed'));
        const { result } = renderHook(() => useTimetable(), { wrapper });

        await act(async () => {
          await result.current.deleteEvent('1');
        });

        expect(result.current.state.error).toBe('Failed to delete event');
      });
    });
  });

  describe('Date Management', () => {
    it('should set selected date', () => {
      const { result } = renderHook(() => useTimetable(), { wrapper });
      const newDate = new Date('2024-02-01');

      act(() => {
        result.current.setSelectedDate(newDate);
      });

      expect(result.current.state.selectedDate).toEqual(newDate);
      expect(result.current.state.conflicts).toEqual([]);
    });

    it('should get events for selected date', () => {
      mockDateUtils.getEventsForDate.mockReturnValue([mockEvent]);
      const { result } = renderHook(() => useTimetable(), { wrapper });

      const events = result.current.getEventsForSelectedDate();

      expect(mockDateUtils.getEventsForDate).toHaveBeenCalledWith(
        result.current.state.events,
        result.current.state.selectedDate
      );
      expect(events).toEqual([mockEvent]);
    });

    it('should get events for specific date', () => {
      mockDateUtils.getEventsForDate.mockReturnValue([mockEvent]);
      const { result } = renderHook(() => useTimetable(), { wrapper });
      const targetDate = new Date('2024-01-01');

      const events = result.current.getEventsForDate(targetDate);

      expect(mockDateUtils.getEventsForDate).toHaveBeenCalledWith(
        result.current.state.events,
        targetDate
      );
      expect(events).toEqual([mockEvent]);
    });
  });

  describe('Conflict Management', () => {
    it('should check event conflicts', () => {
      const conflictingEvent = { ...mockEvent, id: '2' };
      mockDateUtils.findConflictingEvents.mockReturnValue([conflictingEvent]);
      const { result } = renderHook(() => useTimetable(), { wrapper });

      let conflicts: TimetableEvent[];
      act(() => {
        conflicts = result.current.checkEventConflicts(mockEvent);
      });

      expect(conflicts!).toEqual([conflictingEvent]);
      expect(result.current.state.conflicts).toEqual([conflictingEvent]);
    });

    it('should validate and check conflicts', () => {
      const { result } = renderHook(() => useTimetable(), { wrapper });

      const validation = result.current.validateAndCheckConflicts(mockEvent);

      expect(validation.isValid).toBe(true);
      expect(mockValidation.validateTimetableEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should clear conflicts', () => {
      const { result } = renderHook(() => useTimetable(), { wrapper });

      // Set some conflicts first
      act(() => {
        result.current.checkEventConflicts(mockEvent);
      });

      act(() => {
        result.current.clearConflicts();
      });

      expect(result.current.state.conflicts).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate total scheduled time for date', () => {
      mockDateUtils.getEventsForDate.mockReturnValue([
        { ...mockEvent, duration: 60 },
        { ...mockEvent, id: '2', duration: 90 },
      ]);
      const { result } = renderHook(() => useTimetable(), { wrapper });

      const totalTime = result.current.getTotalScheduledTimeForDate(new Date('2024-01-01'));

      expect(totalTime).toBe(150); // 60 + 90 minutes
    });

    it('should get available slots', () => {
      const { result } = renderHook(() => useTimetable(), { wrapper });

      const slots = result.current.getAvailableSlots(new Date('2024-01-01'), 60);

      expect(Array.isArray(slots)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors', async () => {
      mockStorage.loadTimetableEvents.mockRejectedValue(new Error('Load failed'));

      const { result, waitForNextUpdate } = renderHook(() => useTimetable(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.state.error).toBe('Failed to load events');
      expect(result.current.state.loading).toBe(false);
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useTimetable());

      expect(result.error).toEqual(
        Error('useTimetable must be used within a TimetableProvider')
      );
    });
  });
});