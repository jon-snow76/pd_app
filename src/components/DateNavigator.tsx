import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { useDateNavigation } from '../hooks/useDateNavigation';

interface DateNavigatorProps {
  showCalendar?: boolean;
  showRelativeDate?: boolean;
  style?: any;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
  showCalendar = true,
  showRelativeDate = true,
  style,
}) => {
  const {
    currentDate,
    navigateToDate,
    goToNextDay,
    goToPreviousDay,
    goToToday,
    getFormattedDate,
    getRelativeDateDescription,
    isToday: isTodaySelected,
  } = useDateNavigation();

  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const handleDatePress = (date: Date) => {
    navigateToDate(date);
    setShowCalendarModal(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>
            {format(currentDate, 'MMMM yyyy')}
          </Text>
        </View>
        
        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map(day => {
            const isSelected = isSameDay(day, currentDate);
            const isTodayDate = isToday(day);
            
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDay,
                  isTodayDate && styles.todayDay,
                ]}
                onPress={() => handleDatePress(day)}>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    isTodayDate && styles.todayDayText,
                  ]}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => {
              goToToday();
              setShowCalendarModal(false);
            }}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.navigator}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPreviousDay}>
          <Icon name="chevron-left" size={24} color="#007bff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateContainer}
          onPress={showCalendar ? () => setShowCalendarModal(true) : undefined}>
          <Text style={styles.dateText}>
            {getFormattedDate('MMM d, yyyy')}
          </Text>
          {showRelativeDate && (
            <Text style={styles.relativeDateText}>
              {getRelativeDateDescription()}
            </Text>
          )}
          {showCalendar && (
            <Icon name="expand-more" size={20} color="#6c757d" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextDay}>
          <Icon name="chevron-right" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {!isTodaySelected && (
        <TouchableOpacity
          style={styles.todayChip}
          onPress={goToToday}>
          <Icon name="today" size={16} color="#007bff" />
          <Text style={styles.todayChipText}>Today</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendarModal(false)}>
                <Icon name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderCalendar()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  relativeDateText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    marginTop: 8,
  },
  todayChipText: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    padding: 4,
  },
  calendar: {
    padding: 20,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    paddingVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    margin: 1,
  },
  selectedDay: {
    backgroundColor: '#007bff',
  },
  todayDay: {
    backgroundColor: '#e3f2fd',
  },
  dayText: {
    fontSize: 14,
    color: '#212529',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  todayDayText: {
    color: '#007bff',
    fontWeight: '600',
  },
  calendarActions: {
    alignItems: 'center',
    marginTop: 20,
  },
  todayButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  todayButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DateNavigator;