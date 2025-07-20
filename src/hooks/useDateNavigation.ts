import { useState, useEffect, useCallback } from 'react';
import { dateNavigationService } from '../services/DateNavigationService';

/**
 * Hook for managing date navigation across the app
 */
export const useDateNavigation = () => {
  const [currentDate, setCurrentDate] = useState<Date>(dateNavigationService.getCurrentDate());

  useEffect(() => {
    // Initialize the service
    dateNavigationService.initialize();

    // Subscribe to date changes
    const unsubscribe = dateNavigationService.addDateChangeListener((date) => {
      setCurrentDate(date);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    dateNavigationService.setCurrentDate(date);
  }, []);

  const goToNextDay = useCallback(() => {
    dateNavigationService.goToNextDay();
  }, []);

  const goToPreviousDay = useCallback(() => {
    dateNavigationService.goToPreviousDay();
  }, []);

  const goToToday = useCallback(() => {
    dateNavigationService.goToToday();
  }, []);

  const getFormattedDate = useCallback((formatString?: string) => {
    return dateNavigationService.getFormattedDate(formatString);
  }, [currentDate]);

  const getRelativeDateDescription = useCallback(() => {
    return dateNavigationService.getRelativeDateDescription();
  }, [currentDate]);

  const getWeekRange = useCallback(() => {
    return dateNavigationService.getWeekRange();
  }, [currentDate]);

  const getMonthRange = useCallback(() => {
    return dateNavigationService.getMonthRange();
  }, [currentDate]);

  const getDateRange = useCallback((startDate: Date, endDate: Date) => {
    return dateNavigationService.getDateRange(startDate, endDate);
  }, []);

  const isDateInRange = useCallback((date: Date, startDate: Date, endDate: Date) => {
    return dateNavigationService.isDateInRange(date, startDate, endDate);
  }, []);

  return {
    currentDate,
    navigateToDate,
    goToNextDay,
    goToPreviousDay,
    goToToday,
    getFormattedDate,
    getRelativeDateDescription,
    getWeekRange,
    getMonthRange,
    getDateRange,
    isDateInRange,
    isToday: dateNavigationService.isToday(),
    isPastDate: dateNavigationService.isPastDate(),
    isFutureDate: dateNavigationService.isFutureDate(),
  };
};

export default useDateNavigation;