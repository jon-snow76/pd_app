import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TimetableEvent } from '../types';
import { formatTimeString } from '../utils/helpers';

interface TimetableCardProps {
  event: TimetableEvent;
  onEdit: (event: TimetableEvent) => void;
  onDelete: (event: TimetableEvent) => void;
  isConflicted?: boolean;
  isPast?: boolean;
}

const TimetableCard: React.FC<TimetableCardProps> = ({
  event,
  onEdit,
  onDelete,
  isConflicted = false,
  isPast = false,
}) => {
  const startTime = formatTimeString(event.startTime);
  const endTime = new Date(event.startTime.getTime() + event.duration * 60000);
  const endTimeString = formatTimeString(endTime);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'work':
        return '#007bff';
      case 'personal':
        return '#28a745';
      case 'health':
        return '#dc3545';
      case 'other':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getCategoryBackgroundColor = (category: string) => {
    switch (category) {
      case 'work':
        return '#e3f2fd';
      case 'personal':
        return '#e8f5e8';
      case 'health':
        return '#ffebee';
      case 'other':
        return '#f8f9fa';
      default:
        return '#f8f9fa';
    }
  };

  const handleLongPress = () => {
    if (isPast) return;

    Alert.alert(
      event.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => onEdit(event) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(event) },
      ]
    );
  };

  const handlePress = () => {
    if (!isPast) {
      onEdit(event);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: getCategoryBackgroundColor(event.category) },
        isConflicted && styles.conflictedContainer,
        isPast && styles.pastContainer,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={isPast}
      activeOpacity={isPast ? 1 : 0.7}
    >
      {/* Category indicator */}
      <View
        style={[
          styles.categoryIndicator,
          { backgroundColor: getCategoryColor(event.category) },
        ]}
      />

      {/* Event content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              isPast && styles.pastText,
              isConflicted && styles.conflictedText,
            ]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          
          {event.isRecurring && (
            <View style={styles.recurringBadge}>
              <Text style={styles.recurringText}>↻</Text>
            </View>
          )}
          
          {event.notificationEnabled && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>🔔</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.timeText,
            isPast && styles.pastText,
          ]}
        >
          {startTime} - {endTimeString} ({event.duration}m)
        </Text>

        {event.description && (
          <Text
            style={[
              styles.description,
              isPast && styles.pastText,
            ]}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        )}

        <View style={styles.footer}>
          <Text
            style={[
              styles.category,
              { color: getCategoryColor(event.category) },
              isPast && styles.pastText,
            ]}
          >
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </Text>

          {isConflicted && (
            <View style={styles.conflictBadge}>
              <Text style={styles.conflictBadgeText}>⚠️ Conflict</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conflictedContainer: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  pastContainer: {
    opacity: 0.6,
  },
  categoryIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  conflictedText: {
    color: '#dc3545',
  },
  pastText: {
    color: '#6c757d',
  },
  recurringBadge: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#17a2b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationBadge: {
    marginLeft: 4,
  },
  notificationText: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conflictBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conflictBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default TimetableCard;