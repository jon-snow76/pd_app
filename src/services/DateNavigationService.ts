import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, subDays, startOfDay, endOfDay, isSameDay, isAfter, isBefore } from 'date-fns';

/**
 * Service for managing date navigation across the app
 */
class DateNavigationService {
  private currentDate: Date = new Date();
  private listeners: Array<(date: Date) => void> = [];
  private midnightTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the date navigation service
   */
  initialize(): void {
    this.setupMidnightTransition();
    this.loadCurrentDate();
  }

  /**
   * Get the current selected date
   */
  getCurrentDate(): Date {
    return new Date(this.currentDate);
  }

  /**
   * Set the current date and notify listeners
   */
  setCurrentDate(date: Date): void {
    const newDate = startOfDay(date);
    if (!isSameDay(this.currentDate, newDate)) {
      this.currentDate = newDate;
      this.saveCurrentDate();
      this.notifyListeners();
    }
  }

  /**
   * Navigate to the next day
   */
  goToNextDay(): void {
    const nextDay = addDays(this.currentDate, 1);
    this.setCurrentDate(nextDay);
  }

  /**
   * Navigate to the previous day
   */
  goToPreviousDay(): void {
    const previousDay = subDays(this.currentDate, 1);
    this.setCurrentDate(previousDay);
  }

  /**
   * Navigate to today
   */
  goToToday(): void {
    this.setCurrentDate(new Date());
  }

  /**
   * Check if the current date is today
   */
  isToday(): boolean {
    return isSameDay(this.currentDate, new Date());
  }

  /**
   * Check if the current date is in the past
   */
  isPastDate(): boolean {
    return isBefore(this.currentDate, startOfDay(new Date()));
  }

  /**
   * Check if the current date is in the future
   */
  isFutureDate(): boolean {
    return isAfter(this.currentDate, startOfDay(new Date()));
  }

  /**
   * Get formatted date string
   */
  getFormattedDate(formatString: string = 'yyyy-MM-dd'): string {
    return format(this.currentDate, formatString);
  }

  /**
   * Get date range for a week containing the current date
   */
  getWeekRange(): { start: Date; end: Date } {
    const start = startOfDay(this.currentDate);
    const end = endOfDay(addDays(start, 6));
    return { start, end };
  }

  /**
   * Get date range for a month containing the current date
   */
  getMonthRange(): { start: Date; end: Date } {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  /**
   * Add listener for date changes
   */
  addDateChangeListener(listener: (date: Date) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get dates in a range
   */
  getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }

  /**
   * Check if a date is within a range
   */
  isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    const checkDate = startOfDay(date);
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Get relative date description (Today, Yesterday, Tomorrow, etc.)
   */
  getRelativeDateDescription(): string {
    const today = new Date();
    
    if (isSameDay(this.currentDate, today)) {
      return 'Today';
    } else if (isSameDay(this.currentDate, addDays(today, 1))) {
      return 'Tomorrow';
    } else if (isSameDay(this.currentDate, subDays(today, 1))) {
      return 'Yesterday';
    } else if (this.currentDate > today) {
      const daysDiff = Math.ceil((this.currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `In ${daysDiff} days`;
    } else {
      const daysDiff = Math.ceil((today.getTime() - this.currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysDiff} days ago`;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }
    this.listeners = [];
  }

  /**
   * Private methods
   */
  private setupMidnightTransition(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    this.midnightTimer = setTimeout(() => {
      // If we're currently viewing today, transition to the new day
      if (this.isToday()) {
        this.setCurrentDate(new Date());
      }
      
      // Set up the next midnight transition
      this.setupMidnightTransition();
    }, msUntilMidnight);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(new Date(this.currentDate)));
  }

  private async saveCurrentDate(): Promise<void> {
    try {
      await AsyncStorage.setItem('@current_date', this.currentDate.toISOString());
    } catch (error) {
      console.error('Failed to save current date:', error);
    }
  }

  private async loadCurrentDate(): Promise<void> {
    try {
      const savedDate = await AsyncStorage.getItem('@current_date');
      if (savedDate) {
        const parsedDate = new Date(savedDate);
        // Only use saved date if it's not older than 7 days
        const weekAgo = subDays(new Date(), 7);
        if (parsedDate >= weekAgo) {
          this.currentDate = startOfDay(parsedDate);
        }
      }
    } catch (error) {
      console.error('Failed to load current date:', error);
    }
  }
}

// Export singleton instance
export const dateNavigationService = new DateNavigationService();
export default DateNavigationService;