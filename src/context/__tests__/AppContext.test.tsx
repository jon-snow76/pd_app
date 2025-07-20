import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { AppProvider, useApp } from '../AppContext';
import { UserPreferences } from '../../types';
import * as storage from '../../utils/storage';

// Mock storage
jest.mock('../../utils/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('AppContext', () => {
  const mockPreferences: UserPreferences = {
    notificationsEnabled: true,
    defaultEventDuration: 90,
    workingHours: {
      start: '08:00',
      end: '18:00',
    },
    reminderOffset: 10,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.loadUserPreferences.mockResolvedValue(mockPreferences);
    mockStorage.saveUserPreferences.mockResolvedValue();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.state.isInitialized).toBe(false);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.preferences).toBeDefined();
    });

    it('should load preferences on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      expect(mockStorage.loadUserPreferences).toHaveBeenCalled();
      expect(result.current.state.preferences).toEqual(mockPreferences);
      expect(result.current.state.isInitialized).toBe(true);
    });
  });

  describe('Preference Management', () => {
    it('should update single preference', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate(); // Wait for initial load

      await act(async () => {
        await result.current.updatePreference('defaultEventDuration', 120);
      });

      expect(result.current.state.preferences.defaultEventDuration).toBe(120);
      expect(mockStorage.saveUserPreferences).toHaveBeenCalledWith({
        ...mockPreferences,
        defaultEventDuration: 120,
      });
    });

    it('should update working hours', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      const newWorkingHours = { start: '07:00', end: '19:00' };

      await act(async () => {
        await result.current.updatePreference('workingHours', newWorkingHours);
      });

      expect(result.current.state.preferences.workingHours).toEqual(newWorkingHours);
    });

    it('should save preferences manually', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.savePreferences();
      });

      expect(mockStorage.saveUserPreferences).toHaveBeenCalledWith(mockPreferences);
    });

    it('should reset preferences to defaults', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.resetPreferences();
      });

      expect(result.current.state.preferences.defaultEventDuration).toBe(60); // Default value
      expect(result.current.state.preferences.workingHours.start).toBe('09:00'); // Default value
      expect(mockStorage.saveUserPreferences).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors', async () => {
      mockStorage.loadUserPreferences.mockRejectedValue(new Error('Load failed'));

      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.state.error).toBe('Failed to load preferences');
      expect(result.current.state.loading).toBe(false);
    });

    it('should handle update errors', async () => {
      mockStorage.saveUserPreferences.mockRejectedValue(new Error('Save failed'));
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.updatePreference('defaultEventDuration', 120);
      });

      expect(result.current.state.error).toBe('Failed to update preference');
    });

    it('should handle save errors', async () => {
      mockStorage.saveUserPreferences.mockRejectedValue(new Error('Save failed'));
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.savePreferences();
      });

      expect(result.current.state.error).toBe('Failed to save preferences');
    });

    it('should handle reset errors', async () => {
      mockStorage.saveUserPreferences.mockRejectedValue(new Error('Save failed'));
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.resetPreferences();
      });

      expect(result.current.state.error).toBe('Failed to reset preferences');
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useApp());

      expect(result.error).toEqual(
        Error('useApp must be used within an AppProvider')
      );
    });
  });

  describe('State Management', () => {
    it('should maintain state consistency during updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      const initialPreferences = { ...result.current.state.preferences };

      await act(async () => {
        await result.current.updatePreference('notificationsEnabled', false);
      });

      expect(result.current.state.preferences).toEqual({
        ...initialPreferences,
        notificationsEnabled: false,
      });
    });

    it('should handle multiple rapid updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApp(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await Promise.all([
          result.current.updatePreference('defaultEventDuration', 30),
          result.current.updatePreference('reminderOffset', 5),
          result.current.updatePreference('notificationsEnabled', false),
        ]);
      });

      expect(result.current.state.preferences.defaultEventDuration).toBe(30);
      expect(result.current.state.preferences.reminderOffset).toBe(5);
      expect(result.current.state.preferences.notificationsEnabled).toBe(false);
    });
  });
});