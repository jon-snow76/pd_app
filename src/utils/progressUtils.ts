import { Task, TimetableEvent, Medication, ProductivityLog } from '../types';
import { formatDateString, isToday, isPastDate } from './helpers';

/**
 * Progress tracking and analytics utilities
 */

/**
 * Calculate daily productivity score based on completed tasks, events, and medication adherence
 */
export const calculateDailyProductivityScore = (
  tasks: Task[],
  events: TimetableEvent[],
  medications: Medication[],
  date: Date = new Date()
): number => {
  const dateKey = formatDateString(date);
  
  // Task completion score (40% weight)
  const dayTasks = tasks.filter(task => formatDateString(task.dueDate) === dateKey);
  const completedTasks = dayTasks.filter(task => task.isCompleted).length;
  const taskScore = dayTasks.length > 0 ? (completedTasks / dayTasks.length) * 40 : 0;
  
  // Event attendance score (40% weight)
  const dayEvents = events.filter(event => formatDateString(event.startTime) === dateKey);
  // For now, assume all events are attended (in a real app, you'd track attendance)
  const eventScore = dayEvents.length > 0 ? 40 : 0;
  
  // Medication adherence score (20% weight)
  const medicationScore = calculateMedicationAdherenceScore(medications, date) * 20;
  
  return Math.round(taskScore + eventScore + medicationScore);
};

/**
 * Calculate medication adherence score for a specific date
 */
export const calculateMedicationAdherenceScore = (
  medications: Medication[],
  date: Date = new Date()
): number => {
  const dateKey = formatDateString(date);
  const activeMedications = medications.filter(med => med.isActive);
  
  if (activeMedications.length === 0) {
    return 1; // Perfect score if no medications
  }
  
  let totalExpected = 0;
  let totalTaken = 0;
  
  activeMedications.forEach(medication => {
    const dayLogs = medication.adherenceLog.filter(log => log.date === dateKey);
    totalExpected += medication.reminderTimes.length;
    totalTaken += dayLogs.filter(log => log.taken).length;
  });
  
  return totalExpected > 0 ? totalTaken / totalExpected : 1;
};

/**
 * Generate productivity log for a specific date
 */
export const generateProductivityLog = (
  tasks: Task[],
  events: TimetableEvent[],
  medications: Medication[],
  date: Date = new Date()
): ProductivityLog => {
  const dateKey = formatDateString(date);
  
  // Task statistics
  const dayTasks = tasks.filter(task => formatDateString(task.dueDate) === dateKey);
  const completedTasks = dayTasks.filter(task => task.isCompleted).length;
  
  // Event statistics
  const dayEvents = events.filter(event => formatDateString(event.startTime) === dateKey);
  const completedEvents = dayEvents.length; // Assume all events are attended
  
  // Medication adherence
  const medicationAdherence = calculateMedicationAdherenceScore(medications, date);
  
  // Overall productivity score
  const productivityScore = calculateDailyProductivityScore(tasks, events, medications, date);
  
  return {
    date: dateKey,
    completedTasks,
    totalTasks: dayTasks.length,
    completedEvents,
    totalEvents: dayEvents.length,
    medicationAdherence,
    productivityScore,
  };
};

/**
 * Calculate weekly productivity statistics
 */
export const calculateWeeklyStats = (
  productivityLogs: ProductivityLog[],
  startDate: Date = new Date()
): {
  averageScore: number;
  totalTasks: number;
  completedTasks: number;
  totalEvents: number;
  completedEvents: number;
  averageMedicationAdherence: number;
  dailyScores: number[];
  trend: 'improving' | 'declining' | 'stable';
} => {
  // Get last 7 days
  const weekLogs: ProductivityLog[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    const dateKey = formatDateString(date);
    
    const log = productivityLogs.find(l => l.date === dateKey);
    if (log) {
      weekLogs.push(log);
    } else {
      // Create empty log for missing days
      weekLogs.push({
        date: dateKey,
        completedTasks: 0,
        totalTasks: 0,
        completedEvents: 0,
        totalEvents: 0,
        medicationAdherence: 1,
        productivityScore: 0,
      });
    }
  }
  
  // Calculate aggregated statistics
  const totalTasks = weekLogs.reduce((sum, log) => sum + log.totalTasks, 0);
  const completedTasks = weekLogs.reduce((sum, log) => sum + log.completedTasks, 0);
  const totalEvents = weekLogs.reduce((sum, log) => sum + log.totalEvents, 0);
  const completedEvents = weekLogs.reduce((sum, log) => sum + log.completedEvents, 0);
  
  const averageScore = weekLogs.reduce((sum, log) => sum + log.productivityScore, 0) / 7;
  const averageMedicationAdherence = weekLogs.reduce((sum, log) => sum + log.medicationAdherence, 0) / 7;
  
  const dailyScores = weekLogs.map(log => log.productivityScore);
  
  // Calculate trend
  const firstHalf = dailyScores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;
  const secondHalf = dailyScores.slice(4, 7).reduce((sum, score) => sum + score, 0) / 3;
  const difference = secondHalf - firstHalf;
  
  let trend: 'improving' | 'declining' | 'stable';
  if (difference > 5) {
    trend = 'improving';
  } else if (difference < -5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }
  
  return {
    averageScore: Math.round(averageScore),
    totalTasks,
    completedTasks,
    totalEvents,
    completedEvents,
    averageMedicationAdherence: Math.round(averageMedicationAdherence * 100) / 100,
    dailyScores,
    trend,
  };
};

