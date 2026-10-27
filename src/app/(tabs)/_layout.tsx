import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import colors from '@/theme/colors';

/**
 * The real iOS tab bar. On iOS 26 it is drawn by the system in "Liquid Glass":
 * content scrolls underneath it, and it shrinks while you scroll down.
 * Icons are Apple's SF Symbols. The web version lives in _layout.web.tsx.
 *
 * Tabs: 単語帳 (your words, opens first) · 復習 · ことば (discover words) · 文法 · 設定
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs tintColor={colors.primary.DEFAULT} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav.library')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>{t('nav.review')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'star', selected: 'star.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('nav.explore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'character.book.closed.ja', selected: 'character.book.closed.fill.ja' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="grammar">
        <NativeTabs.Trigger.Label>{t('nav.grammar')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'text.book.closed', selected: 'text.book.closed.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('nav.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
