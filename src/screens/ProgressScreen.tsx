import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useTimetable } from '../context/TimetableContext';
import { useTasks } from '../context/TasksContext';
import { useMedication } from '../context/MedicationContext';
import ProgressChart from '../components/ProgressChart';
import { ProductivityLog } from '../types';
import {
  generateProductivityLog,
  calculateWeeklyStats,
  calculateMonthlyStats,
  getProductivityInsights,
  generateChartData,
  calculateCategoryStats,
} from '../utils/progressUtils';
import {
  loadProductivityLogs,
  addProductivityLog,
  getProductivityLogForDate,
} from '../utils/storage';
import { formatDateString } from '../utils/helpers';

const { width } = Dimensions.get('window');

const ProgressScreen: React.FC = () => {
  const { state: timetableState } = useTimetable();
  const { state: tasksState } = useTasks();
  const { state: medicationState } = useMedication();
  
  const [productivityLogs, setProductivityLogs] = useState<ProductivityLog[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  // Generate today's productivity log when data changes
  useEffect(() => {
    generateTodaysLog();
  }, [timetableState.events, tasksState.tasks, medicationState.medications]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const logs = await loadProductivityLogs();
      setProductivityLogs(logs);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTodaysLog = async () => {
    try {
      const today = new Date();
      const todayLog = generateProductivityLog(
        tasksState.tasks,
        timetableState.events,
        medicationState.medications,
        today
      );

      // Check if today's log already exists
      const existingLog = await getProductivityLogForDate(formatDateString(today));
      
      if (!existingLog || existingLog.productivityScore !== todayLog.productivityScore) {
        await addProductivityLog(todayLog);
        
        // Update local state
        setProductivityLogs(prev => {
          const filtered = prev.filter(log => log.date !== todayLog.date);
          return [...filtered, todayLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      }
    } catch (error) {
      console.error('Error generating today\'s log:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    await generateTodaysLog();
    setRefreshing(false);
  };

  const weeklyStats = calculateWeeklyStats(productivityLogs);
  const monthlyStats = calculateMonthlyStats(productivityLogs, new Date().getMonth(), new Date().getFullYear());
  const insights = getProductivityInsights(
    tasksState.tasks,
    timetableState.events,
    medicationState.medications,
    productivityLogs
  );
  const chartData = generateChartData(productivityLogs, selectedPeriod);
  const categoryStats = calculateCategoryStats(tasksState.tasks, selectedPeriod);

  const currentStats = selectedPeriod === 'week' ? weeklyStats : monthlyStats;

  const renderStatsCard = (title: string, value: string | number, subtitle?: string, color: string = '#007bff') => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderInsightCard = (title: string, items: string[], icon: string, color: string) => (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{icon}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
      {items.length > 0 ? (
        items.map((item, index) => (
          <Text key={index} style={[styles.insightText, { color }]}>
            • {item}
          </Text>
        ))
      ) : (
        <Text style={styles.noInsightText}>No {title.toLowerCase()} at the moment</Text>
      )}
    </View>
  );

  const renderCategoryStats = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.sectionTitle}>Task Categories</Text>
      {Object.entries(categoryStats).map(([category, stats]) => (
        <View key={category} style={styles.categoryItem}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            <Text style={styles.categoryPercentage}>{stats.percentage}%</Text>
          </View>
          <View style={styles.categoryBar}>
            <View 
              style={[
                styles.categoryProgress, 
                { width: `${stats.percentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.categoryDetails}>
            {stats.completed}/{stats.total} completed
          </Text>
        </View>
      ))}
    </View>
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#28a745';
      case 'declining': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Progress</Text>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'week' && styles.activePeriodButton,
            ]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'week' && styles.activePeriodButtonText,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.activePeriodButton,
            ]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'month' && styles.activePeriodButtonText,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Stats */}
      <View style={styles.mainStatsContainer}>
        {renderStatsCard(
          'Average Score',
          `${currentStats.averageScore}%`,
          `${getTrendIcon(currentStats.trend)} ${currentStats.trend}`,
          getTrendColor(currentStats.trend)
        )}
        {renderStatsCard(
          'Tasks Completed',
          `${currentStats.completedTasks}/${currentStats.totalTasks}`,
          currentStats.totalTasks > 0 ? 
            `${Math.round((currentStats.completedTasks / currentStats.totalTasks) * 100)}% completion` : 
            'No tasks',
          '#28a745'
        )}
      </View>

      <View style={styles.mainStatsContainer}>
        {renderStatsCard(
          'Events Attended',
          `${currentStats.completedEvents}/${currentStats.totalEvents}`,
          currentStats.totalEvents > 0 ? 
            `${Math.round((currentStats.completedEvents / currentStats.totalEvents) * 100)}% attendance` : 
            'No events',
          '#17a2b8'
        )}
        {renderStatsCard(
          'Medication Adherence',
          `${Math.round(currentStats.averageMedicationAdherence * 100)}%`,
          'Average compliance',
          '#ffc107'
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Productivity Trend</Text>
        <ProgressChart
          data={chartData}
          width={width - 32}
          height={220}
          period={selectedPeriod}
        />
      </View>

      {/* Streaks (for monthly view) */}
      {selectedPeriod === 'month' && monthlyStats.streaks && (
        <View style={styles.streaksContainer}>
          <Text style={styles.sectionTitle}>Productivity Streaks</Text>
          <View style={styles.streaksRow}>
            {renderStatsCard(
              'Current Streak',
              `${monthlyStats.streaks.currentStreak}`,
              'days',
              '#ff6b6b'
            )}
            {renderStatsCard(
              'Longest Streak',
              `${monthlyStats.streaks.longestStreak}`,
              'days',
              '#4ecdc4'
            )}
          </View>
        </View>
      )}

      {/* Best/Worst Days (for monthly view) */}
      {selectedPeriod === 'month' && monthlyStats.bestDay && monthlyStats.worstDay && (
        <View style={styles.bestWorstContainer}>
          <Text style={styles.sectionTitle}>Best & Worst Days</Text>
          <View style={styles.bestWorstRow}>
            {renderStatsCard(
              'Best Day',
              `${monthlyStats.bestDay.score}%`,
              new Date(monthlyStats.bestDay.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              '#28a745'
            )}
            {renderStatsCard(
              'Worst Day',
              `${monthlyStats.worstDay.score}%`,
              new Date(monthlyStats.worstDay.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              '#dc3545'
            )}
          </View>
        </View>
      )}

      {/* Category Stats */}
      {Object.keys(categoryStats).length > 0 && renderCategoryStats()}

      {/* Insights */}
      {renderInsightCard('Insights', insights.insights, '💡', '#007bff')}

      {/* Recommendations */}
      {renderInsightCard('Recommendations', insights.recommendations, '🎯', '#28a745')}

      {/* Achievements */}
      {renderInsightCard('Achievements', insights.achievements, '🏆', '#ffc107')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: '#007bff',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activePeriodButtonText: {
    color: '#ffffff',
  },
  mainStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 11,
    color: '#6c757d',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  streaksContainer: {
    paddingHorizontal: 16,
  },
  streaksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bestWorstContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginBottom: 4,
  },
  categoryProgress: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 3,
  },
  categoryDetails: {
    fontSize: 12,
    color: '#6c757d',
  },
  insightCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  noInsightText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default ProgressScreen;