/**
 * Calculate monthly productivity statistics
 */
export const calculateMonthlyStats = (
  productivityLogs: ProductivityLog[],
  month: number,
  year: number
): {
  averageScore: number;
  totalTasks: number;
  completedTasks: number;
  totalEvents: number;
  completedEvents: number;
  averageMedicationAdherence: number;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  streaks: {
    currentStreak: number;
    longestStreak: number;
  };
} => {
  // Filter logs for the specified month
  const monthLogs = productivityLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.getMonth() === month && logDate.getFullYear() === year;
  });
  
  if (monthLogs.length === 0) {
    return {
      averageScore: 0,
      totalTasks: 0,
      completedTasks: 0,
      totalEvents: 0,
      completedEvents: 0,
      averageMedicationAdherence: 0,
      bestDay: null,
      worstDay: null,
      streaks: { currentStreak: 0, longestStreak: 0 },
    };
  }
  
  // Calculate aggregated statistics
  const totalTasks = monthLogs.reduce((sum, log) => sum + log.totalTasks, 0);
  const completedTasks = monthLogs.reduce((sum, log) => sum + log.completedTasks, 0);
  const totalEvents = monthLogs.reduce((sum, log) => sum + log.totalEvents, 0);
  const completedEvents = monthLogs.reduce((sum, log) => sum + log.completedEvents, 0);
  
  const averageScore = monthLogs.reduce((sum, log) => sum + log.productivityScore, 0) / monthLogs.length;
  const averageMedicationAdherence = monthLogs.reduce((sum, log) => sum + log.medicationAdherence, 0) / monthLogs.length;
  
  // Find best and worst days
  const sortedLogs = [...monthLogs].sort((a, b) => b.productivityScore - a.productivityScore);
  const bestDay = sortedLogs.length > 0 ? { date: sortedLogs[0].date, score: sortedLogs[0].productivityScore } : null;
  const worstDay = sortedLogs.length > 0 ? { date: sortedLogs[sortedLogs.length - 1].date, score: sortedLogs[sortedLogs.length - 1].productivityScore } : null;
  
  // Calculate streaks (days with score >= 70)
  const streaks = calculateProductivityStreaks(monthLogs);
  
  return {
    averageScore: Math.round(averageScore),
    totalTasks,
    completedTasks,
    totalEvents,
    completedEvents,
    averageMedicationAdherence: Math.round(averageMedicationAdherence * 100) / 100,
    bestDay,
    worstDay,
    streaks,
  };
};

/**
 * Calculate productivity streaks
 */
