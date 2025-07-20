import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useTimetable } from '../context/TimetableContext';
import { useApp } from '../context/AppContext';
import { TimetableEvent } from '../types';
import { createDefaultTimetableEvent, formatTimeString } from '../utils/helpers';

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  editingEvent?: TimetableEvent | null;
  selectedDate: Date;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  visible,
  onClose,
  editingEvent,
  selectedDate,
}) => {
  const { addEvent, updateEvent, state } = useTimetable();
  const { state: appState } = useApp();
  
  const [formData, setFormData] = useState(() => createDefaultTimetableEvent());
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize form data when modal opens or editing event changes
  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        setFormData({
          title: editingEvent.title,
          description: editingEvent.description || '',
          startTime: editingEvent.startTime,
          duration: editingEvent.duration,
          category: editingEvent.category,
          isRecurring: editingEvent.isRecurring,
          recurrencePattern: editingEvent.recurrencePattern,
          notificationEnabled: editingEvent.notificationEnabled,
        });
      } else {
        // Set default start time to next available hour
        const defaultStartTime = new Date(selectedDate);
        const currentHour = new Date().getHours();
        const nextHour = currentHour + 1;
        defaultStartTime.setHours(nextHour, 0, 0, 0);
        
        setFormData({
          ...createDefaultTimetableEvent(),
          startTime: defaultStartTime,
          duration: appState.preferences.defaultEventDuration,
        });
      }
      setErrors([]);
    }
  }, [visible, editingEvent, selectedDate, appState.preferences.defaultEventDuration]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleTimeChange = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newStartTime = new Date(formData.startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    handleInputChange('startTime', newStartTime);
  };

  const handleDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    const newStartTime = new Date(formData.startTime);
    newStartTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    handleInputChange('startTime', newStartTime);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors([]);

    try {
      let result;
      
      if (editingEvent) {
        result = await updateEvent({
          ...editingEvent,
          ...formData,
        });
      } else {
        result = await addEvent(formData);
      }

      if (result.isValid) {
        onClose();
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors(['An unexpected error occurred']);
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]
    );
  };

  const categories = [
    { value: 'work', label: 'Work', color: '#007bff' },
    { value: 'personal', label: 'Personal', color: '#28a745' },
    { value: 'health', label: 'Health', color: '#dc3545' },
    { value: 'other', label: 'Other', color: '#6c757d' },
  ];

  const durations = [15, 30, 45, 60, 90, 120, 180, 240];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {editingEvent ? 'Edit Event' : 'Add Event'}
          </Text>
          
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.saveButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error messages */}
        {errors.length > 0 && (
          <View style={styles.errorContainer}>
            {errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {/* Conflicts warning */}
        {state.conflicts.length > 0 && (
          <View style={styles.conflictContainer}>
            <Text style={styles.conflictText}>
              ⚠️ This event conflicts with {state.conflicts.length} existing event(s)
            </Text>
          </View>
        )}

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="Enter event title"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter event description (optional)"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.startTime.toISOString().split('T')[0]}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* Time */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Time *</Text>
            <TextInput
              style={styles.textInput}
              value={formatTimeString(formData.startTime)}
              onChangeText={handleTimeChange}
              placeholder="HH:MM"
            />
          </View>

          {/* Duration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.durationContainer}>
                {durations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      formData.duration === duration && styles.selectedDurationButton,
                    ]}
                    onPress={() => handleInputChange('duration', duration)}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        formData.duration === duration && styles.selectedDurationButtonText,
                      ]}
                    >
                      {duration}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryButton,
                    formData.category === category.value && {
                      backgroundColor: category.color,
                    },
                  ]}
                  onPress={() => handleInputChange('category', category.value)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      formData.category === category.value && styles.selectedCategoryButtonText,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Enable Notifications</Text>
              <Switch
                value={formData.notificationEnabled}
                onValueChange={(value) => handleInputChange('notificationEnabled', value)}
                trackColor={{ false: '#e9ecef', true: '#007bff' }}
                thumbColor={formData.notificationEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Recurring */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Recurring Event</Text>
              <Switch
                value={formData.isRecurring}
                onValueChange={(value) => handleInputChange('isRecurring', value)}
                trackColor={{ false: '#e9ecef', true: '#007bff' }}
                thumbColor={formData.isRecurring ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Recurrence Pattern (if recurring) */}
          {formData.isRecurring && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Repeat</Text>
              <View style={styles.recurrenceContainer}>
                {['daily', 'weekly'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.recurrenceButton,
                      formData.recurrencePattern?.type === type && styles.selectedRecurrenceButton,
                    ]}
                    onPress={() => handleInputChange('recurrencePattern', {
                      type,
                      interval: 1,
                    })}
                  >
                    <Text
                      style={[
                        styles.recurrenceButtonText,
                        formData.recurrencePattern?.type === type && styles.selectedRecurrenceButtonText,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
  conflictContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  conflictText: {
    color: '#856404',
    fontSize: 14,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  durationContainer: {
    flexDirection: 'row',
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedDurationButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  durationButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedDurationButtonText: {
    color: '#ffffff',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurrenceContainer: {
    flexDirection: 'row',
  },
  recurrenceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedRecurrenceButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  recurrenceButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedRecurrenceButtonText: {
    color: '#ffffff',
  },
});

export default AddEventModal;