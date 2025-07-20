import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTasks, TaskFilter, TaskSortOption } from '../context/TasksContext';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';
import { Task } from '../types';
import { searchTasks } from '../utils/taskUtils';

const TasksScreen: React.FC = () => {
  const {
    state,
    getFilteredAndSortedTasks,
    setFilter,
    setSortBy,
    deleteTask,
    toggleTaskCompletion,
    getTaskStats,
  } = useTasks();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredTasks = getFilteredAndSortedTasks();
  const searchedTasks = searchTasks(filteredTasks, searchQuery);
  const stats = getTaskStats();

  // Filter options
  const filterOptions: { value: TaskFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'pending', label: 'Pending', count: stats.pending },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'overdue', label: 'Overdue', count: stats.overdue },
    { value: 'today', label: 'Today', count: stats.today },
    { value: 'high', label: 'High Priority', count: stats.highPriority },
  ];

  // Sort options
  const sortOptions: { value: TaskSortOption; label: string }[] = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'created', label: 'Created' },
  ];

  // Event handlers
  const handleAddTask = () => {
    setEditingTask(null);
    setShowAddModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddModal(true);
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(task.id),
        },
      ]
    );
  };

  const handleToggleCompletion = async (task: Task) => {
    await toggleTaskCompletion(task.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic would go here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleFilterSelect = (filter: TaskFilter) => {
    setFilter(filter);
    setShowFilters(false);
  };

  const handleSortSelect = (sort: TaskSortOption) => {
    setSortBy(sort);
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onEdit={handleEditTask}
      onDelete={handleDeleteTask}
      onToggleCompletion={handleToggleCompletion}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {searchQuery ? 'No tasks found' : 'No tasks yet'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery
          ? 'Try adjusting your search or filters'
          : 'Tap the + button to add your first task'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity onPress={handleAddTask} style={styles.emptyStateButton}>
          <Text style={styles.emptyStateButtonText}>Add Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={[styles.statItem, styles.overdueStatItem]}>
            <Text style={[styles.statNumber, styles.overdueStatNumber]}>
              {stats.overdue}
            </Text>
            <Text style={[styles.statLabel, styles.overdueStatLabel]}>Overdue</Text>
          </View>
        )}
        {stats.highPriority > 0 && (
          <View style={[styles.statItem, styles.highPriorityStatItem]}>
            <Text style={[styles.statNumber, styles.highPriorityStatNumber]}>
              {stats.highPriority}
            </Text>
            <Text style={[styles.statLabel, styles.highPriorityStatLabel]}>High Priority</Text>
          </View>
        )}
      </View>

      {/* Filter and Sort Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.controlButton, showFilters && styles.activeControlButton]}
        >
          <Text style={[styles.controlButtonText, showFilters && styles.activeControlButtonText]}>
            Filter: {filterOptions.find(f => f.value === state.filter)?.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            const currentIndex = sortOptions.findIndex(s => s.value === state.sortBy);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            handleSortSelect(sortOptions[nextIndex].value);
          }}
          style={styles.controlButton}
        >
          <Text style={styles.controlButtonText}>
            Sort: {sortOptions.find(s => s.value === state.sortBy)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filterContainer}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleFilterSelect(option.value)}
              style={[
                styles.filterOption,
                state.filter === option.value && styles.activeFilterOption,
              ]}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  state.filter === option.value && styles.activeFilterOptionText,
                ]}
              >
                {option.label}
                {option.count !== undefined && ` (${option.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>Tasks</Text>
        <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={searchedTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={searchedTasks.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Add/Edit Task Modal */}
      <AddTaskModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingTask={editingTask}
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
  topHeader: {
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
  header: {
    backgroundColor: '#ffffff',
    paddingBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  overdueStatItem: {
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueStatNumber: {
    color: '#dc3545',
  },
  overdueStatLabel: {
    color: '#dc3545',
  },
  highPriorityStatItem: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highPriorityStatNumber: {
    color: '#856404',
  },
  highPriorityStatLabel: {
    color: '#856404',
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeControlButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    fontWeight: '500',
  },
  activeControlButtonText: {
    color: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterOption: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeFilterOption: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  activeFilterOptionText: {
    color: '#ffffff',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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

export default TasksScreen;