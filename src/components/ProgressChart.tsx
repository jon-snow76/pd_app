import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface ProgressChartProps {
  data: {
    labels: string[];
    scores: number[];
    tasks: number[];
    events: number[];
    medications: number[];
  };
  width: number;
  height: number;
  period: 'week' | 'month';
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  width,
  height,
  period,
}) => {
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007bff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e9ecef',
      strokeWidth: 1,
    },
  };

  const lineChartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.scores,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const barChartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.tasks,
        color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
      },
    ],
  };

  const multiLineData = {
    labels: data.labels,
    datasets: [
      {
        data: data.scores,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.tasks,
        color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.medications,
        color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Overall Score', 'Task Completion', 'Medication Adherence'],
  };

  const renderSimpleChart = () => {
    if (data.scores.every(score => score === 0)) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSubtext}>
            Complete some tasks and events to see your progress
          </Text>
        </View>
      );
    }

    const maxScore = Math.max(...data.scores, 100);
    
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.chartTitle}>Progress Score</Text>
        <View style={styles.barsContainer}>
          {data.labels.map((label, index) => (
            <View key={index} style={styles.barGroup}>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (data.scores[index] / maxScore) * (height - 80),
                      backgroundColor: '#007bff'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
              <Text style={styles.barValue}>{data.scores[index]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDetailedChart = () => {
    if (data.scores.every(score => score === 0)) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSubtext}>
            Complete some tasks and events to see your progress
          </Text>
        </View>
      );
    }

    const maxValue = Math.max(
      ...data.scores, 
      ...data.tasks, 
      ...data.medications, 
      100
    );

    return (
      <View>
        <View style={[styles.chartContainer, { width, height }]}>
          <Text style={styles.chartTitle}>Detailed Progress</Text>
          <View style={styles.barsContainer}>
            {data.labels.map((label, index) => (
              <View key={index} style={styles.barGroup}>
                <View style={styles.multiBarContainer}>
                  <View 
                    style={[
                      styles.multiBar, 
                      { 
                        height: (data.scores[index] / maxValue) * (height - 100),
                        backgroundColor: '#007bff'
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.multiBar, 
                      { 
                        height: (data.tasks[index] / maxValue) * (height - 100),
                        backgroundColor: '#28a745'
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.multiBar, 
                      { 
                        height: (data.medications[index] / maxValue) * (height - 100),
                        backgroundColor: '#ffc107'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#007bff' }]} />
            <Text style={styles.legendText}>Overall Score</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#28a745' }]} />
            <Text style={styles.legendText}>Tasks</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ffc107' }]} />
            <Text style={styles.legendText}>Medications</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {period === 'week' ? renderSimpleChart() : renderDetailedChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  multiBarContainer: {
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 2,
  },
  multiBar: {
    width: 8,
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 2,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
});

export default ProgressChart;