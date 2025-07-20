import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTimetable } from '../context/TimetableContext';
import { useApp } from '../context/AppContext';
import TimetableCard from '../components/TimetableCard';
import AddEventModal from '../components/AddEventModal';
import { TimetableEvent } from '../types';
import { formatDateString, isToday, isPastDate } from '../utils/helpers';

const TimetableScreen: React.FC = () => {
  const { state, getEventsForSelectedDate, setSelectedDate, deleteEvent } = useTimetable();
  const { state: appState } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimetableEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDateEvents = getEventsForSelectedDate();
  const isSelectedDateToday = isToday(state.selectedDate);
  const isSelectedDatePast = isPastDate(state.selectedDate);

  // Generate time slots for the timeline (24 hours)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour === 0 ? '12:00 AM' : 
                    hour < 12 ? `${hour}:00 AM` : 
                    hour === 12 ? '12:00 PM' : 
                    `${hour - 12}:00 PM`,
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Navigation functions
  const goToPreviousDay = () => {
    const previousDay = new Date(state.selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(state.selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Event handlers
  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const handleEditEvent = (event: TimetableEvent) => {
    setEditingEvent(event);
    setShowAddModal(true);
  };

  const handleDeleteEvent = (event: TimetableEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEvent(event.id),
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic would go here
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    return selectedDateEvents.filter(event => {
      const eventHour = event.startTime.getHours();
      const eventEndHour = Math.ceil((event.startTime.getHours() * 60 + event.startTime.getMinutes() + event.duration) / 60);
      return hour >= eventHour && hour < eventEndHour;
    });
  };

  // Calculate total scheduled time
  const totalScheduledMinutes = selectedDateEvents.reduce((total, event) => total + event.duration, 0);
  const totalScheduledHours = Math.floor(totalScheduledMinutes / 60);
  const remainingMinutes = totalScheduledMinutes % 60;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={goToToday} style={styles.dateButton}>
            <Text style={styles.dateText}>
              {formatDateString(state.selectedDate)}
            </Text>
            {isSelectedDateToday && <Text style={styles.todayIndicator}>Today</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{selectedDateEvents.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {totalScheduledHours}h {remainingMinutes}m
          </Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        {state.conflicts.length > 0 && (
          <View style={[styles.statItem, styles.conflictStat]}>
            <Text style={[styles.statNumber, styles.conflictNumber]}>
              {state.conflicts.length}
            </Text>
            <Text style={[styles.statLabel, styles.conflictLabel]}>Conflicts</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {timeSlots.map((slot) => {
          const hourEvents = getEventsForHour(slot.hour);
          const isWorkingHour = 
            slot.hour >= parseInt(appState.preferences.workingHours.start.split(':')[0]) &&
            slot.hour < parseInt(appState.preferences.workingHours.end.split(':')[0]);

          return (
            <View key={slot.hour} style={styles.timeSlot}>
              <View style={styles.timeColumn}>
                <Text style={[
                  styles.timeText,
                  isWorkingHour && styles.workingHourText
                ]}>
                  {slot.displayTime}
                </Text>
              </View>
              
              <View style={[
                styles.eventColumn,
                isWorkingHour && styles.workingHourColumn
              ]}>
                {hourEvents.length > 0 ? (
                  hourEvents.map((event) => (
                    <TimetableCard
                      key={event.id}
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      isConflicted={state.conflicts.some(c => c.id === event.id)}
                      isPast={isSelectedDatePast}
                    />
                  ))
                ) : (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={handleAddEvent}
                    disabled={isSelectedDatePast}
                  >
                    <Text style={styles.emptySlotText}>
                      {isSelectedDatePast ? '' : 'Tap to add event'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add/Edit Event Modal */}
      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingEvent={editingEvent}
        selectedDate={state.selectedDate}
      />

      {/* Loading indicator */}
      {state.loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#495057',
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  todayIndicator: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  conflictStat: {
    marginLeft: 'auto',
  },
  conflictNumber: {
    color: '#dc3545',
  },
  conflictLabel: {
    color: '#dc3545',
  },
  timeline: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  timeColumn: {
    width: 80,
    paddingTop: 8,
    paddingLeft: 16,
    backgroundColor: '#ffffff',
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  workingHourText: {
    color: '#495057',
    fontWeight: '600',
  },
  eventColumn: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  workingHourColumn: {
    backgroundColor: '#f8f9fa',
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TimetableScreen;