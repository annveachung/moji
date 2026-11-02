import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { Card, Icon, IconButton, Pill, StampButton } from '@/components/ui';
import { getGrammarSentences, getStarredGrammar, setGrammarStarred } from '@/db/grammar';
import {
  countStarred,
  getRecentlyAdded,
  getShownSentences,
  getStarredShuffled,
  recordReview,
  setWordStarred,
} from '@/db/queries';
import type { GrammarRule, GrammarSentence, Sentence, Word } from '@/db/types';
import { meaningFor, translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useLayout } from '@/lib/layout';
import { posLabel } from '@/lib/verb';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

type Section = 'words' | 'grammar';

/**
 * 復習: your ⭐ starred list, in two parts: 単語 (words) and 文法 (grammar).
 * Each goes through its starred items in random order: try to remember, tap to check.
 * "まだ" puts it back at the end of this round; "覚えた" moves on.
 */
export default function ReviewScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const layout = useLayout();
  const [section, setSection] = useState<Section>('words');
  const [counts, setCounts] = useState({ words: 0, grammar: 0 });

  useFocusEffect(
    useCallback(() => {
      Promise.all([countStarred(db), getStarredGrammar(db, 'recent')]).then(([words, grammar]) =>
        setCounts({ words, grammar: grammar.length }),
      );
    }, [db]),
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.review')} kind="reading" />
      <View style={layout.page('reading')} className="pt-2">
        <SectionSwitch section={section} counts={counts} onChange={setSection} />
      </View>
      {section === 'words' ? <WordReview /> : <GrammarReview />}
    </View>
  );
}

/** 単語 | 文法, with how many of each are starred. */
function SectionSwitch({
  section,
  counts,
  onChange,
}: {
  section: Section;
  counts: Record<Section, number>;
  onChange: (section: Section) => void;
}) {
  const { t } = useTranslation();
  const options: { value: Section; label: string }[] = [
    { value: 'words', label: t('review.tabWords') },
    { value: 'grammar', label: t('review.tabGrammar') },
  ];
  return (
    <View className="flex-row rounded-2xl bg-surface-high p-1">
      {options.map((option) => {
        const selected = section === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
              selected ? 'bg-card shadow-sm shadow-ink/10' : ''
            }`}>
            <Text className={`text-[15px] ${selected ? 'font-bold text-ink' : 'font-semibold text-ink-muted'}`}>
              {option.label}
            </Text>
            <View className={`rounded-full px-2 py-0.5 ${selected ? 'bg-mustard-soft' : 'bg-surface-highest'}`}>
              <Text className={`font-display text-[11px] ${selected ? 'text-mustard' : 'text-ink-muted'}`}>
                ⭐ {counts[option.value]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 単語: a round through your ⭐ words, in text or audio-only mode. */
function WordReview() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const layout = useLayout();
  const { settings } = useSettings();

  const [queue, setQueue] = useState<Word[] | null>(null);
  const [recent, setRecent] = useState<Word[]>([]);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [example, setExample] = useState<Sentence | null>(null);
  const [starred, setStarred] = useState(true);
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  // Read by startRound without making it re-run (which would restart the round) on a mode switch.
  const modeRef = useRef(mode);
  const [answers, setAnswers] = useState({ right: 0, total: 0 });

  const current = queue?.[position];

  const show = useCallback(
    async (word: Word | undefined, currentMode: 'text' | 'audio') => {
      setRevealed(false);
      setStarred(true);
      setExample(word ? ((await getShownSentences(db, word.id))[0] ?? null) : null);
      // In audio mode the word is played instead of shown.
      if (word && currentMode === 'audio') speakJapanese(word.reading);
    },
    [db],
  );

  const startRound = useCallback(async () => {
    const words = await getStarredShuffled(db);
    setQueue(words);
    setPosition(0);
    setAnswers({ right: 0, total: 0 });
    await show(words[0], modeRef.current);
  }, [db, show]);

  // A fresh round each time you open the tab.
  useFocusEffect(
    useCallback(() => {
      startRound();
      getRecentlyAdded(db, 10).then(setRecent);
    }, [startRound, db]),
  );

  const answer = async (remembered: boolean) => {
    if (!queue || !current) return;
    await recordReview(db, current.id, remembered);
    // "Not yet" (and still starred): see it again at the end of this round.
    const next = !remembered && starred ? [...queue, current] : queue;
    setQueue(next);
    setPosition(position + 1);
    setAnswers((a) => ({ right: a.right + (remembered ? 1 : 0), total: a.total + 1 }));
    await show(next[position + 1], mode);
  };

  const toggleStar = async () => {
    if (!current) return;
    await setWordStarred(db, current.id, !starred);
    setStarred(!starred);
  };

  const remaining = queue ? queue.length - position : 0;
  const switchMode = (next: 'text' | 'audio') => {
    setMode(next);
    modeRef.current = next;
    if (current && !revealed && next === 'audio') speakJapanese(current.reading);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={layout.page('reading')}
      contentContainerClassName="flex-grow gap-4 py-4">
      <RecentlyAdded words={recent} />
      {queue === null ? null : !current ? (
        <RoundEnd
          reviewed={position}
          emptyTitle={t('review.emptyTitle')}
          emptyBody={t('review.emptyBody')}
          doneBody={t('review.doneBody', { count: position })}
          goLabel={t('review.goLibrary')}
          onAgain={startRound}
          onGo={() => router.navigate('/')}
        />
      ) : (
        <>
          <ModeSwitch mode={mode} onChange={switchMode} />
          <ProgressPanel
            done={position}
            total={queue.length}
            remainingLabel={t('review.remaining', { count: remaining })}
            accuracy={answers.total > 0 ? answers.right / answers.total : null}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityHint={revealed ? undefined : t('review.tapToReveal')}
            disabled={revealed}
            onPress={() => {
              setRevealed(true);
              speakJapanese(current.reading);
            }}
            className="min-h-[320px] items-center justify-center gap-4 overflow-hidden rounded-[28px] bg-card p-6 shadow-lg shadow-ink/10">
            <View className="absolute right-3 top-3">
              <IconButton
                icon={starred ? 'star' : 'star-border'}
                tone={starred ? 'star' : 'quiet'}
                size={36}
                label={starred ? t('review.unstar') : t('word.star')}
                onPress={toggleStar}
              />
            </View>

            {mode === 'audio' && !revealed ? (
              <View className="items-center gap-3">
                <IconButton
                  icon="volume-up"
                  tone="primary"
                  size={88}
                  label={t('review.playAgain')}
                  onPress={() => speakJapanese(current.reading)}
                />
                <Text className="font-display-medium text-[13px] text-ink-soft">{t('review.listenPrompt')}</Text>
              </View>
            ) : (
              <FuriganaText
                markup={current.furigana}
                size={56}
                showFurigana={settings.showFurigana}
                className="font-bold text-ink"
                containerClassName="justify-center"
              />
            )}

            {!revealed ? (
              <View className="flex-row items-center gap-2 rounded-full border border-dashed border-ink/30 px-4 py-2">
                <Icon name="touch-app" size={18} color={colors.ink.muted} />
                <Text className="text-[14px] text-ink-muted">{t('review.tapToReveal')}</Text>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(250)} style={{ alignSelf: 'stretch' }}>
                <View className="items-center gap-3">
                  <View className="flex-row items-center gap-2">
                    <Pill label={posLabel(t, current)} tone="outline" />
                    <IconButton
                      icon="volume-up"
                      size={34}
                      label={t('word.listen')}
                      onPress={() => speakJapanese(current.reading)}
                    />
                  </View>
                  <View className="self-stretch rounded-2xl bg-primary-soft/60 p-4">
                    <Text className="text-center text-[22px] font-bold leading-8 text-ink">
                      {meaningFor(current, settings.meaningLanguage)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </Pressable>

          {revealed && example && (
            <Animated.View entering={FadeIn.delay(100).duration(250)}>
              <Card>
                <Text className="font-display text-[12px] text-primary">{t('review.example')}</Text>
                <FuriganaText
                  markup={example.ja}
                  size={17}
                  showFurigana={settings.showFurigana}
                  targetClassName="font-bold bg-primary-soft"
                />
                <Text className="text-[13px] text-ink-soft">
                  {translationFor(example, settings.meaningLanguage)}
                </Text>
              </Card>
            </Animated.View>
          )}

          {revealed && (
            <Animated.View entering={FadeIn.delay(150).duration(250)}>
              <View className="flex-row gap-3">
                <StampButton label={t('review.notYet')} icon="replay" tone="quiet" className="flex-1" onPress={() => answer(false)} />
                <StampButton label={t('review.gotIt')} icon="check" tone="primary" className="flex-1" onPress={() => answer(true)} />
              </View>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

/** 文法: a round through your ⭐ grammar rules: see the pattern, recall what it means, tap to check. */
function GrammarReview() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const layout = useLayout();
  const { settings } = useSettings();

  const [starredList, setStarredList] = useState<GrammarRule[]>([]);
  const [queue, setQueue] = useState<GrammarRule[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [example, setExample] = useState<GrammarSentence | null>(null);
  const [starred, setStarred] = useState(true);
  const [answers, setAnswers] = useState({ right: 0, total: 0 });
  const current = queue?.[position];

  const show = useCallback(
    async (rule: GrammarRule | undefined) => {
      setRevealed(false);
      setStarred(true);
      setExample(rule ? ((await getGrammarSentences(db, rule.id))[0] ?? null) : null);
    },
    [db],
  );

  const startRound = useCallback(async () => {
    const rules = await getStarredGrammar(db, 'shuffled');
    setQueue(rules);
    setPosition(0);
    setAnswers({ right: 0, total: 0 });
    await show(rules[0]);
  }, [db, show]);

  useFocusEffect(
    useCallback(() => {
      startRound();
      getStarredGrammar(db, 'recent').then(setStarredList);
    }, [startRound, db]),
  );

  const answer = async (remembered: boolean) => {
    if (!queue || !current) return;
    const next = !remembered && starred ? [...queue, current] : queue;
    setQueue(next);
    setPosition(position + 1);
    setAnswers((a) => ({ right: a.right + (remembered ? 1 : 0), total: a.total + 1 }));
    await show(next[position + 1]);
  };

  const toggleStar = async () => {
    if (!current) return;
    await setGrammarStarred(db, current.id, !starred);
    setStarred(!starred);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={layout.page('reading')}
      contentContainerClassName="flex-grow gap-4 py-4">
      <StarredGrammar rules={starredList} />
      {queue === null ? null : !current ? (
        <RoundEnd
          reviewed={position}
          emptyTitle={t('review.grammarEmptyTitle')}
          emptyBody={t('review.grammarEmptyBody')}
          doneBody={t('review.grammarDoneBody', { count: position })}
          goLabel={t('review.goGrammar')}
          onAgain={startRound}
          onGo={() => router.navigate('/grammar')}
        />
      ) : (
        <>
          <ProgressPanel
            done={position}
            total={queue.length}
            remainingLabel={t('review.remainingGrammar', { count: queue.length - position })}
            accuracy={answers.total > 0 ? answers.right / answers.total : null}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityHint={revealed ? undefined : t('review.tapToReveal')}
            disabled={revealed}
            onPress={() => setRevealed(true)}
            className="min-h-[280px] items-center justify-center gap-4 overflow-hidden rounded-[28px] bg-card p-6 shadow-lg shadow-ink/10">
            <View className="absolute right-3 top-3">
              <IconButton
                icon={starred ? 'star' : 'star-border'}
                tone={starred ? 'star' : 'quiet'}
                size={36}
                label={starred ? t('review.unstar') : t('grammar.star')}
                onPress={toggleStar}
              />
            </View>
            {current.jlpt !== null ? (
              <View className="absolute left-4 top-4">
                <Pill label={`N${current.jlpt}`} tone="mustard" />
              </View>
            ) : null}

            <Text className="text-center text-[44px] font-bold leading-[54px] text-ink">{current.pattern}</Text>

            {!revealed ? (
              <View className="flex-row items-center gap-2 rounded-full border border-dashed border-ink/30 px-4 py-2">
                <Icon name="touch-app" size={18} color={colors.ink.muted} />
                <Text className="text-[14px] text-ink-muted">{t('review.tapToReveal')}</Text>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(250)} style={{ alignSelf: 'stretch' }}>
                <View className="gap-3">
                  <View className="self-stretch rounded-2xl bg-primary-soft/60 p-4">
                    <Text className="text-center text-[20px] font-bold leading-7 text-ink">
                      {meaningFor(current, settings.meaningLanguage)}
                    </Text>
                  </View>
                  {current.formation ? (
                    <View className="flex-row items-start gap-2 rounded-2xl bg-surface-low p-3">
                      <Text className="font-display text-[12px] text-mustard">{t('review.formation')}</Text>
                      <Text className="flex-1 text-[14px] leading-5 text-ink">{current.formation}</Text>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            )}
          </Pressable>

          {revealed && example ? (
            <Animated.View entering={FadeIn.delay(100).duration(250)}>
              <Card>
                <View className="flex-row items-center justify-between">
                  <Text className="font-display text-[12px] text-primary">{t('review.example')}</Text>
                  <IconButton icon="volume-up" size={32} label={t('word.listen')} onPress={() => speakJapanese(example.ja)} />
                </View>
                <Text className="text-[17px] leading-7 text-ink">{example.ja}</Text>
                <Text className="text-[13px] text-ink-soft">{translationFor(example, settings.meaningLanguage)}</Text>
              </Card>
            </Animated.View>
          ) : null}

          {revealed ? (
            <Animated.View entering={FadeIn.delay(150).duration(250)}>
              <View className="flex-row gap-3">
                <StampButton label={t('review.notYet')} icon="replay" tone="quiet" className="flex-1" onPress={() => answer(false)} />
                <StampButton label={t('review.gotIt')} icon="check" tone="primary" className="flex-1" onPress={() => answer(true)} />
              </View>
            </Animated.View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

/** Your ⭐ grammar rules as a row of chips (newest star first). Tap one to open it. */
function StarredGrammar({ rules }: { rules: GrammarRule[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { gutter } = useLayout();
  if (rules.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="px-1 font-display-semibold text-[13px] text-ink-soft">{t('review.starredGrammar')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={{ paddingHorizontal: gutter }}
        contentContainerClassName="gap-2 pb-1">
        {rules.map((rule) => (
          <Pressable
            key={rule.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: String(rule.id) } })}
            className="max-w-[200px] rounded-2xl bg-card px-3.5 py-2.5 shadow-sm shadow-ink/10 active:opacity-80">
            <Text numberOfLines={1} className="text-[16px] font-bold text-ink">
              {rule.pattern}
            </Text>
            <Text numberOfLines={1} className="text-[11px] text-ink-soft">
              {meaningFor(rule, settings.meaningLanguage)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** End of a round (or nothing starred yet): a short message and where to go next. */
function RoundEnd({
  reviewed,
  emptyTitle,
  emptyBody,
  doneBody,
  goLabel,
  onAgain,
  onGo,
}: {
  reviewed: number;
  emptyTitle: string;
  emptyBody: string;
  doneBody: string;
  goLabel: string;
  onAgain: () => void;
  onGo: () => void;
}) {
  const { t } = useTranslation();
  const finished = reviewed > 0;
  return (
    <Card className="items-center gap-3 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon name={finished ? 'celebration' : 'star-border'} size={32} color={colors.primary.DEFAULT} />
      </View>
      <Text className="font-display text-[22px] text-ink">{finished ? t('review.doneTitle') : emptyTitle}</Text>
      <Text className="px-4 text-center text-[14px] leading-5 text-ink-muted">{finished ? doneBody : emptyBody}</Text>
      <View className="mt-2 flex-row gap-2">
        <StampButton label={goLabel} tone="quiet" onPress={onGo} />
        {finished && <StampButton label={t('review.again')} icon="replay" tone="primary" onPress={onAgain} />}
      </View>
    </Card>
  );
}

function ModeSwitch({ mode, onChange }: { mode: 'text' | 'audio'; onChange: (mode: 'text' | 'audio') => void }) {
  const { t } = useTranslation();
  const options = [
    { value: 'text' as const, icon: 'translate' as const, label: t('review.modeText') },
    { value: 'audio' as const, icon: 'headphones' as const, label: t('review.modeAudio') },
  ];
  return (
    <View className="flex-row rounded-full bg-surface-highest p-1">
      {options.map((option) => {
        const selected = mode === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${
              selected ? 'bg-card shadow-sm shadow-ink/10' : ''
            }`}>
            <Icon name={option.icon} size={16} color={selected ? colors.ink.DEFAULT : colors.ink.muted} />
            <Text className={`font-display-semibold text-[13px] ${selected ? 'text-ink' : 'text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "7 / 20", a progress bar, words left, and how many you got right this round. */
function ProgressPanel({
  done,
  total,
  remainingLabel,
  accuracy,
}: {
  done: number;
  total: number;
  remainingLabel: string;
  accuracy: number | null;
}) {
  const { t } = useTranslation();
  const progress = total > 0 ? done / total : 0;
  return (
    <View className="gap-2 rounded-2xl bg-card p-3.5 shadow-sm shadow-ink/10">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[18px] text-ink">
          {done} <Text className="font-display-medium text-[14px] text-ink-soft">/ {total}</Text>
        </Text>
        <View className="flex-row items-center gap-2">
          <Pill label={remainingLabel} />
          {accuracy !== null && (
            <Pill label={t('review.accuracy', { percent: Math.round(accuracy * 100) })} icon="verified" tone="matcha" />
          )}
        </View>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-surface-high">
        {/* The filled part is a gradient from vermilion to mustard, drawn with SVG. */}
        <View className="h-full overflow-hidden rounded-full" style={{ width: `${Math.max(Math.round(progress * 100), 4)}%` }}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.primary.DEFAULT} />
                <Stop offset="0.6" stopColor={colors.primary.bright} />
                <Stop offset="1" stopColor={colors.mustard.dim} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bar)" />
          </Svg>
        </View>
      </View>
    </View>
  );
}

/** The words you added most recently, as a sideways row of chips. Tap one to open it. */
function RecentlyAdded({ words }: { words: Word[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { gutter } = useLayout();
  if (words.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="px-1 font-display-semibold text-[13px] text-ink-soft">{t('review.recentTitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={{ paddingHorizontal: gutter }}
        contentContainerClassName="gap-2 pb-1">
        {words.map((word) => (
          <Pressable
            key={word.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
            className="rounded-2xl bg-card px-3.5 py-2 shadow-sm shadow-ink/10 active:opacity-70">
            <Text className="text-[17px] font-bold text-ink">{word.word}</Text>
            <Text numberOfLines={1} className="max-w-[120px] text-[11px] text-ink-soft">
              {meaningFor(word, settings.meaningLanguage)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
