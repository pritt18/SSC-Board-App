import { Platform, Alert } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';

export const useContentProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const preventScreenCapture = async () => {
      if (Platform.OS === 'android') {
        await ScreenCapture.preventScreenCaptureAsync();
      }
    };

    preventScreenCapture();

    const subscription = ScreenCapture.addScreenshotListener(() => {
      Alert.alert(
        'Screenshot Blocked',
        'Screenshots are not allowed for this content.',
        [{ text: 'OK' }]
      );
    });

    return () => {
      ScreenCapture.allowScreenCaptureAsync();
      subscription.remove();
    };
  }, [enabled]);
};

export const withContentProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => {
    useContentProtection(true);
    return <WrappedComponent {...props} />;
  };
};