import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOffline } from '../hooks/useOffline';
import { AppBackup } from '../services/OfflineService';

interface BackupRestoreProps {
  onClose?: () => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ onClose }) => {
  const {
    createBackup,
    restoreFromBackup,
    getLatestBackup,
  } = useOffline();

  const [isLoading, setIsLoading] = useState(false);
  const [latestBackup, setLatestBackup] = useState<AppBackup | null>(null);

  React.useEffect(() => {
    loadLatestBackup();
  }, []);

  const loadLatestBackup = async () => {
    try {
      const backup = await getLatestBackup();
      setLatestBackup(backup);
    } catch (error) {
      console.error('Failed to load latest backup:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      const backup = await createBackup();
      setLatestBackup(backup);
      
      Alert.alert(
        'Backup Created',
        'Your data has been successfully backed up.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to create backup:', error);
      Alert.alert(
        'Backup Failed',
        'Failed to create backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = () => {
    if (!latestBackup) {
      Alert.alert(
        'No Backup Found',
        'No backup available to restore.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Restore Backup',
      'This will replace all current data with the backup. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: performRestore },
      ]
    );
  };

  const performRestore = async () => {
    if (!latestBackup) return;

    try {
      setIsLoading(true);
      await restoreFromBackup(latestBackup);
      
      Alert.alert(
        'Restore Complete',
        'Your data has been successfully restored. Please restart the app.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Failed to restore backup:', error);
      Alert.alert(
        'Restore Failed',
        'Failed to restore backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getBackupSize = (backup: AppBackup): string => {
    const sizeInBytes = JSON.stringify(backup).length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    return `${sizeInKB} KB`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup & Restore</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Backup</Text>
        <Text style={styles.sectionDescription}>
          Create a backup of all your data including events, tasks, medications, and settings.
        </Text>
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateBackup}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Icon name="backup" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Create Backup</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Backup</Text>
        
        {latestBackup ? (
          <View style={styles.backupInfo}>
            <View style={styles.backupDetails}>
              <View style={styles.backupRow}>
                <Icon name="schedule" size={16} color="#666" />
                <Text style={styles.backupText}>
                  {formatDate(latestBackup.timestamp)}
                </Text>
              </View>
              
              <View style={styles.backupRow}>
                <Icon name="storage" size={16} color="#666" />
                <Text style={styles.backupText}>
                  {getBackupSize(latestBackup)}
                </Text>
              </View>
              
              <View style={styles.backupRow}>
                <Icon name="info" size={16} color="#666" />
                <Text style={styles.backupText}>
                  Version {latestBackup.version}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleRestoreBackup}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#007bff" size="small" />
              ) : (
                <>
                  <Icon name="restore" size={20} color="#007bff" />
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Restore
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noBackup}>
            <Icon name="info-outline" size={48} color="#ccc" />
            <Text style={styles.noBackupText}>No backup available</Text>
            <Text style={styles.noBackupSubtext}>
              Create your first backup to get started
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Notes</Text>
        <View style={styles.notesList}>
          <View style={styles.noteItem}>
            <Icon name="info" size={16} color="#ffa726" />
            <Text style={styles.noteText}>
              Backups are stored locally on your device
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Icon name="warning" size={16} color="#ff6b6b" />
            <Text style={styles.noteText}>
              Restoring will replace all current data
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Icon name="sync" size={16} color="#4caf50" />
            <Text style={styles.noteText}>
              Create regular backups to prevent data loss
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#007bff',
  },
  backupInfo: {
    gap: 16,
  },
  backupDetails: {
    gap: 8,
  },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backupText: {
    fontSize: 14,
    color: '#495057',
  },
  noBackup: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noBackupText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 12,
  },
  noBackupSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 4,
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});

export default BackupRestore;