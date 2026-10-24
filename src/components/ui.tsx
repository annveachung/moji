import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import colors from '@/theme/colors';

/**
 * Small building blocks shared by every screen, so the design stays consistent.
 * Style (Kotoba Washi Minimal): white cards with soft shadows on warm washi paper,
 * vermilion for actions, mustard for stars and levels, matcha for things you know.
 */

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color ?? colors.ink.DEFAULT} />;
}

/** The card every section sits on: white, no outline, a soft shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`gap-3 rounded-card bg-card p-4 shadow-md shadow-ink/10 ${className}`}>{children}</View>;
}

export type PillTone = 'neutral' | 'primary' | 'mustard' | 'matcha' | 'error' | 'outline';

const PILL_TONES: Record<PillTone, { box: string; text: string; icon: string }> = {
  neutral: { box: 'bg-surface-high', text: 'text-ink-soft', icon: colors.ink.soft },
  primary: { box: 'bg-primary-soft', text: 'text-primary', icon: colors.primary.DEFAULT },
  mustard: { box: 'bg-mustard-soft', text: 'text-mustard', icon: colors.mustard.DEFAULT },
  matcha: { box: 'bg-matcha-soft', text: 'text-matcha-ink', icon: colors.matcha.ink },
  error: { box: 'bg-error-soft', text: 'text-error', icon: colors.error.DEFAULT },
  outline: { box: 'border border-ink/15', text: 'text-ink-soft', icon: colors.ink.soft },
};

/** A small rounded label, e.g. "JLPT N5" or "名詞". */
export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: PillTone;
  icon?: IconName;
}) {
  const style = PILL_TONES[tone];
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${style.box}`}>
      {icon && <Icon name={icon} size={12} color={style.icon} />}
      <Text className={`font-display text-[11px] tracking-wide ${style.text}`}>{label}</Text>
    </View>
  );
}

type IconButtonTone = 'primary' | 'soft' | 'quiet' | 'star';

const ICON_BUTTON_TONES: Record<IconButtonTone, { box: string; icon: string }> = {
  primary: { box: 'bg-primary', icon: '#FFFFFF' },
  soft: { box: 'bg-primary-soft', icon: colors.primary.DEFAULT },
  quiet: { box: 'bg-surface-high', icon: colors.ink.soft },
  star: { box: 'bg-mustard-soft', icon: colors.mustard.DEFAULT },
};

/** A round button with an icon. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'quiet',
  size = 40,
  disabled = false,
}: {
  icon: IconName;
  onPress: () => void;
  /** Read aloud by VoiceOver; buttons with only an icon need one. */
  label: string;
  tone?: IconButtonTone;
  size?: number;
  disabled?: boolean;
}) {
  const style = ICON_BUTTON_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full active:scale-90 ${style.box} ${disabled ? 'opacity-40' : ''}`}>
      <Icon name={icon} size={size * 0.5} color={style.icon} />
    </Pressable>
  );
}

type StampTone = 'primary' | 'ink' | 'quiet' | 'error';

const STAMP_TONES: Record<StampTone, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-primary border-primary-deep', text: 'text-white', icon: '#FFFFFF' },
  ink: { box: 'bg-ink border-black', text: 'text-white', icon: '#FFFFFF' },
  quiet: { box: 'bg-card border-surface-highest', text: 'text-ink', icon: colors.ink.soft },
  error: { box: 'bg-card border-error/40', text: 'text-error', icon: colors.error.DEFAULT },
};

/**
 * The main button style: a slightly raised "stamp" with a darker bottom edge,
 * which flattens when pressed, like pressing a hanko.
 */
export function StampButton({
  label,
  icon,
  tone = 'primary',
  onPress,
  disabled = false,
  className = '',
}: {
  label: string;
  icon?: IconName;
  tone?: StampTone;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const style = STAMP_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-2xl border-b-[3px] px-4 py-3.5 active:translate-y-[2px] active:border-b-[1px] ${style.box} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}>
      {icon && <Icon name={icon} size={20} color={style.icon} />}
      <Text className={`font-display text-[15px] ${style.text}`}>{label}</Text>
    </Pressable>
  );
}

/** Title row at the top of a card: a small colored bar, the title, and an optional right side. */
export function SectionHeader({
  title,
  right,
  accent = 'primary',
}: {
  title: string;
  right?: ReactNode;
  accent?: 'primary' | 'matcha' | 'mustard' | 'error';
}) {
  const bar = { primary: 'bg-primary', matcha: 'bg-matcha', mustard: 'bg-mustard', error: 'bg-error' }[accent];
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-2">
        <View className={`h-4 w-1.5 rounded-full ${bar}`} />
        <Text className="font-display text-[16px] text-ink">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Friendly message for a section that has nothing to show yet. */
export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface-low p-4">
      <Icon name={icon} size={22} color={colors.ink.muted} />
      <Text className="flex-1 text-[13px] leading-5 text-ink-soft">{message}</Text>
    </View>
  );
}

/** A tappable filter chip; vermilion when selected. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full px-3.5 py-2 shadow-sm shadow-ink/10 ${selected ? 'bg-primary' : 'bg-card'}`}>
      <Text className={`font-display-semibold text-[12px] ${selected ? 'text-white' : 'text-ink-soft'}`}>{label}</Text>
    </Pressable>
  );
}
