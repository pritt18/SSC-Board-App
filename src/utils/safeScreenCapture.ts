// src/utils/safeScreenCapture.ts
// Safe wrapper around expo-screen-capture to prevent app crashes when running on Expo Go
// or environments where the native module is not linked.

let ScreenCaptureModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ScreenCaptureModule = require('expo-screen-capture');
} catch (error) {
  // Native module ExpoScreenCapture not linked in current runtime (e.g., Expo Go)
  console.warn(
    '[safeScreenCapture] Native module ExpoScreenCapture is not available in current runtime. Screen capture restrictions will be inactive.'
  );
}

export const preventScreenCaptureAsync = async (key: string = 'default'): Promise<void> => {
  try {
    if (ScreenCaptureModule && typeof ScreenCaptureModule.preventScreenCaptureAsync === 'function') {
      await ScreenCaptureModule.preventScreenCaptureAsync(key);
    }
  } catch (err) {
    // Gracefully ignore native unavailability errors
  }
};

export const allowScreenCaptureAsync = async (key: string = 'default'): Promise<void> => {
  try {
    if (ScreenCaptureModule && typeof ScreenCaptureModule.allowScreenCaptureAsync === 'function') {
      await ScreenCaptureModule.allowScreenCaptureAsync(key);
    }
  } catch (err) {
    // Gracefully ignore native unavailability errors
  }
};

export const isAvailableAsync = async (): Promise<boolean> => {
  try {
    if (ScreenCaptureModule && typeof ScreenCaptureModule.isAvailableAsync === 'function') {
      return await ScreenCaptureModule.isAvailableAsync();
    }
  } catch (err) {
    return false;
  }
  return false;
};

export const addScreenshotListener = (listener: () => void): { remove: () => void } => {
  try {
    if (ScreenCaptureModule && typeof ScreenCaptureModule.addScreenshotListener === 'function') {
      return ScreenCaptureModule.addScreenshotListener(listener);
    }
  } catch (err) {
    // Gracefully ignore
  }
  return { remove: () => {} };
};

export default {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  isAvailableAsync,
  addScreenshotListener,
};
