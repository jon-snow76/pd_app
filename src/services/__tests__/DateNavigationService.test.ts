import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, subDays, startOfDay, format } from 'date-fns';
import DateNavigationService, { dateNavigationService } from '../DateNavigationService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock timers
jest.useFakeTimers();

describe('DateNavigationService', () => {
  let service: DateNavigationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DateNavigationService();
    
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with current date', () => {
      const currentDate = service.getCurrentDate();
      expect(currentDate).toBeInstanceOf(Date);
    });

    it('should load saved date from storage', async () => {
      const savedDate = new Date('2023-12-25');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(savedDate.toISOString());
      
      await service.initialize();
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@current_date');
    });

    it('should not use old saved dates', async () => {
      const oldDate = subDays(new Date(), 10);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(oldDate.toISOString());
      
      await service.initialize();
      
      // Should use current date instead of old saved date
      expect(service.getCurrentDate()).not.toEqual(startOfDay(oldDate));
    });
  });

  describe('Date Navigation', () => {
    it('should set current date', () => {
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      expect(service.getCurrentDate()).toEqual(startOfDay(testDate));
    });

    it('should navigate to next day', () => {
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      service.goToNextDay();
      
      expect(service.getCurrentDate()).toEqual(addDays(startOfDay(testDate), 1));
    });

    it('should navigate to previous day', () => {
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      service.goToPreviousDay();
      
      expect(service.getCurrentDate()).toEqual(subDays(startOfDay(testDate), 1));
    });

    it('should navigate to today', () => {
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      service.goToToday();
      
      expect(service.getCurrentDate()).toEqual(startOfDay(new Date()));
    });

    it('should save current date to storage', async () => {
      const testDate = new Date('2023-12-25');
      
      service.setCurrentDate(testDate);
      
      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@current_date',
        startOfDay(testDate).toISOString()
      );
    });
  });

  describe('Date Queries', () => {
    beforeEach(() => {
      service.setCurrentDate(new Date('2023-12-25'));
    });

    it('should check if current date is today', () => {
      service.setCurrentDate(new Date());
      expect(service.isToday()).toBe(true);
      
      service.setCurrentDate(new Date('2023-12-25'));
      expect(service.isToday()).toBe(false);
    });

    it('should check if current date is in the past', () => {
      const pastDate = subDays(new Date(), 1);
      service.setCurrentDate(pastDate);
      expect(service.isPastDate()).toBe(true);
      
      const futureDate = addDays(new Date(), 1);
      service.setCurrentDate(futureDate);
      expect(service.isPastDate()).toBe(false);
    });

    it('should check if current date is in the future', () => {
      const futureDate = addDays(new Date(), 1);
      service.setCurrentDate(futureDate);
      expect(service.isFutureDate()).toBe(true);
      
      const pastDate = subDays(new Date(), 1);
      service.setCurrentDate(pastDate);
      expect(service.isFutureDate()).toBe(false);
    });

    it('should format date correctly', () => {
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      expect(service.getFormattedDate()).toBe('2023-12-25');
      expect(service.getFormattedDate('MMM d, yyyy')).toBe('Dec 25, 2023');
    });

    it('should get relative date description', () => {
      const today = new Date();
      service.setCurrentDate(today);
      expect(service.getRelativeDateDescription()).toBe('Today');
      
      service.setCurrentDate(addDays(today, 1));
      expect(service.getRelativeDateDescription()).toBe('Tomorrow');
      
      service.setCurrentDate(subDays(today, 1));
      expect(service.getRelativeDateDescription()).toBe('Yesterday');
    });
  });

  describe('Date Ranges', () => {
    beforeEach(() => {
      service.setCurrentDate(new Date('2023-12-25'));
    });

    it('should get week range', () => {
      const range = service.getWeekRange();
      
      expect(range.start).toEqual(startOfDay(new Date('2023-12-25')));
      expect(range.end).toEqual(new Date('2023-12-31T23:59:59.999Z'));
    });

    it('should get month range', () => {
      const range = service.getMonthRange();
      
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(11); // December
      expect(range.end.getDate()).toBe(31);
      expect(range.end.getMonth()).toBe(11); // December
    });

    it('should get date range between two dates', () => {
      const startDate = new Date('2023-12-20');
      const endDate = new Date('2023-12-25');
      
      const dates = service.getDateRange(startDate, endDate);
      
      expect(dates).toHaveLength(6);
      expect(dates[0]).toEqual(startOfDay(startDate));
      expect(dates[5]).toEqual(startOfDay(endDate));
    });

    it('should check if date is in range', () => {
      const startDate = new Date('2023-12-20');
      const endDate = new Date('2023-12-25');
      const testDate = new Date('2023-12-22');
      const outsideDate = new Date('2023-12-30');
      
      expect(service.isDateInRange(testDate, startDate, endDate)).toBe(true);
      expect(service.isDateInRange(outsideDate, startDate, endDate)).toBe(false);
    });
  });

  describe('Listeners', () => {
    it('should add and remove date change listeners', () => {
      const listener = jest.fn();
      const unsubscribe = service.addDateChangeListener(listener);
      
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      expect(listener).toHaveBeenCalledWith(startOfDay(testDate));
      
      // Unsubscribe
      unsubscribe();
      
      service.setCurrentDate(new Date('2023-12-26'));
      
      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.addDateChangeListener(listener1);
      service.addDateChangeListener(listener2);
      
      const testDate = new Date('2023-12-25');
      service.setCurrentDate(testDate);
      
      expect(listener1).toHaveBeenCalledWith(startOfDay(testDate));
      expect(listener2).toHaveBeenCalledWith(startOfDay(testDate));
    });
  });

  describe('Midnight Transition', () => {
    it('should set up midnight timer on initialization', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      service.initialize();
      
      expect(setTimeoutSpy).toHaveBeenCalled();
    });

    it('should transition to new day at midnight when viewing today', () => {
      const listener = jest.fn();
      service.addDateChangeListener(listener);
      
      // Set to today
      service.setCurrentDate(new Date());
      service.initialize();
      
      // Fast-forward to midnight
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
      
      // Should have transitioned to new day
      expect(listener).toHaveBeenCalled();
    });

    it('should clean up midnight timer', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      service.initialize();
      service.cleanup();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      await service.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load current date:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      service.setCurrentDate(new Date('2023-12-25'));
      
      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save current date:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(dateNavigationService).toBeInstanceOf(DateNavigationService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = dateNavigationService;
      const instance2 = dateNavigationService;
      
      expect(instance1).toBe(instance2);
    });
  });
});