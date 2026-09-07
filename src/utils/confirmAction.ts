import { Alert, Platform } from 'react-native';

// -----------------------------------------------------------------
// React Native's Alert.alert() with multiple buttons + onPress
// callbacks does not work reliably on web (react-native-web has very
// limited/no support for it — the dialog either doesn't show or the
// button callbacks never fire). This helper uses the browser's real
// window.confirm() on web, and the normal native Alert everywhere
// else, so confirm dialogs (Delete, Hide, Logout, etc.) always
// actually do something when tapped, on every platform.
// -----------------------------------------------------------------
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK',
  destructive = true
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
};

// Cross-platform replacement for a simple Alert.alert(title, message)
// info popup (no confirm needed).
export const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
};
