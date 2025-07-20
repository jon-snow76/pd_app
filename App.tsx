import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import TimetableScreen from './src/screens/TimetableScreen';
import TasksScreen from './src/screens/TasksScreen';
import MedicineScreen from './src/screens/MedicineScreen';
import ProgressScreen from './src/screens/ProgressScreen';

// Context Providers
import { AppProvider } from './src/context/AppContext';
import { TimetableProvider } from './src/context/TimetableContext';
import { TasksProvider } from './src/context/TasksContext';
import { MedicationProvider } from './src/context/MedicationContext';
import { ProgressProvider } from './src/context/ProgressContext';



// Navigation types
export type RootTabParamList = {
  Timetable: undefined;
  Tasks: undefined;
  Medications: undefined;
  Progress: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Timetable':
              iconName = 'calendar-outline';
              break;
            case 'Tasks':
              iconName = 'checkmark-circle-outline';
              break;
            case 'Medications':
              iconName = 'medical-outline';
              break;
            case 'Progress':
              iconName = 'analytics-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: '#6c757d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#212529',
        },
        headerTintColor: '#007bff',
      })}>
      <Tab.Screen 
        name="Timetable" 
        component={TimetableScreen}
        options={{
          title: 'Schedule',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{
          title: 'Tasks',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Medications" 
        component={MedicineScreen}
        options={{
          title: 'Medications',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{
          title: 'Progress',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <TimetableProvider>
        <TasksProvider>
          <MedicationProvider>
            <ProgressProvider>
              <NavigationContainer>
                <MainTabNavigator />
              </NavigationContainer>
            </ProgressProvider>
          </MedicationProvider>
        </TasksProvider>
      </TimetableProvider>
    </AppProvider>
  );
};

export default App;