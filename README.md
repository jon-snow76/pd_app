# Daily Productivity Scheduler

A comprehensive React Native mobile application for managing your daily productivity through intelligent scheduling, task management, medication reminders, and progress tracking.

## Features

### 📅 Timetable Management
- Create and manage daily events with conflict detection
- Recurring events with flexible patterns (daily, weekly, monthly, custom)
- 15-minute advance notifications for upcoming events
- Cross-date navigation with historical data viewing

### ✅ Task Management
- Priority-based task organization (High, Medium, Low)
- Due date tracking with overdue indicators
- Morning reminders for high-priority tasks
- Task completion tracking and progress analytics

### 💊 Medication Management
- Scheduled medication reminders with custom times
- Adherence tracking and logging
- Follow-up reminders for missed medications (30-minute delay)
- Medication confirmation workflow

### 📊 Progress Tracking
- Daily and weekly productivity analytics
- Task completion statistics and trends
- Medication adherence calendar
- Productivity score calculation
- Goal tracking with congratulatory messages

### 🌐 Advanced Features
- **Offline Support**: Full functionality when offline with automatic sync
- **Error Handling**: Comprehensive error boundaries and user-friendly messages
- **Performance Optimized**: Efficient handling of large datasets
- **Cross-Platform**: Works on both iOS and Android
- **Accessibility**: Screen reader support and keyboard navigation

## Getting Started

### Prerequisites
- Node.js (>= 16)
- React Native CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **iOS Setup (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Run the app:**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

### Development Commands

```bash
# Start Metro bundler
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Clean build cache
npm run clean

# Reset Metro cache
npm run reset-cache
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ErrorBoundary.tsx
│   ├── LoadingSpinner.tsx
│   ├── ProgressIndicator.tsx
│   ├── DateNavigator.tsx
│   └── ...
├── screens/            # Main screen components
│   ├── TimetableScreen.tsx
│   ├── TasksScreen.tsx
│   ├── MedicineScreen.tsx
│   └── ProgressScreen.tsx
├── context/            # React Context providers
│   ├── AppContext.tsx
│   ├── TimetableContext.tsx
│   ├── TasksContext.tsx
│   └── ...
├── services/           # Business logic services
│   ├── AppIntegrationService.ts
│   ├── DateNavigationService.ts
│   ├── RecurringEventsService.ts
│   ├── OfflineService.ts
│   ├── ErrorHandlingService.ts
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useDateNavigation.ts
│   ├── useRecurringEvents.ts
│   ├── useOffline.ts
│   └── ...
├── utils/              # Utility functions
│   ├── storage.ts
│   ├── validation.ts
│   ├── dateUtils.ts
│   └── ...
└── types/              # TypeScript type definitions
    └── index.ts
```

## Testing

The app includes comprehensive testing with 95%+ code coverage:

- **Unit Tests**: All services, utilities, and hooks
- **Integration Tests**: Cross-feature functionality
- **Component Tests**: UI component behavior
- **End-to-End Tests**: Complete user workflows

```bash
# Run all tests
npm test

# Run specific test file
npm test -- TimetableScreen.test.tsx

# Run tests with coverage report
npm run test:coverage
```

## Architecture

### State Management
- **React Context**: App-wide state management
- **Local Storage**: AsyncStorage for data persistence
- **Offline Support**: Queue operations when offline, sync when online

### Navigation
- **React Navigation**: Bottom tab navigation with deep linking
- **Date Navigation**: Cross-screen date synchronization
- **Deep Links**: Notification tap handling with specific item navigation

### Notifications
- **Scheduled Notifications**: Event reminders, task alerts, medication reminders
- **Follow-up Logic**: Missed medication reminders
- **Permission Management**: User-friendly permission request flows

### Performance
- **Virtual Scrolling**: Efficient rendering of large lists
- **Memoization**: Cached expensive computations
- **Lazy Loading**: Components loaded on demand
- **Optimized Re-renders**: Minimal unnecessary updates

## Configuration

### Notification Setup
The app uses `react-native-push-notification` for local notifications. Ensure proper permissions are configured in your platform-specific files.

### iOS Configuration
Add to `ios/YourApp/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>background-processing</string>
    <string>background-fetch</string>
</array>
```

### Android Configuration
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ using React Native and TypeScript