export const calculateProductivityStreaks = (
  productivityLogs: ProductivityLog[],
  threshold: number = 70
): {
  currentStreak: number;
  longestStreak: number;
} => {
  if (productivityLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  
  // Sort logs by date
  const sortedLogs = [...productivityLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Calculate current streak (from most recent date backwards)
  const today = new Date();
  let checkDate = new Date(today);
  
  for (let i = 0; i < 30; i++) { // Check last 30 days
    const dateKey = formatDateString(checkDate);
    const log = sortedLogs.find(l => l.date === dateKey);
    
    if (log && log.productivityScore >= threshold) {
      if (i === 0 || currentStreak > 0) { // Continue streak only if it's today or streak is ongoing
        currentStreak++;
      }
    } else {
      break; // Break current streak
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Calculate longest streak
  for (const log of sortedLogs) {
    if (log.productivityScore >= threshold) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }
  
  return { currentStreak, longestStreak };
};

/**
 * Get productivity insights and recommendations
 */
export const getProductivityInsights = (
  tasks: Task[],
  events: TimetableEvent[],
  medications: Medication[],
  productivityLogs: ProductivityLog[]
): {
  insights: string[];
  recommendations: string[];
  achievements: string[];
} => {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const achievements: string[] = [];
  
  const weeklyStats = calculateWeeklyStats(productivityLogs);
  const streaks = calculateProductivityStreaks(productivityLogs);
  
  // Insights
  if (weeklyStats.trend === 'improving') {
    insights.push('Your productivity has been improving this week! 📈');
  } else if (weeklyStats.trend === 'declining') {
    insights.push('Your productivity has declined this week. Let\'s get back on track! 📉');
  }
  
  if (weeklyStats.averageScore >= 80) {
    insights.push('You\'re maintaining excellent productivity levels! 🌟');
  } else if (weeklyStats.averageScore >= 60) {
    insights.push('You\'re doing well with good productivity levels. 👍');
  } else {
    insights.push('There\'s room for improvement in your productivity. 💪');
  }
  
  // Task-specific insights
  const overdueTasks = tasks.filter(task => !task.isCompleted && isPastDate(task.dueDate));
  if (overdueTasks.length > 0) {
    insights.push(`You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. 🚨`);
  }
  
  const todayTasks = tasks.filter(task => isToday(task.dueDate));
  const completedTodayTasks = todayTasks.filter(task => task.isCompleted);
  if (todayTasks.length > 0) {
    const completionRate = (completedTodayTasks.length / todayTasks.length) * 100;
    insights.push(`Today's task completion: ${Math.round(completionRate)}% (${completedTodayTasks.length}/${todayTasks.length})`);
  }
  
  // Recommendations
  if (weeklyStats.completedTasks / Math.max(weeklyStats.totalTasks, 1) < 0.7) {
    recommendations.push('Try breaking large tasks into smaller, manageable chunks');
    recommendations.push('Set realistic daily task goals to improve completion rates');
  }
  
  if (weeklyStats.averageMedicationAdherence < 0.8) {
    recommendations.push('Consider setting additional medication reminders');
    recommendations.push('Use the medication tracking features more consistently');
  }
  
  if (overdueTasks.length > 3) {
    recommendations.push('Focus on completing overdue tasks before adding new ones');
    recommendations.push('Review your task priorities and deadlines');
  }
  
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.isCompleted);
  if (highPriorityTasks.length > 5) {
    recommendations.push('You have many high-priority tasks. Consider re-evaluating priorities');
  }
  
  // Achievements
  if (streaks.currentStreak >= 7) {
    achievements.push(`🔥 ${streaks.currentStreak}-day productivity streak!`);
  }
  
  if (streaks.longestStreak >= 14) {
    achievements.push(`🏆 Longest streak: ${streaks.longestStreak} days!`);
  }
  
  if (weeklyStats.averageScore >= 90) {
    achievements.push('🌟 Productivity Master - 90%+ average this week!');
  }
  
  if (weeklyStats.completedTasks >= 20) {
    achievements.push(`✅ Task Crusher - ${weeklyStats.completedTasks} tasks completed this week!`);
  }
  
  if (weeklyStats.averageMedicationAdherence >= 0.95) {
    achievements.push('💊 Perfect Adherence - 95%+ medication compliance!');
  }
  
  return { insights, recommendations, achievements };
};

/**
 * Generate chart data for productivity visualization
 */
export const generateChartData = (
  productivityLogs: ProductivityLog[],
  period: 'week' | 'month' = 'week'
): {
  labels: string[];
  scores: number[];
  tasks: number[];
  events: number[];
  medications: number[];
} => {
  const days = period === 'week' ? 7 : 30;
  const labels: string[] = [];
  const scores: number[] = [];
  const tasks: number[] = [];
  const events: number[] = [];
  const medications: number[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = formatDateString(date);
    
    const log = productivityLogs.find(l => l.date === dateKey);
    
    labels.push(period === 'week' ? 
      date.toLocaleDateString('en-US', { weekday: 'short' }) :
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    scores.push(log?.productivityScore || 0);
    tasks.push(log ? Math.round((log.completedTasks / Math.max(log.totalTasks, 1)) * 100) : 0);
    events.push(log ? Math.round((log.completedEvents / Math.max(log.totalEvents, 1)) * 100) : 0);
    medications.push(log ? Math.round(log.medicationAdherence * 100) : 100);
  }
  
  return { labels, scores, tasks, events, medications };
};

/**
 * Calculate category-wise task completion rates
 */
export const calculateCategoryStats = (
  tasks: Task[],
  period: 'week' | 'month' = 'week'
): Record<string, { completed: number; total: number; percentage: number }> => {
  const days = period === 'week' ? 7 : 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const periodTasks = tasks.filter(task => task.dueDate >= cutoffDate);
  const categoryStats: Record<string, { completed: number; total: number; percentage: number }> = {};
  
  periodTasks.forEach(task => {
    if (!categoryStats[task.category]) {
      categoryStats[task.category] = { completed: 0, total: 0, percentage: 0 };
    }
    
    categoryStats[task.category].total++;
    if (task.isCompleted) {
      categoryStats[task.category].completed++;
    }
  });
  
  // Calculate percentages
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  });
  
  return categoryStats;
};