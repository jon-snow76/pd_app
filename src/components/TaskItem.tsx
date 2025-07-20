import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Task } from '../types';
import { formatDateString, isPastDate, isToday } from '../utils/helpers';
import { isTaskDueSoon } from '../utils/taskUtils';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleCompletion: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  onDelete,
  onToggleCompletion,
}) => {
  const [swipeX] = useState(new Animated.Value(0));
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  const isOverdue = !task.isCompleted && isPastDate(task.dueDate);
  const isDueToday = isToday(task.dueDate);
  const isDueSoon = isTaskDueSoon(task, 48); // 48 hours threshold

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getPriorityBackgroundColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#fff5f5';
      case 'medium':
        return '#fffbf0';
      case 'low':
        return '#f0fff4';
      default:
        return '#f8f9fa';
    }
  };

  const formatDueDate = (date: Date) => {
    if (isToday(date)) {
      return 'Today';
    }
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (formatDateString(date) === formatDateString(tomorrow)) {
      return 'Tomorrow';
    }
    
    return formatDateString(date);
  };

  const handlePress = () => {
    if (isSwipeActive) {
      resetSwipe();
      return;
    }
    onEdit(task);
  };

  const handleLongPress = () => {
    Alert.alert(
      task.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => onEdit(task) },
        { 
          text: task.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
          onPress: () => onToggleCompletion(task)
        },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(task) },
      ]
    );
  };

  const handleTogglePress = () => {
    onToggleCompletion(task);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: swipeX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (Math.abs(translationX) > 100) {
        // Swipe threshold reached
        if (translationX > 0) {
          // Swipe right - complete task
          onToggleCompletion(task);
        } else {
          // Swipe left - delete task
          onDelete(task);
        }
        resetSwipe();
      } else {
        // Return to original position
        resetSwipe();
      }
    } else if (event.nativeEvent.state === State.ACTIVE) {
      setIsSwipeActive(true);
    }
  };

  const resetSwipe = () => {
    Animated.spring(swipeX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
    setIsSwipeActive(false);
  };

  const renderSwipeActions = () => (
    <View style={styles.swipeActionsContainer}>
      <View style={styles.swipeActionLeft}>
        <Text style={styles.swipeActionText}>
          {task.isCompleted ? 'Incomplete' : 'Complete'}
        </Text>
      </View>
      <View style={styles.swipeActionRight}>
        <Text style={styles.swipeActionText}>Delete</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSwipeActions()}
      
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.taskContainer,
            {
              backgroundColor: getPriorityBackgroundColor(task.priority),
              transform: [{ translateX: swipeX }],
            },
            task.isCompleted && styles.completedTask,
            isOverdue && styles.overdueTask,
          ]}
        >
          {/* Priority Indicator */}
          <View
            style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(task.priority) },
            ]}
          />

          {/* Completion Toggle */}
          <TouchableOpacity
            onPress={handleTogglePress}
            style={styles.toggleButton}
          >
            <View
              style={[
                styles.checkbox,
                task.isCompleted && styles.checkedBox,
              ]}
            >
              {task.isCompleted && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Task Content */}
          <TouchableOpacity
            style={styles.content}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
          >
            <View style={styles.header}>
              <Text
                style={[
                  styles.title,
                  task.isCompleted && styles.completedTitle,
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              
              <View style={styles.badges}>
                {isOverdue && (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueBadgeText}>Overdue</Text>
                  </View>
                )}
                
                {isDueToday && !isOverdue && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                )}
                
                {isDueSoon && !isDueToday && !isOverdue && (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonBadgeText}>Soon</Text>
                  </View>
                )}
              </View>
            </View>

            {task.description && (
              <Text
                style={[
                  styles.description,
                  task.isCompleted && styles.completedText,
                ]}
                numberOfLines={2}
              >
                {task.description}
              </Text>
            )}

            <View style={styles.footer}>
              <View style={styles.leftFooter}>
                <Text
                  style={[
                    styles.dueDate,
                    task.isCompleted && styles.completedText,
                    isOverdue && styles.overdueText,
                    isDueToday && styles.todayText,
                  ]}
                >
                  Due: {formatDueDate(task.dueDate)}
                </Text>
                
                <Text
                  style={[
                    styles.category,
                    task.isCompleted && styles.completedText,
                  ]}
                >
                  {task.category}
                </Text>
              </View>

              <View style={styles.rightFooter}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(task.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
                
                {task.estimatedDuration && (
                  <Text
                    style={[
                      styles.duration,
                      task.isCompleted && styles.completedText,
                    ]}
                  >
                    {task.estimatedDuration}m
                  </Text>
                )}
              </View>
            </View>

            {task.completedAt && (
              <Text style={styles.completedAt}>
                Completed: {formatDateString(task.completedAt)}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    position: 'relative',
  },
  swipeActionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeActionLeft: {
    flex: 1,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionRight: {
    flex: 1,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  taskContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completedTask: {
    opacity: 0.7,
  },
  overdueTask: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  priorityIndicator: {
    width: 4,
  },
  toggleButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ced4da',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkedBox: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginRight: 8,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  overdueBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  todayBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  soonBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soonBadgeText: {
    color: '#212529',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 12,
  },
  completedText: {
    color: '#adb5bd',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  leftFooter: {
    flex: 1,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDate: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
    marginBottom: 2,
  },
  overdueText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  todayText: {
    color: '#007bff',
    fontWeight: '600',
  },
  category: {
    fontSize: 11,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  duration: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  completedAt: {
    fontSize: 11,
    color: '#28a745',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default TaskItem;