import { renderHook, act } from '@testing-library/react-hooks';
import { useDateNavigation } from '../useDateNavigation';
import { dateNavigationService } from '../../services/DateNavigationService';

// Mock the date navigation service
jest.mock('../../services/DateNavigationService', () => ({
  dateNavigationService: {
    initialize: jest.fn(),
    getCurrentDate: jest.fn(),
    setCurrentDate: jest.fn(),
    goToNextDay: jest.fn(),
    goToPreviousDay: jest.fn(),
    goToToday: jest.fn(),
    getFormattedDate: jest.fn(),
    getRelativeDateDescription: jest.fn(),
    getWeekRange: jest.fn(),
    getMonthRange: jest.fn(),
    getDateRange: jest.fn(),
    isDateInRange: jest.fn(),
    isToday: jest.fn(),
    isPastDate: jest.fn(),
    isFutureDate: jest.fn(),
    addDateChangeListener: jest.fn(),
  },
}));

describe('useDateNavigation', () => {
  const mockDateNavigationService = dateNavigationService as jest.Mocked<typeof dateNavigationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockDateNavigationService.getCurrentDate.mockReturnValue(new Date('2023-12-25'));
    mockDateNavigationService.addDateChangeListener.mockReturnValue(() => {});
    mockDateNavigationService.getFormattedDate.mockReturnValue('2023-12-25');
    mockDateNavigationService.getRelativeDateDescription.mockReturnValue('Today');
    mockDateNavigationService.getWeekRange.mockReturnValue({
      start: new Date('2023-12-25'),
      end: new Date('2023-12-31'),
    });
    mockDateNavigationService.getMonthRange.mockReturnValue({
      start: new Date('2023-12-01'),
      end: new Date('2023-12-31'),
    });
    mockDateNavigationService.getDateRange.mockReturnValue([]);
    mockDateNavigationService.isDateInRange.mockReturnValue(true);
    mockDateNavigationService.isToday.mockReturnValue(true);
    mockDateNavigationService.isPastDate.mockReturnValue(false);
    mockDateNavigationService.isFutureDate.mockReturnValue(false);
  });

  describe('Initialization', () => {
    it('should initialize date navigation service on mount', () => {
      renderHook(() => useDateNavigation());
      
      expect(mockDateNavigationService.initialize).toHaveBeenCalled();
      expect(mockDateNavigationService.addDateChangeListener).toHaveBeenCalled();
    });

    it('should set initial current date', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      expect(result.current.currentDate).toEqual(new Date('2023-12-25'));
    });

    it('should clean up listener on unmount', () => {
      const unsubscribeMock = jest.fn();
      mockDateNavigationService.addDateChangeListener.mockReturnValue(unsubscribeMock);
      
      const { unmount } = renderHook(() => useDateNavigation());
      
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Date Change Listener', () => {
    it('should update current date when service notifies change', () => {
      let dateChangeListener: (date: Date) => void = () => {};
      mockDateNavigationService.addDateChangeListener.mockImplementation((listener) => {
        dateChangeListener = listener;
        return () => {};
      });
      
      const { result } = renderHook(() => useDateNavigation());
      
      expect(result.current.currentDate).toEqual(new Date('2023-12-25'));
      
      // Simulate date change
      const newDate = new Date('2023-12-26');
      act(() => {
        dateChangeListener(newDate);
      });
      
      expect(result.current.currentDate).toEqual(newDate);
    });
  });

  describe('Navigation Functions', () => {
    it('should navigate to specific date', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const testDate = new Date('2023-12-30');
      act(() => {
        result.current.navigateToDate(testDate);
      });
      
      expect(mockDateNavigationService.setCurrentDate).toHaveBeenCalledWith(testDate);
    });

    it('should go to next day', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      act(() => {
        result.current.goToNextDay();
      });
      
      expect(mockDateNavigationService.goToNextDay).toHaveBeenCalled();
    });

    it('should go to previous day', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      act(() => {
        result.current.goToPreviousDay();
      });
      
      expect(mockDateNavigationService.goToPreviousDay).toHaveBeenCalled();
    });

    it('should go to today', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      act(() => {
        result.current.goToToday();
      });
      
      expect(mockDateNavigationService.goToToday).toHaveBeenCalled();
    });
  });

  describe('Formatting Functions', () => {
    it('should get formatted date', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const formatted = result.current.getFormattedDate('MMM d, yyyy');
      
      expect(mockDateNavigationService.getFormattedDate).toHaveBeenCalledWith('MMM d, yyyy');
      expect(formatted).toBe('2023-12-25');
    });

    it('should get relative date description', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const description = result.current.getRelativeDateDescription();
      
      expect(mockDateNavigationService.getRelativeDateDescription).toHaveBeenCalled();
      expect(description).toBe('Today');
    });
  });

  describe('Range Functions', () => {
    it('should get week range', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const range = result.current.getWeekRange();
      
      expect(mockDateNavigationService.getWeekRange).toHaveBeenCalled();
      expect(range).toEqual({
        start: new Date('2023-12-25'),
        end: new Date('2023-12-31'),
      });
    });

    it('should get month range', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const range = result.current.getMonthRange();
      
      expect(mockDateNavigationService.getMonthRange).toHaveBeenCalled();
      expect(range).toEqual({
        start: new Date('2023-12-01'),
        end: new Date('2023-12-31'),
      });
    });

    it('should get date range', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const startDate = new Date('2023-12-20');
      const endDate = new Date('2023-12-25');
      
      result.current.getDateRange(startDate, endDate);
      
      expect(mockDateNavigationService.getDateRange).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should check if date is in range', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      const date = new Date('2023-12-22');
      const startDate = new Date('2023-12-20');
      const endDate = new Date('2023-12-25');
      
      const inRange = result.current.isDateInRange(date, startDate, endDate);
      
      expect(mockDateNavigationService.isDateInRange).toHaveBeenCalledWith(date, startDate, endDate);
      expect(inRange).toBe(true);
    });
  });

  describe('Date Status Properties', () => {
    it('should return correct date status', () => {
      const { result } = renderHook(() => useDateNavigation());
      
      expect(result.current.isToday).toBe(true);
      expect(result.current.isPastDate).toBe(false);
      expect(result.current.isFutureDate).toBe(false);
    });

    it('should update date status when current date changes', () => {
      mockDateNavigationService.isToday.mockReturnValue(false);
      mockDateNavigationService.isPastDate.mockReturnValue(true);
      
      const { result, rerender } = renderHook(() => useDateNavigation());
      
      // Trigger re-render to get updated status
      rerender();
      
      expect(result.current.isToday).toBe(false);
      expect(result.current.isPastDate).toBe(true);
    });
  });

  describe('Memoization', () => {
    it('should memoize callback functions', () => {
      const { result, rerender } = renderHook(() => useDateNavigation());
      
      const firstNavigateToDate = result.current.navigateToDate;
      const firstGoToNextDay = result.current.goToNextDay;
      
      rerender();
      
      expect(result.current.navigateToDate).toBe(firstNavigateToDate);
      expect(result.current.goToNextDay).toBe(firstGoToNextDay);
    });

    it('should update memoized functions when dependencies change', () => {
      let dateChangeListener: (date: Date) => void = () => {};
      mockDateNavigationService.addDateChangeListener.mockImplementation((listener) => {
        dateChangeListener = listener;
        return () => {};
      });
      
      const { result } = renderHook(() => useDateNavigation());
      
      const firstGetFormattedDate = result.current.getFormattedDate;
      
      // Change current date
      act(() => {
        dateChangeListener(new Date('2023-12-26'));
      });
      
      // Function should be different due to dependency change
      expect(result.current.getFormattedDate).not.toBe(firstGetFormattedDate);
    });
  });
});