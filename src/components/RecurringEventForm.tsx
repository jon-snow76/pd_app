import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { RecurrencePattern } from '../services/RecurringEventsService';
import { useRecurringEvents } from '../hooks/useRecurringEvents';

interface RecurringEventFormProps {
  initialPattern?: RecurrencePattern;
  onPatternChange: (pattern: RecurrencePattern | null) => void;
  style?: any;
}

const RecurringEventForm: React.FC<RecurringEventFormProps> = ({
  initialPattern,
  onPatternChange,
  style,
}) => {
  const { validateRecurrencePattern, getRecurrenceDescription } = useRecurringEvents();
  
  const [isRecurring, setIsRecurring] = useState(!!initialPattern);
  const [pattern, setPattern] = useState<RecurrencePattern>(
    initialPattern || { type: 'daily', interval: 1 }
  );
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleRecurringToggle = (value: boolean) => {
    setIsRecurring(value);
    if (value) {
      onPatternChange(pattern);
    } else {
      onPatternChange(null);
    }
  };

  const handlePatternChange = (newPattern: Partial<RecurrencePattern>) => {
    const updatedPattern = { ...pattern, ...newPattern };
    setPattern(updatedPattern);
    
    if (isRecurring) {
      if (validateRecurrencePattern(updatedPattern)) {
        onPatternChange(updatedPattern);
      } else {
        Alert.alert('Invalid Pattern', 'Please check your recurrence settings.');
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      handlePatternChange({ endDate: selectedDate });
    }
  };

  const renderRecurrenceTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Repeat</Text>
      <View style={styles.optionsGrid}>
        {[
          { type: 'daily', label: 'Daily' },
          { type: 'weekly', label: 'Weekly' },
          { type: 'monthly', label: 'Monthly' },
          { type: 'custom', label: 'Custom' },
        ].map(option => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.optionButton,
              pattern.type === option.type && styles.selectedOption,
            ]}
            onPress={() => handlePatternChange({ type: option.type as any })}>
            <Text
              style={[
                styles.optionText,
                pattern.type === option.type && styles.selectedOptionText,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderIntervalSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Every</Text>
      <View style={styles.intervalContainer}>
        <TextInput
          style={styles.intervalInput}
          value={String(pattern.interval || 1)}
          onChangeText={(text) => {
            const interval = parseInt(text) || 1;
            handlePatternChange({ interval: Math.max(1, interval) });
          }}
          keyboardType="numeric"
          maxLength={2}
        />
        <Text style={styles.intervalLabel}>
          {pattern.type === 'daily' && (pattern.interval === 1 ? 'day' : 'days')}
          {pattern.type === 'weekly' && (pattern.interval === 1 ? 'week' : 'weeks')}
          {pattern.type === 'monthly' && (pattern.interval === 1 ? 'month' : 'months')}
          {pattern.type === 'custom' && (pattern.interval === 1 ? 'day' : 'days')}
        </Text>
      </View>
    </View>
  );

  const renderEndDateSelector = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>End Date</Text>
        <Switch
          value={!!pattern.endDate}
          onValueChange={(value) => {
            if (value) {
              const endDate = new Date();
              endDate.setMonth(endDate.getMonth() + 1);
              handlePatternChange({ endDate });
            } else {
              handlePatternChange({ endDate: undefined });
            }
          }}
          trackColor={{ false: '#e9ecef', true: '#007bff' }}
          thumbColor="#ffffff"
        />
      </View>
      
      {pattern.endDate && (
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}>
          <Icon name="event" size={20} color="#007bff" />
          <Text style={styles.dateButtonText}>
            {format(pattern.endDate, 'MMM d, yyyy')}
          </Text>
          <Icon name="expand-more" size={20} color="#6c757d" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPatternSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Summary</Text>
      <Text style={styles.summaryText}>
        {getRecurrenceDescription(pattern)}
        {pattern.endDate && ` until ${format(pattern.endDate, 'MMM d, yyyy')}`}
      </Text>
    </View>
  );

  if (!isRecurring) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Recurring Event</Text>
          <Switch
            value={isRecurring}
            onValueChange={handleRecurringToggle}
            trackColor={{ false: '#e9ecef', true: '#007bff' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Recurring Event</Text>
        <Switch
          value={isRecurring}
          onValueChange={handleRecurringToggle}
          trackColor={{ false: '#e9ecef', true: '#007bff' }}
          thumbColor="#ffffff"
        />
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {renderRecurrenceTypeSelector()}
        {renderIntervalSelector()}
        {renderEndDateSelector()}
        {renderPatternSummary()}
      </ScrollView>

      {showEndDatePicker && (
        <DateTimePicker
          value={pattern.endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  formContainer: {
    maxHeight: 300,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
  },
  selectedOption: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  intervalLabel: {
    fontSize: 16,
    color: '#495057',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 22,
  },
});

export default RecurringEventForm;