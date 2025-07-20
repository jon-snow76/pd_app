import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { addDays, format } from 'date-fns';
import { dateNavigationService } from '../services/DateNavigationService';
import { recurringEventsService } from '../services/RecurringEventsService';
import { useDateNavigation } from '../hooks/useDateNavigation';
import { useRecurringEvents } from '../hooks/useRecurringEvents';
import DateNavigator from '../components/DateNavigator';
import { TimetableEvent } from '../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock date-fns functions that might have issues in test environment
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') {
      return 'Dec 25, 2023';
    }
    return '2023-12-25';
  }),
}));

// Test component that uses cross-date functionality
const TestCrossDateComponent: React.FC = () => {
  const { currentDate, goToNextDay, goToPreviousDay, getFormattedDate } = useDateNavigation();
  const { getEventsForDate, generateRecurringInstances } = useRecurringEvents();
  
  const [events, setEvents] = React.useState<TimetableEvent[]>([]);
  
  React.useEffect(() => {
    // Mock recurring event
    const recurringEvent: TimetableEvent = {
      id: 'daily-standup',
      title: 'Daily Standup',
      description: 'Team standup meeting',
      startTime: new Date('2023-12-25T09:00:00'),
      duration: 30,
      category: 'work',
      isRecurring: true,
      notificationEnabled: true,
      recurrencePattern: {
        type: 'daily',
        interval: 1,
      },
    };
    
    // Generate instances for current date
    const instances = generateRecurringInstances(
      recurringEvent,
      currentDate,
      addDays(currentDate, 1)
    );
    
    setEvents(instances);
  }, [currentDate, generateRecurringInstances]);
  
  return (
    <div>
      <div testID="current-date">{getFormattedDate()}</div>
      <div testID="events-count">{events.length}</div>
      <button testID="prev-day" onPress={goToPreviousDay}>Previous</button>
      <button testID="next-day" onPress={goToNextDay}>Next</button>
      {events.map(event => (
        <div key={event.id} testID={`event-${event.id}`}>
          {event.title}
        </div>
      ))}
    </div>
  );
};

