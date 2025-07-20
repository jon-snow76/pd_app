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
import { useTasks } from '../context/TasksContext';
import { Task } from '../types';
import { createDefaultTask, formatDateString } from '../utils/helpers';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  editingTask?: Task | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  editingTask,
}) => {
  const { addTask, updateTask, state } = useTasks();
  
  const [formData, setFormData] = useState(() => createDefaultTask());
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize form data when modal opens or editing task changes
  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setFormData({
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
          isCompleted: editingTask.isCompleted,
          category: editingTask.category,
          estimatedDuration: editingTask.estimatedDuration,
        });
      } else {
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        setFormData({
          ...createDefaultTask(),
          dueDate: tomorrow,
        });
      }
      setErrors([]);
    }
  }, [visible, editingTask]);

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

  const handleDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    if (!isNaN(newDate.getTime())) {
      handleInputChange('dueDate', newDate);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors([]);

    try {
      let result;
      
      if (editingTask) {
        result = await updateTask({
          ...editingTask,
          ...formData,
        });
      } else {
        result = await addTask(formData);
      }

      if (result.isValid) {
        onClose();
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors(['An unexpected error occurred']);
      console.error('Error saving task:', error);
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

  const priorities = [
    { value: 'high', label: 'High', color: '#dc3545' },
    { value: 'medium', label: 'Medium', color: '#ffc107' },
    { value: 'low', label: 'Low', color: '#28a745' },
  ];

  const categories = [
    'work',
    'personal',
    'health',
    'shopping',
    'finance',
    'education',
    'other',
  ];

  const durations = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360];

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
            {editingTask ? 'Edit Task' : 'Add Task'}
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

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="Enter task title"
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
              placeholder="Enter task description (optional)"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Due Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date *</Text>
            <TextInput
              style={styles.textInput}
              value={formatDateString(formData.dueDate)}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority *</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((priority) => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityButton,
                    formData.priority === priority.value && {
                      backgroundColor: priority.color,
                    },
                  ]}
                  onPress={() => handleInputChange('priority', priority.value)}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      formData.priority === priority.value && styles.selectedPriorityButtonText,
                    ]}
                  >
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      formData.category === category && styles.selectedCategoryButton,
                    ]}
                    onPress={() => handleInputChange('category', category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === category && styles.selectedCategoryButtonText,
                      ]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Estimated Duration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Estimated Duration (minutes)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    !formData.estimatedDuration && styles.selectedDurationButton,
                  ]}
                  onPress={() => handleInputChange('estimatedDuration', undefined)}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      !formData.estimatedDuration && styles.selectedDurationButtonText,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                
                {durations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      formData.estimatedDuration === duration && styles.selectedDurationButton,
                    ]}
                    onPress={() => handleInputChange('estimatedDuration', duration)}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        formData.estimatedDuration === duration && styles.selectedDurationButtonText,
                      ]}
                    >
                      {duration}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Completion Status (only when editing) */}
          {editingTask && (
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Mark as Completed</Text>
                <Switch
                  value={formData.isCompleted}
                  onValueChange={(value) => handleInputChange('isCompleted', value)}
                  trackColor={{ false: '#e9ecef', true: '#28a745' }}
                  thumbColor={formData.isCompleted ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>
          )}

          {/* Custom Category Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Category</Text>
            <TextInput
              style={styles.textInput}
              value={formData.category}
              onChangeText={(text) => handleInputChange('category', text.toLowerCase())}
              placeholder="Enter custom category"
              maxLength={50}
            />
            <Text style={styles.helperText}>
              You can enter a custom category or select from the options above
            </Text>
          </View>
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
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedPriorityButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCategoryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default AddTaskModal;