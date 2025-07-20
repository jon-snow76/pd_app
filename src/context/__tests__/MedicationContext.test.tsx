import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { MedicationProvider, useMedication } from '../MedicationContext';
import { Medication } from '../../types';
import * as storage from '../../utils/storage';
import * as validation from '../../utils/validation';

// Mock dependencies
jest.mock('../../utils/storage');
jest.mock('../../utils/validation');
jest.mock('../../utils/helpers', () => ({
  ...jest.requireActual('../../utils/helpers'),
  generateId: jest.fn(() => 'mock-id'),
  formatDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  formatTimeString: jest.fn((date: Date) => date.toTimeString().slice(0, 5)),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockValidation = validation as jest.Mocked<typeof validation>;

describe('MedicationContext', () => {
  const mockMedication: Medication = {
    id: '1',
    name: 'Aspirin',
    dosage: '100mg',
    reminderTimes: ['08:00', '20:00'],
    isActive: true,
    adherenceLog: [
      {
        date: '2024-01-01',
        time: '08:00',
        taken: true,
        takenAt: new Date('2024-01-01T08:05:00'),
      },
    ],
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MedicationProvider>{children}</MedicationProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00'));
    
    mockStorage.loadMedicines.mockResolvedValue([]);
    mockStorage.saveMedicines.mockResolvedValue();
    mockStorage.addMedication.mockResolvedValue();
    mockStorage.updateMedication.mockResolvedValue();
    mockStorage.deleteMedication.mockResolvedValue();
    mockValidation.validateMedication.mockReturnValue({ isValid: true, errors: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMedication(), { wrapper });

      expect(result.current.state.medications).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.missedMedications).toEqual([]);
    });

    it('should load medications on mount', async () => {
      mockStorage.loadMedicines.mockResolvedValue([mockMedication]);

      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      expect(mockStorage.loadMedicines).toHaveBeenCalled();
      expect(result.current.state.medications).toEqual([mockMedication]);
    });
  });

  describe('Medication Management', () => {
    describe('addMedication', () => {
      it('should add valid medication successfully', async () => {
        const { result } = renderHook(() => useMedication(), { wrapper });

        const medicationData = {
          name: 'Ibuprofen',
          dosage: '200mg',
          reminderTimes: ['12:00'],
          isActive: true,
          adherenceLog: [],
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addMedication(medicationData);
        });

        expect(addResult.isValid).toBe(true);
        expect(mockStorage.addMedication).toHaveBeenCalled();
        expect(result.current.state.medications).toHaveLength(1);
      });

      it('should reject invalid medication', async () => {
        mockValidation.validateMedication.mockReturnValue({
          isValid: false,
          errors: ['Medication name is required'],
        });

        const { result } = renderHook(() => useMedication(), { wrapper });

        const medicationData = {
          name: '',
          dosage: '200mg',
          reminderTimes: ['12:00'],
          isActive: true,
          adherenceLog: [],
        };

        let addResult: any;
        await act(async () => {
          addResult = await result.current.addMedication(medicationData);
        });

        expect(addResult.isValid).toBe(false);
        expect(addResult.errors).toContain('Medication name is required');
        expect(mockStorage.addMedication).not.toHaveBeenCalled();
      });
    });

    describe('updateMedication', () => {
      it('should update valid medication successfully', async () => {
        const { result } = renderHook(() => useMedication(), { wrapper });

        const updatedMedication = { ...mockMedication, dosage: '200mg' };

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateMedication(updatedMedication);
        });

        expect(updateResult.isValid).toBe(true);
        expect(mockStorage.updateMedication).toHaveBeenCalledWith(updatedMedication);
      });

      it('should handle validation errors', async () => {
        mockValidation.validateMedication.mockReturnValue({
          isValid: false,
          errors: ['Invalid medication data'],
        });

        const { result } = renderHook(() => useMedication(), { wrapper });

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateMedication(mockMedication);
        });

        expect(updateResult.isValid).toBe(false);
        expect(updateResult.errors).toContain('Invalid medication data');
      });
    });

    describe('deleteMedication', () => {
      it('should delete medication successfully', async () => {
        mockStorage.loadMedicines.mockResolvedValue([mockMedication]);
        const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

        await waitForNextUpdate();

        await act(async () => {
          await result.current.deleteMedication('1');
        });

        expect(mockStorage.deleteMedication).toHaveBeenCalledWith('1');
        expect(result.current.state.medications).toHaveLength(0);
      });

      it('should handle delete errors', async () => {
        mockStorage.deleteMedication.mockRejectedValue(new Error('Delete failed'));
        const { result } = renderHook(() => useMedication(), { wrapper });

        await act(async () => {
          await result.current.deleteMedication('1');
        });

        expect(result.current.state.error).toBe('Failed to delete medication');
      });
    });
  });

  describe('Adherence Tracking', () => {
    beforeEach(async () => {
      mockStorage.loadMedicines.mockResolvedValue([mockMedication]);
    });

    it('should mark medication as taken', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.markMedicationTaken('1', '20:00', true);
      });

      expect(mockStorage.saveMedicines).toHaveBeenCalled();
    });

    it('should calculate medication status correctly', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      const status = result.current.getMedicationStatus(mockMedication);

      expect(status.takenCount).toBe(1);
      expect(status.totalReminders).toBe(2);
      expect(status.percentage).toBe(50);
    });

    it('should calculate adherence stats correctly', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      const stats = result.current.getAdherenceStats(mockMedication, 7);

      expect(stats.totalExpected).toBeGreaterThan(0);
      expect(stats.totalTaken).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Missed Medications', () => {
    it('should detect missed medications', async () => {
      // Set time to 9:00 AM, so 8:00 AM medication is overdue
      jest.setSystemTime(new Date('2024-01-01T09:00:00'));
      
      const missedMedication: Medication = {
        ...mockMedication,
        adherenceLog: [], // No log entry means it wasn't taken
      };
      
      mockStorage.loadMedicines.mockResolvedValue([missedMedication]);

      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      // Trigger missed medication check
      act(() => {
        result.current.checkMissedMedications();
      });

      expect(result.current.state.missedMedications).toHaveLength(1);
      expect(result.current.state.missedMedications[0].medication.id).toBe('1');
      expect(result.current.state.missedMedications[0].time).toBe('08:00');
    });

    it('should handle missed medication actions', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      // Set up missed medication
      act(() => {
        result.current.state.missedMedications.push({ medication: mockMedication, time: '08:00' });
      });

      await act(async () => {
        await result.current.handleMissedMedication('1', '08:00', 'taken');
      });

      expect(mockStorage.saveMedicines).toHaveBeenCalled();
    });

    it('should not detect missed medications for inactive medications', async () => {
      jest.setSystemTime(new Date('2024-01-01T09:00:00'));
      
      const inactiveMedication: Medication = {
        ...mockMedication,
        isActive: false,
        adherenceLog: [],
      };
      
      mockStorage.loadMedicines.mockResolvedValue([inactiveMedication]);

      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      act(() => {
        result.current.checkMissedMedications();
      });

      expect(result.current.state.missedMedications).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      mockStorage.loadMedicines.mockResolvedValue([mockMedication]);
    });

    it('should toggle medication active status', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      await act(async () => {
        await result.current.toggleMedicationActive('1');
      });

      expect(mockStorage.updateMedication).toHaveBeenCalled();
    });

    it('should get active medications', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      const activeMedications = result.current.getActiveMedications();

      expect(activeMedications).toHaveLength(1);
      expect(activeMedications[0].isActive).toBe(true);
    });

    it('should get medication by ID', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      const medication = result.current.getMedicationById('1');

      expect(medication).toEqual(mockMedication);
    });

    it('should return undefined for non-existent medication ID', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      const medication = result.current.getMedicationById('non-existent');

      expect(medication).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors', async () => {
      mockStorage.loadMedicines.mockRejectedValue(new Error('Load failed'));

      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.state.error).toBe('Failed to load medications');
      expect(result.current.state.loading).toBe(false);
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useMedication());

      expect(result.error).toEqual(
        Error('useMedication must be used within a MedicationProvider')
      );
    });
  });

  describe('Periodic Checks', () => {
    it('should check for missed medications periodically', async () => {
      jest.setSystemTime(new Date('2024-01-01T09:00:00'));
      
      const missedMedication: Medication = {
        ...mockMedication,
        adherenceLog: [],
      };
      
      mockStorage.loadMedicines.mockResolvedValue([missedMedication]);

      const { result, waitForNextUpdate } = renderHook(() => useMedication(), { wrapper });

      await waitForNextUpdate();

      // Fast-forward time to trigger periodic check
      act(() => {
        jest.advanceTimersByTime(61000); // 1 minute + 1 second
      });

      expect(result.current.state.missedMedications).toHaveLength(1);
    });
  });
});