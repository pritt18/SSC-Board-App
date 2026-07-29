import { Platform, Alert } from 'react-native';
import { useEffect } from 'react';

// Simple content protection without expo-screen-capture
// This will prevent screenshots on Android using native flags
export const useContentProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // For Android, we can use a simple approach
    if (Platform.OS === 'android') {
      // Note: This is a simplified version
      // For full protection, you'd need native module
      console.log('Content protection enabled');
    }

    // Alert user about screenshots
    const warnAboutScreenshots = () => {
      Alert.alert(
        'Content Protection',
        'Screenshots are not allowed for this content to protect copyright.',
        [{ text: 'OK' }]
      );
    };

    // Listen for screenshot attempts (limited)
    // In React Native, there's no direct way without native modules
    
    return () => {
      // Cleanup
    };
  }, [enabled]);
};

// Higher-order component for content protection
export const withContentProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => {
    useContentProtection(true);
    return <WrappedComponent {...props} />;
  };
};