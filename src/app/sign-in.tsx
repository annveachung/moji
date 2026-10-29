import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/state/auth';
import colors from '@/theme/colors';

const configured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

/** Shown until you sign in once. Google sign-in is the only way in. */
export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(configured ? null : t('auth.errors.notConfigured'));

  const onPress = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(); // on success the app switches to the tabs by itself
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? t('auth.errors.network') : t('auth.errors.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      className="flex-1 justify-between bg-surface px-8"
      style={{ paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }}>
      <View className="items-center gap-4">
        <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-primary shadow-lg shadow-ink/20">
          <Text className="text-[44px] font-bold text-white">文</Text>
        </View>
        <View className="flex-row items-baseline gap-2">
          <Text className="font-display text-[44px] text-ink">moji</Text>
          <Text className="text-[18px] font-bold text-primary">文字</Text>
        </View>
        <Text className="text-center text-[17px] leading-7 text-ink-soft">{t('auth.tagline')}</Text>
      </View>

      <View className="items-center gap-4">
        <Text className="text-center text-[13px] leading-5 text-ink-muted">{t('auth.signInHint')}</Text>
        {busy ? (
          <View className="h-12 flex-row items-center gap-2">
            <ActivityIndicator color={colors.primary.DEFAULT} />
            <Text className="text-[14px] text-ink-soft">{t('auth.signingIn')}</Text>
          </View>
        ) : (
          // Google's official button: required by their branding rules.
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            disabled={!configured}
            onPress={onPress}
          />
        )}
        {error ? (
          <View className="flex-row items-start gap-2 rounded-2xl bg-error-soft p-3">
            <Icon name="error-outline" size={18} color={colors.error.DEFAULT} />
            <Text className="flex-1 text-[13px] leading-5 text-error">{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
