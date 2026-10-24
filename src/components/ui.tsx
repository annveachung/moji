import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import colors from '@/theme/colors';

/**
 * Small building blocks shared by every screen, so the design stays consistent:
 * cards, pills, icon buttons and section headers in the cream washi style.
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

/** The paper card every section sits on. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`gap-3 rounded-card border border-sumi/15 bg-cream-light p-4 shadow-sm shadow-sumi/10 ${className}`}>
      {children}
    </View>
  );
}

type PillTone = 'cream' | 'amber' | 'sumi' | 'shu' | 'outline';

const PILL_TONES: Record<PillTone, { box: string; text: string }> = {
  cream: { box: 'bg-cream border border-sumi/10', text: 'text-sumi' },
  amber: { box: 'bg-amber border border-sumi/15', text: 'text-sumi' },
  sumi: { box: 'bg-sumi', text: 'text-cream-light' },
  shu: { box: 'bg-shu', text: 'text-cream-light' },
  outline: { box: 'border border-sumi/25', text: 'text-sumi' },
};

/** A small rounded label, e.g. "JLPT N5" or "Noun". */
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
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-0.5 ${style.box}`}>
      {icon && <Icon name={icon} size={12} color={tone === 'sumi' || tone === 'shu' ? colors.cream.light : colors.sumi.DEFAULT} />}
      <Text className={`text-[11px] font-bold ${style.text}`}>{label}</Text>
    </View>
  );
}

/** A round button with an icon. `filled` uses amber, otherwise a quiet cream circle. */
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
    amber: 'bg-amber border border-sumi/15',
    sumi: 'bg-sumi',
    cream: 'bg-cream border border-sumi/20',
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full active:scale-95 ${box} ${disabled ? 'opacity-40' : ''}`}>
      <Icon
        name={icon}
        size={size * 0.5}
        color={tone === 'sumi' ? colors.cream.light : colors.sumi.DEFAULT}
      />
    </Pressable>
  );
}

/** Title row at the top of a card: icon, title, and an optional right side. */
export function SectionHeader({
  icon,
  title,
  right,
}: {
  icon?: IconName;
  title: string;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-1.5">
        {icon && <Icon name={icon} size={20} color={colors.amber.dark} />}
        <Text className="text-[17px] font-bold text-sumi">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Friendly message for a section that has nothing to show yet. */
export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-dashed border-sumi/25 p-4">
      <Icon name={icon} size={22} color={colors.sumi.muted} />
      <Text className="flex-1 text-[13px] leading-5 text-sumi-muted">{message}</Text>
    </View>
  );
}

/** A tappable filter chip; amber when selected. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-1.5 ${
        selected ? 'border-sumi/20 bg-amber' : 'border-sumi/15 bg-cream-light'
      }`}>
      <Text className={`text-[13px] ${selected ? 'font-bold text-sumi' : 'text-sumi-light'}`}>{label}</Text>
    </Pressable>
  );
}
