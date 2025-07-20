import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ProgressIndicatorProps {
  progress: number; // 0 to 1
  message?: string;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  style?: any;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message,
  showPercentage = true,
  color = '#007bff',
  backgroundColor = '#e9ecef',
  height = 8,
  animated = true,
  style,
}) => {
  const [animatedProgress] = React.useState(new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [progress, animated, animatedProgress]);

  const percentage = Math.round(progress * 100);
  const isComplete = progress >= 1;

  return (
    <View style={[styles.container, style]}>
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{message}</Text>
          {showPercentage && (
            <View style={styles.percentageContainer}>
              {isComplete && (
                <Icon name="check-circle" size={16} color="#28a745" />
              )}
              <Text style={[
                styles.percentage,
                isComplete && styles.completeText,
              ]}>
                {percentage}%
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[styles.progressBar, { backgroundColor, height }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: isComplete ? '#28a745' : color,
              height,
              width: animatedProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

// Circular progress indicator
interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = '#007bff',
  backgroundColor = '#e9ecef',
  showPercentage = true,
  animated = true,
}) => {
  const [animatedProgress] = React.useState(new Animated.Value(0));
  
  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [progress, animated, animatedProgress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <View style={styles.circularProgress}>
        {/* Background circle */}
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: backgroundColor,
            },
          ]}
        />
        
        {/* Progress circle */}
        <Animated.View
          style={[
            styles.circle,
            styles.progressCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              transform: [
                { rotate: '-90deg' },
                {
                  rotate: animatedProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      
      {showPercentage && (
        <View style={styles.circularText}>
          <Text style={[styles.circularPercentage, { color }]}>
            {percentage}%
          </Text>
        </View>
      )}
    </View>
  );
};

// Step progress indicator
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedColor?: string;
  activeColor?: string;
  inactiveColor?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  completedColor = '#28a745',
  activeColor = '#007bff',
  inactiveColor = '#dee2e6',
}) => {
  return (
    <View style={styles.stepContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;
        
        let stepColor = inactiveColor;
        if (isCompleted) stepColor = completedColor;
        else if (isActive) stepColor = activeColor;

        return (
          <View key={index} style={styles.stepItem}>
            <View style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: stepColor },
                ]}>
                {isCompleted ? (
                  <Icon name="check" size={16} color="#ffffff" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    { color: isActive ? '#ffffff' : '#6c757d' },
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {!isLast && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: isCompleted ? completedColor : inactiveColor },
                  ]}
                />
              )}
            </View>
            
            <Text style={[
              styles.stepLabel,
              { color: isActive ? activeColor : '#6c757d' },
            ]}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  completeText: {
    color: '#28a745',
  },
  progressBar: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 4,
  },
  circularContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgress: {
    position: 'absolute',
  },
  circle: {
    position: 'absolute',
  },
  progressCircle: {
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circularText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: 32,
    right: -32,
    height: 2,
    zIndex: -1,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 80,
  },
});

export default ProgressIndicator;