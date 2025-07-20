import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import {Medication, MedicationLog} from '../types';
import {saveMedicines, loadMedicines} from '../utils/storage';
import {scheduleMedicationReminder, cancelNotificationsForItem} from '../utils/notifications';
import {useNotifications} from '../hooks/useNotifications';
import {formatDateString, formatTimeString, generateId} from '../utils/helpers';

const MedicineScreen = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00']);
  const [isActive, setIsActive] = useState(true);
  const [editingMedication, setEditingMedication] = useState<string | null>(null);
  const [showAdherenceModal, setShowAdherenceModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [missedMedications, setMissedMedications] = useState<{medication: Medication, time: string}[]>([]);
  
  // Note: cancelMedicationNotifications would be available from useNotifications hook
  // For now, we'll use the direct import from notifications utils

  useEffect(() => {
    loadData();
  }, []);

  // Check for missed medications every minute
  useEffect(() => {
    const checkMissedMedications = () => {
      const now = new Date();
      const currentTime = formatTimeString(now);
      const currentDate = getCurrentDateKey();
      
      const missed: {medication: Medication, time: string}[] = [];
      
      medications.forEach(medication => {
        if (!medication.isActive) return;
        
        medication.reminderTimes.forEach(reminderTime => {
          // Check if this time has passed by more than 30 minutes
          const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
          const reminderDate = new Date();
          reminderDate.setHours(reminderHour, reminderMinute, 0, 0);
          
          const thirtyMinutesLater = new Date(reminderDate.getTime() + 30 * 60 * 1000);
          
          if (now > thirtyMinutesLater) {
            // Check if medication was taken
            const logEntry = medication.adherenceLog.find(
              log => log.date === currentDate && log.time === reminderTime
            );
            
            if (!logEntry || !logEntry.taken) {
              missed.push({ medication, time: reminderTime });
            }
          }
        });
      });
      
      if (missed.length > 0 && missed.length !== missedMedications.length) {
        setMissedMedications(missed);
        // Schedule follow-up notifications
        missed.forEach(({ medication, time }) => {
          scheduleFollowUpReminder(medication, time);
        });
      }
    };

    const interval = setInterval(checkMissedMedications, 60000); // Check every minute
    checkMissedMedications(); // Check immediately
    
    return () => clearInterval(interval);
  }, [medications, missedMedications.length]);

  const loadData = async () => {
    const saved = await loadMedicines();
    if (saved) {
      setMedications(saved);
    }
  };

  const getCurrentDateKey = () => {
    return formatDateString(new Date());
  };

  const getCurrentTimeString = () => {
    return formatTimeString(new Date());
  };

  const scheduleFollowUpReminder = (medication: Medication, missedTime: string) => {
    // Schedule a follow-up reminder 30 minutes after the original time
    const [hour, minute] = missedTime.split(':').map(Number);
    const followUpTime = new Date();
    followUpTime.setHours(hour, minute + 30, 0, 0);
    
    // If the follow-up time is in the past, schedule for the next occurrence
    const now = new Date();
    if (followUpTime <= now) {
      followUpTime.setDate(followUpTime.getDate() + 1);
    }
    
    const followUpTimeString = formatTimeString(followUpTime);
    scheduleMedicationReminder(
      `${medication.name} (Follow-up)`,
      followUpTimeString,
      `${medication.id}_followup_${missedTime}`
    );
  };

  const handleMissedMedicationAction = (medication: Medication, time: string, action: 'taken' | 'skip') => {
    if (action === 'taken') {
      markMedicationTaken(medication.id, time, true);
    } else {
      // Mark as intentionally skipped
      markMedicationTaken(medication.id, time, false);
    }
    
    // Remove from missed list
    setMissedMedications(prev => 
      prev.filter(item => !(item.medication.id === medication.id && item.time === time))
    );
    
    // Cancel follow-up notifications
    cancelNotificationsForItem(`${medication.id}_followup_${time}`, 'medication_reminder');
  };

  const addTimeSlot = () => {
    const newTime = '09:00';
    setReminderTimes([...reminderTimes, newTime]);
  };

  const updateTimeSlot = (index: number, time: string) => {
    const updated = [...reminderTimes];
    updated[index] = time;
    setReminderTimes(updated);
  };

  const removeTimeSlot = (index: number) => {
    if (reminderTimes.length > 1) {
      const updated = reminderTimes.filter((_, i) => i !== index);
      setReminderTimes(updated);
    } else {
      Alert.alert('Error', 'At least one reminder time is required');
    }
  };

  const saveMedication = () => {
    if (!medicationName.trim() || !dosage.trim() || reminderTimes.length === 0) {
      Alert.alert('Error', 'Please fill all fields and add at least one reminder time');
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const invalidTimes = reminderTimes.filter(time => !timeRegex.test(time));
    if (invalidTimes.length > 0) {
      Alert.alert('Error', 'Please enter valid times in HH:MM format');
      return;
    }

    const medicationId = editingMedication || generateId();
    const newMedication: Medication = {
      id: medicationId,
      name: medicationName,
      dosage,
      reminderTimes: [...reminderTimes],
      isActive,
      adherenceLog: editingMedication 
        ? medications.find(med => med.id === editingMedication)?.adherenceLog || []
        : [],
    };

    const updatedMedications = editingMedication
      ? medications.map(med => med.id === editingMedication ? newMedication : med)
      : [...medications, newMedication];

    setMedications(updatedMedications);
    saveMedicines(updatedMedications);

    // Schedule notifications for each time if active
    if (isActive) {
      reminderTimes.forEach(time => {
        scheduleMedicationReminder(medicationName, time, medicationId);
      });
    }

    resetModal();
  };

  const deleteMedication = (medicationId: string) => {
    const medication = medications.find(med => med.id === medicationId);
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medication?.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Cancel all notifications for this medication
            cancelNotificationsForItem(medicationId, 'medication_reminder');
            
            // Remove from medications list
            const updated = medications.filter(med => med.id !== medicationId);
            setMedications(updated);
            saveMedicines(updated);
            
            // Remove from missed medications if present
            setMissedMedications(prev => 
              prev.filter(item => item.medication.id !== medicationId)
            );
          },
        },
      ]
    );
  };

  const markMedicationTaken = (medicationId: string, time: string, taken: boolean = true) => {
    const dateKey = getCurrentDateKey();
    const currentTime = getCurrentTimeString();
    
    const updated = medications.map(med => {
      if (med.id === medicationId) {
        // Find existing log entry for this date and time
        const existingLogIndex = med.adherenceLog.findIndex(
          log => log.date === dateKey && log.time === time
        );

        let updatedLog = [...med.adherenceLog];
        
        if (existingLogIndex >= 0) {
          // Update existing entry
          updatedLog[existingLogIndex] = {
            ...updatedLog[existingLogIndex],
            taken,
            takenAt: taken ? new Date() : undefined,
          };
        } else {
          // Add new entry
          const newLogEntry: MedicationLog = {
            date: dateKey,
            time,
            taken,
            takenAt: taken ? new Date() : undefined,
          };
          updatedLog.push(newLogEntry);
        }

        return {
          ...med,
          adherenceLog: updatedLog,
        };
      }
      return med;
    });

    setMedications(updated);
    saveMedicines(updated);

    if (taken) {
      Alert.alert('Medication Taken', `${medications.find(m => m.id === medicationId)?.name} marked as taken at ${currentTime}`);
      
      // Cancel any follow-up reminders for this medication and time
      cancelNotificationsForItem(`${medicationId}_followup_${time}`, 'medication_reminder');
      
      // Remove from missed medications if present
      setMissedMedications(prev => 
        prev.filter(item => !(item.medication.id === medicationId && item.time === time))
      );
    }
  };

  const toggleMedicationActive = (medicationId: string) => {
    const updated = medications.map(med => {
      if (med.id === medicationId) {
        const newActiveState = !med.isActive;
        
        // If activating, schedule notifications
        if (newActiveState) {
          med.reminderTimes.forEach(time => {
            scheduleMedicationReminder(med.name, time, med.id);
          });
        }
        
        return { ...med, isActive: newActiveState };
      }
      return med;
    });

    setMedications(updated);
    saveMedicines(updated);
  };

  const resetModal = () => {
    setModalVisible(false);
    setMedicationName('');
    setDosage('');
    setReminderTimes(['08:00']);
    setIsActive(true);
    setEditingMedication(null);
  };

  const openEditModal = (medication: Medication) => {
    setMedicationName(medication.name);
    setDosage(medication.dosage);
    setReminderTimes([...medication.reminderTimes]);
    setIsActive(medication.isActive);
    setEditingMedication(medication.id);
    setModalVisible(true);
  };

  const openAdherenceModal = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowAdherenceModal(true);
  };

  const getMedicationStatus = (medication: Medication) => {
    const today = getCurrentDateKey();
    const todayLogs = medication.adherenceLog.filter(log => log.date === today);
    const totalReminders = medication.reminderTimes.length;
    const takenCount = todayLogs.filter(log => log.taken).length;
    
    return {
      takenCount,
      totalReminders,
      percentage: totalReminders > 0 ? Math.round((takenCount / totalReminders) * 100) : 0,
    };
  };

  const getAdherenceStats = (medication: Medication, days: number = 7) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let totalExpected = 0;
    let totalTaken = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateString(d);
      const dayLogs = medication.adherenceLog.filter(log => log.date === dateKey);
      
      totalExpected += medication.reminderTimes.length;
      totalTaken += dayLogs.filter(log => log.taken).length;
    }
    
    return {
      totalExpected,
      totalTaken,
      percentage: totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0,
    };
  };

  const renderMedication = ({item}: {item: Medication}) => {
    const todayStatus = getMedicationStatus(item);
    const weeklyStats = getAdherenceStats(item, 7);
    
    return (
      <View style={[styles.medicationCard, !item.isActive && styles.inactiveMedicationCard]}>
        <View style={styles.medicationHeader}>
          <View style={styles.medicationInfo}>
            <Text style={[styles.medicationName, !item.isActive && styles.inactiveText]}>
              {item.name}
            </Text>
            <Text style={[styles.dosage, !item.isActive && styles.inactiveText]}>
              {item.dosage}
            </Text>
            {!item.isActive && (
              <Text style={styles.inactiveLabel}>Inactive</Text>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Today: {todayStatus.takenCount}/{todayStatus.totalReminders}
            </Text>
            <Text style={styles.percentageText}>
              {todayStatus.percentage}%
            </Text>
          </View>
        </View>

        <View style={styles.timesContainer}>
          {item.reminderTimes.map((time, index) => {
            const dateKey = getCurrentDateKey();
            const logEntry = item.adherenceLog.find(
              log => log.date === dateKey && log.time === time
            );
            const isTaken = logEntry?.taken || false;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlot,
                  isTaken && styles.timeSlotTaken,
                  !item.isActive && styles.timeSlotInactive,
                ]}
                onPress={() => item.isActive && markMedicationTaken(item.id, time, !isTaken)}
                disabled={!item.isActive}>
                <Text style={[
                  styles.timeText,
                  isTaken && styles.timeTextTaken,
                  !item.isActive && styles.inactiveText,
                ]}>
                  {time}
                </Text>
                <Text style={[styles.statusIcon, !item.isActive && styles.inactiveText]}>
                  {isTaken ? '✓' : '○'}
                </Text>
                {logEntry?.takenAt && (
                  <Text style={styles.takenAtText}>
                    {formatTimeString(logEntry.takenAt)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.adherenceStats}>
          <Text style={styles.adherenceText}>
            7-day adherence: {weeklyStats.totalTaken}/{weeklyStats.totalExpected} ({weeklyStats.percentage}%)
          </Text>
        </View>

        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={styles.adherenceButton}
            onPress={() => openAdherenceModal(item)}>
            <Text style={styles.adherenceButtonText}>View History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, item.isActive ? styles.activeButton : styles.inactiveButton]}
            onPress={() => toggleMedicationActive(item.id)}>
            <Text style={styles.toggleButtonText}>
              {item.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteMedication(item.id)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdherenceHistory = () => {
    if (!selectedMedication) return null;

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = formatDateString(date);
      
      const dayLogs = selectedMedication.adherenceLog.filter(log => log.date === dateKey);
      const expectedCount = selectedMedication.reminderTimes.length;
      const takenCount = dayLogs.filter(log => log.taken).length;
      
      last30Days.push({
        date: dateKey,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        takenCount,
        expectedCount,
        percentage: expectedCount > 0 ? Math.round((takenCount / expectedCount) * 100) : 0,
        logs: dayLogs,
      });
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAdherenceModal}
        onRequestClose={() => setShowAdherenceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.adherenceModalContent}>
            <View style={styles.adherenceModalHeader}>
              <Text style={styles.adherenceModalTitle}>
                {selectedMedication.name} - Adherence History
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAdherenceModal(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.adherenceHistoryContainer}>
              {last30Days.map((day, index) => (
                <View key={index} style={styles.adherenceDay}>
                  <View style={styles.adherenceDayHeader}>
                    <Text style={styles.adherenceDayDate}>{day.displayDate}</Text>
                    <Text style={styles.adherenceDayStats}>
                      {day.takenCount}/{day.expectedCount} ({day.percentage}%)
                    </Text>
                  </View>
                  
                  <View style={styles.adherenceDayTimes}>
                    {selectedMedication.reminderTimes.map((time, timeIndex) => {
                      const log = day.logs.find(l => l.time === time);
                      const taken = log?.taken || false;
                      
                      return (
                        <View key={timeIndex} style={styles.adherenceTimeSlot}>
                          <Text style={styles.adherenceTime}>{time}</Text>
                          <Text style={[
                            styles.adherenceStatus,
                            taken ? styles.adherenceStatusTaken : styles.adherenceStatusMissed
                          ]}>
                            {taken ? '✓' : '×'}
                          </Text>
                          {log?.takenAt && (
                            <Text style={styles.adherenceTakenAt}>
                              {formatTimeString(log.takenAt)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Medication Tracker</Text>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Add Medication</Text>
      </TouchableOpacity>

      <FlatList
        data={medications}
        renderItem={renderMedication}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No medications added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button above to add your first medication
            </Text>
          </View>
        }
      />

      {/* Add/Edit Medication Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingMedication ? 'Edit Medication' : 'Add Medication'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Medication name"
              value={medicationName}
              onChangeText={setMedicationName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Dosage (e.g., 1 tablet, 5mg)"
              value={dosage}
              onChangeText={setDosage}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active medication</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={isActive ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <Text style={styles.sectionTitle}>Reminder Times:</Text>
            <ScrollView style={styles.timesScrollView}>
              {reminderTimes.map((time, index) => (
                <View key={index} style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    value={time}
                    onChangeText={(text) => updateTimeSlot(index, text)}
                  />
                  <TouchableOpacity
                    style={styles.removeTimeButton}
                    onPress={() => removeTimeSlot(index)}>
                    <Text style={styles.removeTimeText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.addTimeButton}
              onPress={addTimeSlot}>
              <Text style={styles.addTimeText}>+ Add Reminder Time</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetModal}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveMedication}>
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Adherence History Modal */}
      {renderAdherenceHistory()}

      {/* Missed Medications Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={missedMedications.length > 0}
        onRequestClose={() => setMissedMedications([])}>
        <View style={styles.modalOverlay}>
          <View style={styles.missedModalContent}>
            <View style={styles.missedModalHeader}>
              <Text style={styles.missedModalTitle}>
                Missed Medications
              </Text>
              <Text style={styles.missedModalSubtitle}>
                You have {missedMedications.length} missed medication{missedMedications.length > 1 ? 's' : ''}
              </Text>
            </View>
            
            <ScrollView style={styles.missedMedicationsContainer}>
              {missedMedications.map((item, index) => (
                <View key={`${item.medication.id}_${item.time}`} style={styles.missedMedicationItem}>
                  <View style={styles.missedMedicationInfo}>
                    <Text style={styles.missedMedicationName}>
                      {item.medication.name}
                    </Text>
                    <Text style={styles.missedMedicationDetails}>
                      {item.medication.dosage} • Scheduled for {item.time}
                    </Text>
                    <Text style={styles.missedMedicationTime}>
                      Missed by more than 30 minutes
                    </Text>
                  </View>
                  
                  <View style={styles.missedMedicationActions}>
                    <TouchableOpacity
                      style={styles.takenLateButton}
                      onPress={() => handleMissedMedicationAction(item.medication, item.time, 'taken')}>
                      <Text style={styles.takenLateButtonText}>Taken Now</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.skipButton}
                      onPress={() => handleMissedMedicationAction(item.medication, item.time, 'skip')}>
                      <Text style={styles.skipButtonText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.dismissAllButton}
              onPress={() => setMissedMedications([])}>
              <Text style={styles.dismissAllButtonText}>Dismiss All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  medicationCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inactiveMedicationCard: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  dosage: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  inactiveLabel: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
    marginTop: 4,
  },
  inactiveText: {
    color: '#adb5bd',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#6c757d',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  timeSlot: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 60,
  },
  timeSlotTaken: {
    backgroundColor: '#28a745',
  },
  timeSlotInactive: {
    backgroundColor: '#e9ecef',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  timeTextTaken: {
    color: 'white',
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  takenAtText: {
    fontSize: 10,
    color: '#ffffff',
    marginTop: 2,
  },
  adherenceStats: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  adherenceText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  medicationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  adherenceButton: {
    backgroundColor: '#17a2b8',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
  },
  adherenceButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
  },
  activeButton: {
    backgroundColor: '#ffc107',
  },
  inactiveButton: {
    backgroundColor: '#28a745',
  },
  toggleButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 60,
  },
  editButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 60,
  },
  deleteButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: '#495057',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#212529',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    color: '#212529',
  },
  timesScrollView: {
    maxHeight: 150,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  removeTimeButton: {
    backgroundColor: '#dc3545',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTimeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addTimeButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addTimeText: {
    textAlign: 'center',
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  saveButtonText: {
    color: 'white',
  },
  // Adherence Modal Styles
  adherenceModalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  adherenceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  adherenceModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#495057',
  },
  adherenceHistoryContainer: {
    padding: 20,
  },
  adherenceDay: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  adherenceDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceDayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  adherenceDayStats: {
    fontSize: 12,
    color: '#6c757d',
  },
  adherenceDayTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adherenceTimeSlot: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 6,
    minWidth: 50,
  },
  adherenceTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  adherenceStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  adherenceStatusTaken: {
    color: '#28a745',
  },
  adherenceStatusMissed: {
    color: '#dc3545',
  },
  adherenceTakenAt: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  // Missed Medications Modal Styles
  missedModalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
  },
  missedModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  missedModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 4,
  },
  missedModalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  missedMedicationsContainer: {
    padding: 20,
    maxHeight: 300,
  },
  missedMedicationItem: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  missedMedicationInfo: {
    marginBottom: 12,
  },
  missedMedicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  missedMedicationDetails: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  missedMedicationTime: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
  },
  missedMedicationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  takenLateButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  takenLateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissAllButton: {
    margin: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dismissAllButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicineScreen;