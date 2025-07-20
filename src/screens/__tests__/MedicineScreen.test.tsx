import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MedicineScreen from '../MedicineScreen';
import * as storage from '../../utils/storage';
import * as notifications from '../../utils/notifications';
import { Medication } from '../../types';

// Mock dependencies
jest.mock('../../utils/storage');
jest.mock('../../utils/notifications');
jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    cancelMedicationNotifications: jest.fn(),
  }),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MedicineScreen', () => {
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
      {
        date: '2024-01-01',
        time: '20:00',
        taken: false,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00'));
    
    mockStorage.loadMedicines.mockResolvedValue([mockMedication]);
    mockStorage.saveMedicines.mockResolvedValue();
    mockNotifications.scheduleMedicationReminder.mockImplementation(() => {});
    mockNotifications.cancelNotificationsForItem.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render correctly', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText('Medication Tracker')).toBeTruthy();
        expect(getByText('+ Add Medication')).toBeTruthy();
      });
    });

    it('should display medications after loading', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText('Aspirin')).toBeTruthy();
        expect(getByText('100mg')).toBeTruthy();
        expect(getByText('08:00')).toBeTruthy();
        expect(getByText('20:00')).toBeTruthy();
      });
    });

    it('should show empty state when no medications', async () => {
      mockStorage.loadMedicines.mockResolvedValue([]);
      
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText('No medications added yet')).toBeTruthy();
        expect(getByText('Tap the + button above to add your first medication')).toBeTruthy();
      });
    });
  });

  describe('Medication Management', () => {
    it('should open add medication modal', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      expect(getByText('Add Medication')).toBeTruthy();
    });

    it('should save new medication', async () => {
      const { getByText, getByPlaceholderText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      fireEvent.changeText(getByPlaceholderText('Medication name'), 'Ibuprofen');
      fireEvent.changeText(getByPlaceholderText('Dosage (e.g., 1 tablet, 5mg)'), '200mg');
      
      fireEvent.press(getByText('Save'));
      
      await waitFor(() => {
        expect(mockStorage.saveMedicines).toHaveBeenCalled();
        expect(mockNotifications.scheduleMedicationReminder).toHaveBeenCalledWith(
          'Ibuprofen',
          '08:00',
          expect.any(String)
        );
      });
    });

    it('should validate medication form', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      fireEvent.press(getByText('Save'));
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please fill all fields and add at least one reminder time'
      );
    });

    it('should validate time format', async () => {
      const { getByText, getByPlaceholderText, getByDisplayValue } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      fireEvent.changeText(getByPlaceholderText('Medication name'), 'Test Med');
      fireEvent.changeText(getByPlaceholderText('Dosage (e.g., 1 tablet, 5mg)'), '100mg');
      fireEvent.changeText(getByDisplayValue('08:00'), '25:00'); // Invalid time
      
      fireEvent.press(getByText('Save'));
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter valid times in HH:MM format'
      );
    });
  });

  describe('Medication Taking', () => {
    it('should mark medication as taken', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        const timeSlot = getByText('08:00').parent;
        fireEvent.press(timeSlot);
      });
      
      await waitFor(() => {
        expect(mockStorage.saveMedicines).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Medication Taken',
          expect.stringContaining('Aspirin marked as taken')
        );
      });
    });

    it('should not allow taking inactive medication', async () => {
      const inactiveMedication = { ...mockMedication, isActive: false };
      mockStorage.loadMedicines.mockResolvedValue([inactiveMedication]);
      
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText('Inactive')).toBeTruthy();
      });
      
      // Time slots should be disabled for inactive medications
      const timeSlot = getByText('08:00').parent;
      expect(timeSlot.props.disabled).toBe(true);
    });
  });

  describe('Adherence Tracking', () => {
    it('should display today\'s adherence status', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText('Today: 1/2')).toBeTruthy(); // 1 taken out of 2 scheduled
        expect(getByText('50%')).toBeTruthy();
      });
    });

    it('should display 7-day adherence stats', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(getByText(/7-day adherence:/)).toBeTruthy();
      });
    });

    it('should open adherence history modal', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('View History'));
      });
      
      expect(getByText('Aspirin - Adherence History')).toBeTruthy();
    });
  });

  describe('Missed Medications', () => {
    beforeEach(() => {
      // Set time to 9:00 AM, so 8:00 AM medication is 1 hour overdue
      jest.setSystemTime(new Date('2024-01-01T09:00:00'));
    });

    it('should detect missed medications', async () => {
      // Mock a medication that should have been taken at 8:00 but wasn't
      const missedMedication: Medication = {
        ...mockMedication,
        adherenceLog: [], // No log entry means it wasn't taken
      };
      
      mockStorage.loadMedicines.mockResolvedValue([missedMedication]);
      
      const { getByText } = render(<MedicineScreen />);
      
      // Wait for the missed medication check to run
      await act(async () => {
        jest.advanceTimersByTime(61000); // Advance by 1 minute to trigger check
      });
      
      await waitFor(() => {
        expect(getByText('Missed Medications')).toBeTruthy();
        expect(getByText('You have 1 missed medication')).toBeTruthy();
      });
    });

    it('should handle missed medication actions', async () => {
      const missedMedication: Medication = {
        ...mockMedication,
        adherenceLog: [],
      };
      
      mockStorage.loadMedicines.mockResolvedValue([missedMedication]);
      
      const { getByText } = render(<MedicineScreen />);
      
      await act(async () => {
        jest.advanceTimersByTime(61000);
      });
      
      await waitFor(() => {
        fireEvent.press(getByText('Taken Now'));
      });
      
      expect(mockStorage.saveMedicines).toHaveBeenCalled();
      expect(mockNotifications.cancelNotificationsForItem).toHaveBeenCalled();
    });

    it('should schedule follow-up reminders for missed medications', async () => {
      const missedMedication: Medication = {
        ...mockMedication,
        adherenceLog: [],
      };
      
      mockStorage.loadMedicines.mockResolvedValue([missedMedication]);
      
      render(<MedicineScreen />);
      
      await act(async () => {
        jest.advanceTimersByTime(61000);
      });
      
      await waitFor(() => {
        expect(mockNotifications.scheduleMedicationReminder).toHaveBeenCalledWith(
          expect.stringContaining('Follow-up'),
          expect.any(String),
          expect.stringContaining('followup')
        );
      });
    });
  });

  describe('Medication Actions', () => {
    it('should toggle medication active status', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Deactivate'));
      });
      
      expect(mockStorage.saveMedicines).toHaveBeenCalled();
    });

    it('should edit medication', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Edit'));
      });
      
      expect(getByText('Edit Medication')).toBeTruthy();
    });

    it('should delete medication with confirmation', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Delete'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Medication',
        'Are you sure you want to delete Aspirin?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );
    });

    it('should cancel notifications when deleting medication', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Delete'));
      });
      
      // Simulate pressing Delete in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(mockNotifications.cancelNotificationsForItem).toHaveBeenCalledWith(
        '1',
        'medication_reminder'
      );
    });
  });

  describe('Time Management', () => {
    it('should add reminder time', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      fireEvent.press(getByText('+ Add Reminder Time'));
      
      // Should have 2 time inputs now (default + added)
      expect(getByText('+ Add Reminder Time')).toBeTruthy();
    });

    it('should remove reminder time', async () => {
      const { getByText, getAllByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      fireEvent.press(getByText('+ Add Reminder Time'));
      
      // Try to remove a time (should have × buttons)
      const removeButtons = getAllByText('×');
      if (removeButtons.length > 1) {
        fireEvent.press(removeButtons[0]);
      }
    });

    it('should prevent removing last reminder time', async () => {
      const { getByText, getAllByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('+ Add Medication'));
      });
      
      // Try to remove the only time slot
      const removeButtons = getAllByText('×');
      fireEvent.press(removeButtons[0]);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'At least one reminder time is required'
      );
    });
  });

  describe('Data Persistence', () => {
    it('should load medications on mount', async () => {
      render(<MedicineScreen />);
      
      await waitFor(() => {
        expect(mockStorage.loadMedicines).toHaveBeenCalled();
      });
    });

    it('should save medications after changes', async () => {
      const { getByText } = render(<MedicineScreen />);
      
      await waitFor(() => {
        const timeSlot = getByText('08:00').parent;
        fireEvent.press(timeSlot);
      });
      
      expect(mockStorage.saveMedicines).toHaveBeenCalled();
    });
  });
});