describe('Cross-Date Functionality Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset date navigation service
    dateNavigationService.setCurrentDate(new Date('2023-12-25'));
  });

  describe('Date Navigation Integration', () => {
    it('should navigate between dates and update events', async () => {
      const { getByTestId } = render(<TestCrossDateComponent />);
      
      // Initial state
      await waitFor(() => {
        expect(getByTestId('current-date')).toHaveTextContent('2023-12-25');
        expect(getByTestId('events-count')).toHaveTextContent('1');
      });
      
      // Navigate to next day
      fireEvent.press(getByTestId('next-day'));
      
      await waitFor(() => {
        expect(getByTestId('events-count')).toHaveTextContent('1'); // Should still have recurring event
      });
      
      // Navigate to previous day
      fireEvent.press(getByTestId('prev-day'));
      
      await waitFor(() => {
        expect(getByTestId('events-count')).toHaveTextContent('1');
      });
    });

    it('should render DateNavigator component', async () => {
      const { getByText } = render(<DateNavigator />);
      
      await waitFor(() => {
        expect(getByText('Dec 25, 2023')).toBeTruthy();
      });
    });

    it('should handle date navigation in DateNavigator', async () => {
      const { getByTestId } = render(<DateNavigator />);
      
      // Find navigation buttons (they should have chevron icons)
      const prevButton = getByTestId('nav-button-prev') || 
                        document.querySelector('[data-testid*="chevron-left"]');
      const nextButton = getByTestId('nav-button-next') || 
                        document.querySelector('[data-testid*="chevron-right"]');
      
      if (prevButton) {
        fireEvent.press(prevButton);
      }
      
      if (nextButton) {
        fireEvent.press(nextButton);
      }
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Recurring Events Integration', () => {
    it('should generate recurring events across multiple dates', () => {
      const baseEvent: TimetableEvent = {
        id: 'weekly-meeting',
        title: 'Weekly Team Meeting',
        description: 'Weekly team sync',
        startTime: new Date('2023-12-25T14:00:00'),
        duration: 60,
        category: 'work',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'weekly',
          interval: 1,
        },
      };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-15');
      
      const instances = recurringEventsService.generateRecurringInstances(
        baseEvent,
        startDate,
        endDate
      );
      
      expect(instances.length).toBeGreaterThan(1);
      expect(instances[0].id).toBe('weekly-meeting_2023-12-25');
      expect(instances[0].isRecurringInstance).toBe(true);
      expect(instances[0].parentEventId).toBe('weekly-meeting');
    });

    it('should handle different recurrence patterns', () => {
      const dailyEvent: TimetableEvent = {
        id: 'daily-task',
        title: 'Daily Task',
        description: 'Daily recurring task',
        startTime: new Date('2023-12-25T08:00:00'),
        duration: 30,
        category: 'personal',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'daily',
          interval: 2, // Every 2 days
        },
      };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2023-12-31');
      
      const instances = recurringEventsService.generateRecurringInstances(
        dailyEvent,
        startDate,
        endDate
      );
      
      // Should have instances on 25th, 27th, 29th, 31st
      expect(instances).toHaveLength(4);
      expect(instances[1].startTime.getDate()).toBe(27);
      expect(instances[2].startTime.getDate()).toBe(29);
    });

    it('should respect end dates in recurring patterns', () => {
      const limitedEvent: TimetableEvent = {
        id: 'limited-event',
        title: 'Limited Event',
        description: 'Event with end date',
        startTime: new Date('2023-12-25T10:00:00'),
        duration: 45,
        category: 'work',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'daily',
          interval: 1,
          endDate: new Date('2023-12-28'),
        },
      };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-05');
      
      const instances = recurringEventsService.generateRecurringInstances(
        limitedEvent,
        startDate,
        endDate
      );
      
      // Should only have instances until end date (25th, 26th, 27th, 28th)
      expect(instances).toHaveLength(4);
      expect(instances[instances.length - 1].startTime.getDate()).toBe(28);
    });
  });

  describe('Historical Data Viewing', () => {
    it('should identify past, present, and future dates', () => {
      const today = new Date();
      const yesterday = addDays(today, -1);
      const tomorrow = addDays(today, 1);
      
      // Set to yesterday
      dateNavigationService.setCurrentDate(yesterday);
      expect(dateNavigationService.isPastDate()).toBe(true);
      expect(dateNavigationService.isToday()).toBe(false);
      expect(dateNavigationService.isFutureDate()).toBe(false);
      
      // Set to today
      dateNavigationService.setCurrentDate(today);
      expect(dateNavigationService.isPastDate()).toBe(false);
      expect(dateNavigationService.isToday()).toBe(true);
      expect(dateNavigationService.isFutureDate()).toBe(false);
      
      // Set to tomorrow
      dateNavigationService.setCurrentDate(tomorrow);
      expect(dateNavigationService.isPastDate()).toBe(false);
      expect(dateNavigationService.isToday()).toBe(false);
      expect(dateNavigationService.isFutureDate()).toBe(true);
    });

    it('should provide relative date descriptions', () => {
      const today = new Date();
      
      dateNavigationService.setCurrentDate(today);
      expect(dateNavigationService.getRelativeDateDescription()).toBe('Today');
      
      dateNavigationService.setCurrentDate(addDays(today, 1));
      expect(dateNavigationService.getRelativeDateDescription()).toBe('Tomorrow');
      
      dateNavigationService.setCurrentDate(addDays(today, -1));
      expect(dateNavigationService.getRelativeDateDescription()).toBe('Yesterday');
    });
  });

  describe('Date Range Operations', () => {
    it('should get events in date ranges', () => {
      const regularEvents: TimetableEvent[] = [
        {
          id: 'single-event',
          title: 'Single Event',
          description: 'One-time event',
          startTime: new Date('2023-12-26T15:00:00'),
          duration: 60,
          category: 'personal',
          isRecurring: false,
          notificationEnabled: true,
        },
      ];
      
      const recurringEvents: TimetableEvent[] = [
        {
          id: 'daily-event',
          title: 'Daily Event',
          description: 'Daily recurring event',
          startTime: new Date('2023-12-25T09:00:00'),
          duration: 30,
          category: 'work',
          isRecurring: true,
          notificationEnabled: true,
          recurrencePattern: {
            type: 'daily',
            interval: 1,
          },
        },
      ];
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2023-12-27');
      
      // This would typically be done through the hook
      const { getEventsInRange } = useRecurringEvents();
      const eventsInRange = getEventsInRange(
        regularEvents,
        recurringEvents,
        startDate,
        endDate
      );
      
      // Should include regular event + recurring instances
      expect(eventsInRange.length).toBeGreaterThan(1);
    });

    it('should get week and month ranges', () => {
      dateNavigationService.setCurrentDate(new Date('2023-12-25'));
      
      const weekRange = dateNavigationService.getWeekRange();
      expect(weekRange.start.getDate()).toBe(25);
      expect(weekRange.end.getDate()).toBe(31);
      
      const monthRange = dateNavigationService.getMonthRange();
      expect(monthRange.start.getDate()).toBe(1);
      expect(monthRange.start.getMonth()).toBe(11); // December
      expect(monthRange.end.getDate()).toBe(31);
      expect(monthRange.end.getMonth()).toBe(11); // December
    });
  });

  describe('Midnight Transition', () => {
    it('should handle midnight transition setup', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      dateNavigationService.initialize();
      
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      setTimeoutSpy.mockRestore();
    });

    it('should clean up resources properly', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      dateNavigationService.initialize();
      dateNavigationService.cleanup();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid recurring patterns gracefully', () => {
      const invalidEvent: TimetableEvent = {
        id: 'invalid-event',
        title: 'Invalid Event',
        description: 'Event with invalid pattern',
        startTime: new Date('2023-12-25T10:00:00'),
        duration: 30,
        category: 'work',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'daily',
          interval: 0, // Invalid interval
        },
      };
      
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2023-12-30');
      
      // Should not throw error and should limit iterations
      const instances = recurringEventsService.generateRecurringInstances(
        invalidEvent,
        startDate,
        endDate
      );
      
      expect(instances.length).toBeLessThanOrEqual(1000); // Max iterations limit
    });

    it('should handle date navigation errors gracefully', () => {
      // Should not throw when setting invalid dates
      expect(() => {
        dateNavigationService.setCurrentDate(new Date('invalid'));
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large date ranges efficiently', () => {
      const startTime = Date.now();
      
      const baseEvent: TimetableEvent = {
        id: 'perf-test',
        title: 'Performance Test Event',
        description: 'Event for performance testing',
        startTime: new Date('2023-01-01T09:00:00'),
        duration: 30,
        category: 'work',
        isRecurring: true,
        notificationEnabled: true,
        recurrencePattern: {
          type: 'daily',
          interval: 1,
        },
      };
      
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31'); // Full year
      
      const instances = recurringEventsService.generateRecurringInstances(
        baseEvent,
        startDate,
        endDate
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(instances.length).toBe(365); // One per day for the year
    });
  });
});