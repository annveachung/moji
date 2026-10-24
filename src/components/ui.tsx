import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import colors from '@/theme/colors';

/**
 * Small building blocks shared by every screen, so the design stays consistent.
 * Style: white paper cards with soft shadows on cream, amber accents,
 * tactile "stamp" buttons, and Plus Jakarta Sans for labels.
 */

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({
  name,
  size = 20,
  color = colors.sumi.DEFAULT,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

/** The paper card every section sits on: no outline, just a soft shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-3 rounded-card bg-paper p-4 shadow-md shadow-sumi/10 ${className}`}>{children}</View>
  );
}

type PillTone = 'cream' | 'amber' | 'sumi' | 'shu' | 'outline';

const PILL_TONES: Record<PillTone, { box: string; text: string; icon: string }> = {
  cream: { box: 'bg-cream', text: 'text-sumi', icon: colors.sumi.DEFAULT },
  amber: { box: 'bg-amber/60', text: 'text-sumi', icon: colors.sumi.DEFAULT },
  sumi: { box: 'bg-sumi', text: 'text-cream-light', icon: colors.cream.light },
  shu: { box: 'bg-shu-light', text: 'text-shu', icon: colors.shu.DEFAULT },
  outline: { box: 'border border-sumi/20', text: 'text-sumi-light', icon: colors.sumi.light },
};

/** A small rounded label, e.g. "JLPT N5" or "名詞". */
export function Pill({
  label,
  tone = 'cream',
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

/** A round button with an icon. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'amber',
  size = 40,
  disabled = false,
}: {
  icon: IconName;
  onPress: () => void;
  /** Read aloud by VoiceOver; buttons with only an icon need one. */
  label: string;
  tone?: 'amber' | 'sumi' | 'cream';
  size?: number;
  disabled?: boolean;
}) {
  const box = {
    amber: 'bg-amber',
    sumi: 'bg-sumi',
    cream: 'bg-cream',
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full active:scale-90 ${box} ${disabled ? 'opacity-40' : ''}`}>
      <Icon name={icon} size={size * 0.5} color={tone === 'sumi' ? colors.amber.DEFAULT : colors.sumi.DEFAULT} />
    </Pressable>
  );
}

type StampTone = 'amber' | 'sumi' | 'quiet' | 'shu';

const STAMP_TONES: Record<StampTone, { box: string; text: string; icon: string }> = {
  amber: { box: 'bg-amber border-amber-dark', text: 'text-sumi', icon: colors.sumi.DEFAULT },
  sumi: { box: 'bg-sumi border-black', text: 'text-amber', icon: colors.amber.DEFAULT },
  quiet: { box: 'bg-paper border-cream-dark', text: 'text-sumi', icon: colors.sumi.DEFAULT },
  shu: { box: 'bg-paper border-shu/40', text: 'text-shu', icon: colors.shu.DEFAULT },
};

/**
 * The main button style: a slightly raised "stamp" with a darker bottom edge,
 * which flattens when pressed, like pressing a hanko.
 */
export function StampButton({
  label,
  icon,
  tone = 'amber',
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

/** Title row at the top of a card: a small amber bar, the title, and an optional right side. */
export function SectionHeader({
  title,
  right,
  accent = 'amber',
}: {
  title: string;
  right?: ReactNode;
  accent?: 'amber' | 'sumi' | 'shu';
}) {
  const bar = { amber: 'bg-amber', sumi: 'bg-sumi', shu: 'bg-shu' }[accent];
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-2">
        <View className={`h-4 w-1.5 rounded-full ${bar}`} />
        <Text className="font-display text-[16px] text-sumi">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Friendly message for a section that has nothing to show yet. */
export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-cream/60 p-4">
      <Icon name={icon} size={22} color={colors.sumi.muted} />
      <Text className="flex-1 text-[13px] leading-5 text-sumi-muted">{message}</Text>
    </View>
  );
}

/** A tappable filter chip; dark when selected. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full px-3.5 py-2 ${selected ? 'bg-sumi' : 'bg-paper shadow-sm shadow-sumi/10'}`}>
      <Text className={`font-display-semibold text-[12px] ${selected ? 'text-amber' : 'text-sumi-light'}`}>{label}</Text>
    </Pressable>
  );
}
