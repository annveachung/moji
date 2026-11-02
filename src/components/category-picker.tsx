import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_ICON, GRAMMAR_FUNCTIONS, WORD_CATEGORIES } from '@/lib/categories';
import colors from '@/theme/colors';

import { Icon } from './ui';

/**
 * Move a word to another category, or a grammar rule to another function. Opens as a sheet
 * with the fixed list; the AI chose the current one, and this lets you correct it.
 */
export function CategoryPicker({
  kind,
  value,
  onPick,
  onClose,
}: {
  kind: 'word' | 'grammar';
  value: string | null;
  onPick: (category: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const options = kind === 'word' ? WORD_CATEGORIES : GRAMMAR_FUNCTIONS;
  const label = (id: string) => (kind === 'word' ? t(`category.${id}` as 'category.other') : t(`grammarFn.${id}` as 'grammarFn.other'));

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
            <Text className="text-[16px] text-ink-soft">{t('common.cancel')}</Text>
          </Pressable>
          <Text className="font-display text-[16px] text-ink">
            {kind === 'word' ? t('categoryUi.title') : t('categoryUi.grammarTitle')}
          </Text>
          <View className="w-14" />
        </View>
        <ScrollView contentContainerClassName="w-full max-w-[720px] self-center gap-2 p-4" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {[...options, null].map((id) => {
            const selected = (id ?? null) === value;
            return (
              <Pressable
                key={id ?? 'other'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onPick(id)}
                className={`min-h-[52px] flex-row items-center gap-3 rounded-2xl px-4 py-3 ${selected ? 'bg-primary-soft' : 'bg-card'}`}>
                {kind === 'word' ? (
                  <Icon name={CATEGORY_ICON[(id ?? 'other') as keyof typeof CATEGORY_ICON]} size={20} color={selected ? colors.primary.DEFAULT : colors.ink.soft} />
                ) : null}
                <Text className={`flex-1 text-[15px] ${selected ? 'font-bold text-primary' : 'text-ink'}`}>{label(id ?? 'other')}</Text>
                {selected ? <Icon name="check" size={20} color={colors.primary.DEFAULT} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
