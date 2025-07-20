import { addDays, addWeeks, addMonths, startOfDay, endOfDay, isSameDay, isAfter, isBefore } from 'date-fns';
import { TimetableEvent } from '../types';

/**
 * Service for managing recurring events
 */
class RecurringEventsService {
    /**
     * Generate recurring event instances for a date range
     */
    generateRecurringInstances(
        baseEvent: TimetableEvent,
        startDate: Date,
        endDate: Date
    ): TimetableEvent[] {
        if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
            return [];
        }

        const instances: TimetableEvent[] = [];
        const pattern = baseEvent.recurrencePattern;
        let currentDate = new Date(baseEvent.startTime);

        // Ensure we start from the base event date or later
        if (isBefore(currentDate, startDate)) {
            currentDate = this.findNextOccurrence(baseEvent, startDate);
        }

        let iterationCount = 0;
        const maxIterations = 1000; // Prevent infinite loops

        while (
            currentDate <= endDate &&
            iterationCount < maxIterations &&
            (!pattern.endDate || currentDate <= pattern.endDate)
        ) {
            if (currentDate >= startDate) {
                const instance = this.createEventInstance(baseEvent, currentDate);
                instances.push(instance);
            }

            currentDate = this.getNextOccurrence(currentDate, pattern);
            iterationCount++;
        }

        return instances;
    }

    /**
     * Create a single event instance for a specific date
     */
    createEventInstance(baseEvent: TimetableEvent, date: Date): TimetableEvent {
        const eventDate = new Date(date);
        const originalDate = new Date(baseEvent.startTime);

        // Preserve the time from the original event
        eventDate.setHours(
            originalDate.getHours(),
            originalDate.getMinutes(),
            originalDate.getSeconds(),
            originalDate.getMilliseconds()
        );

        return {
            ...baseEvent,
            id: `${baseEvent.id}_${date.toISOString().split('T')[0]}`,
            startTime: eventDate,
            isRecurringInstance: true,
            parentEventId: baseEvent.id,
        };
    }

    /**
     * Find the next occurrence of a recurring event from a given date
     */
    findNextOccurrence(baseEvent: TimetableEvent, fromDate: Date): Date {
        if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
            return new Date(baseEvent.startTime);
        }

        const pattern = baseEvent.recurrencePattern;
        let currentDate = new Date(baseEvent.startTime);

        // If the base event is after the from date, return it
        if (currentDate >= fromDate) {
            return currentDate;
        }

        // Find the next occurrence
        while (currentDate < fromDate) {
            currentDate = this.getNextOccurrence(currentDate, pattern);
        }

        return currentDate;
    }

    /**
     * Get the next occurrence date based on recurrence pattern
     */
    private getNextOccurrence(currentDate: Date, pattern: RecurrencePattern): Date {
        switch (pattern.type) {
            case 'daily':
                return addDays(currentDate, pattern.interval || 1);

            case 'weekly':
                return addWeeks(currentDate, pattern.interval || 1);

            case 'monthly':
                return addMonths(currentDate, pattern.interval || 1);

            case 'custom':
                // For custom patterns, we'll use daily as default
                // This can be extended to support more complex patterns
                return addDays(currentDate, pattern.interval || 1);

            default:
                return addDays(currentDate, 1);
        }
    }

    /**
     * Check if an event should occur on a specific date
     */
    shouldEventOccurOnDate(baseEvent: TimetableEvent, targetDate: Date): boolean {
        if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
            return isSameDay(baseEvent.startTime, targetDate);
        }

        const pattern = baseEvent.recurrencePattern;
        const baseDate = startOfDay(baseEvent.startTime);
        const checkDate = startOfDay(targetDate);

        // Check if the target date is before the base event
        if (checkDate < baseDate) {
            return false;
        }

        // Check if the target date is after the end date
        if (pattern.endDate && checkDate > startOfDay(pattern.endDate)) {
            return false;
        }

        // Calculate if the date matches the recurrence pattern
        const daysDiff = Math.floor((checkDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (pattern.type) {
            case 'daily':
                return daysDiff % (pattern.interval || 1) === 0;

            case 'weekly':
                return daysDiff % ((pattern.interval || 1) * 7) === 0;

            case 'monthly':
                // For monthly, we check if it's the same day of the month
                const baseDay = baseDate.getDate();
                const targetDay = checkDate.getDate();
                const monthsDiff = (checkDate.getFullYear() - baseDate.getFullYear()) * 12 +
                    (checkDate.getMonth() - baseDate.getMonth());
                return baseDay === targetDay && monthsDiff % (pattern.interval || 1) === 0;

            case 'custom':
                // Custom logic can be implemented here
                return daysDiff % (pattern.interval || 1) === 0;

            default:
                return false;
        }
    }

    /**
     * Get all recurring events for a specific date
     */
    getRecurringEventsForDate(recurringEvents: TimetableEvent[], targetDate: Date): TimetableEvent[] {
        return recurringEvents
            .filter(event => this.shouldEventOccurOnDate(event, targetDate))
            .map(event => this.createEventInstance(event, targetDate));
    }

    /**
     * Validate recurrence pattern
     */
    validateRecurrencePattern(pattern: RecurrencePattern): boolean {
        if (!pattern.type) {
            return false;
        }

        if (pattern.interval && pattern.interval < 1) {
            return false;
        }

        if (pattern.endDate && pattern.endDate <= new Date()) {
            return false;
        }

        return true;
    }

    /**
     * Get human-readable description of recurrence pattern
     */
    getRecurrenceDescription(pattern: RecurrencePattern): string {
        const interval = pattern.interval || 1;

        switch (pattern.type) {
            case 'daily':
                return interval === 1 ? 'Daily' : `Every ${interval} days`;

            case 'weekly':
                return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;

            case 'monthly':
                return interval === 1 ? 'Monthly' : `Every ${interval} months`;

            case 'custom':
                return `Every ${interval} days (custom)`;

            default:
                return 'Unknown pattern';
        }
    }

    /**
     * Calculate the next few occurrences of a recurring event
     */
    getUpcomingOccurrences(baseEvent: TimetableEvent, count: number = 5): Date[] {
        if (!baseEvent.isRecurring || !baseEvent.recurrencePattern) {
            return [baseEvent.startTime];
        }

        const occurrences: Date[] = [];
        const pattern = baseEvent.recurrencePattern;
        let currentDate = new Date(baseEvent.startTime);

        // Start from today if the base event is in the past
        const today = new Date();
        if (currentDate < today) {
            currentDate = this.findNextOccurrence(baseEvent, today);
        }

        let iterationCount = 0;
        const maxIterations = count * 10; // Prevent infinite loops

        while (
            occurrences.length < count &&
            iterationCount < maxIterations &&
            (!pattern.endDate || currentDate <= pattern.endDate)
        ) {
            occurrences.push(new Date(currentDate));
            currentDate = this.getNextOccurrence(currentDate, pattern);
            iterationCount++;
        }

        return occurrences;
    }
}

// Types
export interface RecurrencePattern {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number; // Every N days/weeks/months
    endDate?: Date;
    daysOfWeek?: number[]; // For weekly patterns (0 = Sunday, 1 = Monday, etc.)
    dayOfMonth?: number; // For monthly patterns
}

// Extend the TimetableEvent type to include recurring instance properties
declare module '../types' {
    interface TimetableEvent {
        isRecurringInstance?: boolean;
        parentEventId?: string;
    }
}

// Export singleton instance
export const recurringEventsService = new RecurringEventsService();
export default RecurringEventsService;