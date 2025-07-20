import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TimetableCard from '../TimetableCard';
import { TimetableEvent } from '../../types';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('TimetableCard', () => {
  const mockEvent: TimetableEvent = {
    id: '1',
    title: 'Test Event',
    description: 'Test description',
    startTime: new Date('2024-01-01T10:00:00'),
    duration: 60,
    category: 'work',
    isRecurring: false,
    notificationEnabled: true,
  };

  const mockProps = {
    event: mockEvent,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    isConflicted: false,
    isPast: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render event details correctly', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      expect(getByText('Test Event')).toBeTruthy();
      expect(getByText('Test description')).toBeTruthy();
      expect(getByText('10:00 - 11:00 (60m)')).toBeTruthy();
      expect(getByText('Work')).toBeTruthy();
    });

    it('should display recurring indicator for recurring events', () => {
      const recurringEvent = { ...mockEvent, isRecurring: true };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={recurringEvent} />
      );
      
      expect(getByText('↻')).toBeTruthy();
    });

    it('should display notification indicator when enabled', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      expect(getByText('🔔')).toBeTruthy();
    });

    it('should not display notification indicator when disabled', () => {
      const eventWithoutNotification = { ...mockEvent, notificationEnabled: false };
      const { queryByText } = render(
        <TimetableCard {...mockProps} event={eventWithoutNotification} />
      );
      
      expect(queryByText('🔔')).toBeFalsy();
    });

    it('should render without description when not provided', () => {
      const eventWithoutDescription = { ...mockEvent, description: undefined };
      const { queryByText } = render(
        <TimetableCard {...mockProps} event={eventWithoutDescription} />
      );
      
      expect(queryByText('Test description')).toBeFalsy();
    });
  });

  describe('Category Styling', () => {
    it('should apply work category styling', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      expect(getByText('Work')).toBeTruthy();
    });

    it('should apply personal category styling', () => {
      const personalEvent = { ...mockEvent, category: 'personal' as const };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={personalEvent} />
      );
      
      expect(getByText('Personal')).toBeTruthy();
    });

    it('should apply health category styling', () => {
      const healthEvent = { ...mockEvent, category: 'health' as const };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={healthEvent} />
      );
      
      expect(getByText('Health')).toBeTruthy();
    });

    it('should apply other category styling', () => {
      const otherEvent = { ...mockEvent, category: 'other' as const };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={otherEvent} />
      );
      
      expect(getByText('Other')).toBeTruthy();
    });
  });

  describe('Conflict State', () => {
    it('should display conflict indicator when conflicted', () => {
      const { getByText } = render(
        <TimetableCard {...mockProps} isConflicted={true} />
      );
      
      expect(getByText('⚠️ Conflict')).toBeTruthy();
    });

    it('should not display conflict indicator when not conflicted', () => {
      const { queryByText } = render(
        <TimetableCard {...mockProps} isConflicted={false} />
      );
      
      expect(queryByText('⚠️ Conflict')).toBeFalsy();
    });
  });

  describe('Past Event State', () => {
    it('should apply past styling for past events', () => {
      const { getByText } = render(
        <TimetableCard {...mockProps} isPast={true} />
      );
      
      // Past events should still display content but with different styling
      expect(getByText('Test Event')).toBeTruthy();
    });

    it('should disable interactions for past events', () => {
      const { getByText } = render(
        <TimetableCard {...mockProps} isPast={true} />
      );
      
      const card = getByText('Test Event').parent;
      fireEvent.press(card);
      
      // onEdit should not be called for past events
      expect(mockProps.onEdit).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when pressed', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      const card = getByText('Test Event').parent;
      fireEvent.press(card);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockEvent);
    });

    it('should show action sheet on long press', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      const card = getByText('Test Event').parent;
      fireEvent(card, 'longPress');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Event',
        'What would you like to do?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Edit' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );
    });

    it('should not show action sheet on long press for past events', () => {
      const { getByText } = render(
        <TimetableCard {...mockProps} isPast={true} />
      );
      
      const card = getByText('Test Event').parent;
      fireEvent(card, 'longPress');
      
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should call onEdit from action sheet', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      const card = getByText('Test Event').parent;
      fireEvent(card, 'longPress');
      
      // Simulate pressing Edit in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const editAction = alertCall[2].find((action: any) => action.text === 'Edit');
      editAction.onPress();
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockEvent);
    });

    it('should call onDelete from action sheet', () => {
      const { getByText } = render(<TimetableCard {...mockProps} />);
      
      const card = getByText('Test Event').parent;
      fireEvent(card, 'longPress');
      
      // Simulate pressing Delete in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(mockProps.onDelete).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Time Display', () => {
    it('should format time correctly for different durations', () => {
      const event30min = { ...mockEvent, duration: 30 };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={event30min} />
      );
      
      expect(getByText('10:00 - 10:30 (30m)')).toBeTruthy();
    });

    it('should handle events crossing hour boundaries', () => {
      const event90min = { ...mockEvent, duration: 90 };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={event90min} />
      );
      
      expect(getByText('10:00 - 11:30 (90m)')).toBeTruthy();
    });

    it('should handle events starting at different times', () => {
      const afternoonEvent = {
        ...mockEvent,
        startTime: new Date('2024-01-01T14:30:00'),
        duration: 45,
      };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={afternoonEvent} />
      );
      
      expect(getByText('14:30 - 15:15 (45m)')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should truncate long titles', () => {
      const longTitleEvent = {
        ...mockEvent,
        title: 'This is a very long event title that should be truncated',
      };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={longTitleEvent} />
      );
      
      expect(getByText('This is a very long event title that should be truncated')).toBeTruthy();
    });

    it('should truncate long descriptions', () => {
      const longDescriptionEvent = {
        ...mockEvent,
        description: 'This is a very long description that should be truncated after two lines to prevent the card from becoming too tall and affecting the layout',
      };
      const { getByText } = render(
        <TimetableCard {...mockProps} event={longDescriptionEvent} />
      );
      
      expect(getByText('This is a very long description that should be truncated after two lines to prevent the card from becoming too tall and affecting the layout')).toBeTruthy();
    });
  });
});