import type { AlertButton } from 'react-native';

/**
 * React Native's Alert does nothing in a browser, so the web app uses the browser's
 * own dialogs: a message, or OK/Cancel for each choice in turn (the first OK wins).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;
  const choices = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const cancel = (buttons ?? []).find((b) => b.style === 'cancel');
  if (choices.length === 0 || (choices.length === 1 && !cancel)) {
    window.alert(text);
    choices[0]?.onPress?.();
    cancel?.onPress?.();
    return;
  }
  for (const choice of choices) {
    const prompt = choices.length === 1 ? text : `${text}\n\n→ ${choice.text}`;
    if (window.confirm(prompt)) {
      choice.onPress?.();
      return;
    }
  }
  cancel?.onPress?.();
}
