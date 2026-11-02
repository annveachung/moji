import { Alert, type AlertButton } from 'react-native';

/** Alert.alert, everywhere. On the iPhone it's the native dialog (see alert.web.ts for the web). */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  Alert.alert(title, message, buttons);
}
