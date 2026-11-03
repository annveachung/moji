import type { IconName } from '@/components/ui';
import type { JlptLevel, PartOfSpeech, Topic } from '@/db/types';

/**
 * 基本のことば: small, fixed lists of the words Japanese people use all the time but that
 * don't belong to any theme: the glue of a sentence (助動詞, 文末表現, 接続詞), adverbs and
 * amounts, and counting. Groups go from the core of every sentence to counting; inside a group,
 * words go from the most common (or first learned) to the less common.
 *
 * Titles and descriptions are in i18n (essentials.<id>, essentials.<id>Body).
 */
export type EssentialWord = {
  word: string;
  reading: string;
  en: string;
  zh: string;
  pos: PartOfSpeech;
  jlpt: JlptLevel | null;
  /** A short usage note, shown under the meaning. */
  noteEn?: string;
  noteZh?: string;
};

export type EssentialGroup = {
  id: string;
  icon: IconName;
  /** The category a word gets when you save it (null = その他). */
  topic: Topic | null;
  words: EssentialWord[];
};

const w = (
  word: string,
  reading: string,
  en: string,
  zh: string,
  pos: PartOfSpeech,
  jlpt: JlptLevel | null,
  note?: [en: string, zh: string],
): EssentialWord => ({ word, reading, en, zh, pos, jlpt, noteEn: note?.[0], noteZh: note?.[1] });

export const ESSENTIALS: EssentialGroup[] = [
  {
    id: 'auxiliary',
    icon: 'build',
    topic: null,
    words: [
      w('です', 'です', 'is; am; are (polite)', '是（禮貌）', 'expression', 5),
      w('だ', 'だ', 'is; am; are (plain)', '是（常體）', 'expression', 5, ['Casual form of です.', 'です的常體。']),
      w('ます', 'ます', 'polite verb ending', '動詞的禮貌形', 'expression', 5, ['食べます, 行きます', '食べます、行きます']),
      w('ない', 'ない', 'not (negative)', '不；沒（否定）', 'expression', 5, ['食べない = don’t eat', '食べない＝不吃']),
      w('た', 'た', 'did (past); have done', '了（過去・完成）', 'expression', 5, ['食べた = ate', '食べた＝吃了']),
      w('たい', 'たい', 'want to', '想要', 'expression', 5, ['食べたい = want to eat', '食べたい＝想吃']),
      w('よう', 'よう', 'let’s; I’ll (volitional)', '…吧（意向）', 'expression', 4, ['食べよう, 行こう', '食べよう、行こう（う／よう）']),
      w('られる', 'られる', 'can; is done (potential, passive, respect)', '能…；被…（可能・被動・尊敬）', 'expression', 4, ['れる after 五段 verbs: 読まれる', '五段動詞接れる：読まれる']),
      w('させる', 'させる', 'make / let someone do (causative)', '讓；使（使役）', 'expression', 4, ['せる after 五段 verbs: 行かせる', '五段動詞接せる：行かせる']),
      w('そうだ', 'そうだ', 'looks like; I hear that', '看起來…；聽說…', 'expression', 4, ['おいしそうだ = looks tasty; 雨だそうだ = I hear it’ll rain', 'おいしそうだ＝看起來好吃；雨だそうだ＝聽說會下雨']),
      w('らしい', 'らしい', 'it seems; apparently', '好像；聽說', 'expression', 4),
      w('みたいだ', 'みたいだ', 'seems like (casual)', '好像（口語）', 'expression', 4),
      w('ようだ', 'ようだ', 'seems like (written, formal)', '似乎；好像（書面）', 'expression', 4),
      w('はずだ', 'はずだ', 'should be; is expected to', '應該（推測）', 'expression', 3),
      w('べきだ', 'べきだ', 'should; ought to', '應該（義務）', 'expression', 3),
    ],
  },
  {
    id: 'endings',
    icon: 'chat-bubble-outline',
    topic: null,
    words: [
      w('ね', 'ね', 'right?; isn’t it (shared feeling)', '…呢；對吧', 'expression', 5),
      w('よ', 'よ', 'you know; I tell you (new info)', '…喔；…啦', 'expression', 5),
      w('か', 'か', 'question marker', '嗎', 'expression', 5),
      w('よね', 'よね', 'right? (checking)', '…對吧？', 'expression', 5),
      w('でしょう', 'でしょう', 'probably; right?', '…吧', 'expression', 5, ['Casual: でしょ / だろう', '口語：でしょ／だろう']),
      w('の', 'の', 'soft question; explaining (casual)', '…呢？；…的（口語）', 'expression', 4, ['どうしたの？ = what’s wrong?', 'どうしたの？＝怎麼了？']),
      w('んです', 'んです', 'explaining; giving the reason', '（說明原因・情況）', 'expression', 4, ['Casual: んだ', '口語：んだ']),
      w('かな', 'かな', 'I wonder', '…嗎？（自言自語）；不知道…', 'expression', 4),
      w('かも', 'かも', 'maybe', '也許', 'expression', 4, ['Short for かもしれない.', 'かもしれない的口語省略。']),
      w('っけ', 'っけ', 'was it…? (trying to remember)', '…來著？', 'expression', 3),
      w('じゃん', 'じゃん', 'isn’t it?; see? (casual)', '不是…嘛（口語）', 'expression', null, ['Very casual, among friends.', '很口語，朋友之間用。']),
      w('な', 'な', 'casual ね; don’t (after a verb)', '…啊；別…（接動詞）', 'expression', 4, ['いいな = nice; 行くな = don’t go', 'いいな＝真好；行くな＝別去']),
      w('わ', 'わ', 'soft emphasis', '（語氣，柔和強調）', 'expression', null, ['Feminine in Tokyo; used by everyone in Kansai.', '東京偏女性用語；關西男女都用。']),
      w('ぞ', 'ぞ', 'strong emphasis (masculine)', '（語氣，強烈，男性）', 'expression', null),
      w('もん', 'もん', 'because! (casual excuse)', '因為…嘛（口語）', 'expression', null),
    ],
  },
  {
    id: 'conjunctions',
    icon: 'link',
    topic: null,
    words: [
      w('そして', 'そして', 'and; and then', '然後；而且', 'expression', 5),
      w('それから', 'それから', 'after that; and then', '然後；接著', 'expression', 5),
      w('でも', 'でも', 'but (casual)', '但是；可是', 'expression', 5),
      w('しかし', 'しかし', 'however', '然而；但是', 'expression', 4),
      w('だから', 'だから', 'so; that’s why', '所以', 'expression', 5),
      w('それで', 'それで', 'so; and then', '所以；於是', 'expression', 4),
      w('じゃあ', 'じゃあ', 'well then', '那麼；那', 'expression', 5),
      w('それに', 'それに', 'besides; on top of that', '而且；再加上', 'expression', 4),
      w('または', 'または', 'or', '或者', 'expression', 4),
      w('それとも', 'それとも', 'or (in questions)', '還是', 'expression', 4, ['コーヒー？それとも紅茶？', 'コーヒー？それとも紅茶？（咖啡？還是紅茶？）']),
      w('例えば', 'たとえば', 'for example', '例如', 'expression', 4),
      w('ところで', 'ところで', 'by the way', '對了；話說', 'expression', 4),
      w('つまり', 'つまり', 'in other words; in short', '也就是說', 'expression', 3),
      w('ただ', 'ただ', 'but; only that', '只是；不過', 'expression', 3),
      w('それなのに', 'それなのに', 'even so; and yet', '儘管如此；卻', 'expression', 3),
      w('なぜなら', 'なぜなら', 'because (the reason is…)', '因為', 'expression', 3),
      w('さらに', 'さらに', 'furthermore', '再者；更', 'expression', 3),
      w('一方', 'いっぽう', 'on the other hand', '另一方面', 'expression', 2),
    ],
  },
  {
    id: 'adverbs',
    icon: 'speed',
    topic: null,
    words: [
      w('とても', 'とても', 'very', '很；非常', 'adverb', 5),
      w('すごく', 'すごく', 'really; so (casual)', '超；非常（口語）', 'adverb', 4),
      w('ちょっと', 'ちょっと', 'a little; a bit', '一點；有點', 'adverb', 5),
      w('もっと', 'もっと', 'more', '更', 'adverb', 5),
      w('よく', 'よく', 'often; well', '常常；好好地', 'adverb', 5),
      w('もう', 'もう', 'already; anymore', '已經；再也（不）', 'adverb', 5),
      w('まだ', 'まだ', 'still; not yet', '還；還沒', 'adverb', 5),
      w('また', 'また', 'again; also', '又；再', 'adverb', 5),
      w('すぐ', 'すぐ', 'right away; soon', '馬上', 'adverb', 5),
      w('いつも', 'いつも', 'always', '總是', 'adverb', 5),
      w('時々', 'ときどき', 'sometimes', '有時候', 'adverb', 5),
      w('本当に', 'ほんとうに', 'really; truly', '真的', 'adverb', 5),
      w('たぶん', 'たぶん', 'probably', '大概', 'adverb', 5),
      w('きっと', 'きっと', 'surely; I bet', '一定', 'adverb', 4),
      w('あまり', 'あまり', 'not very (with a negative)', '不太…', 'adverb', 5, ['あまり食べない = don’t eat much', 'あまり食べない＝不太吃']),
      w('全然', 'ぜんぜん', 'not at all (with a negative)', '完全（不）', 'adverb', 4),
      w('ほとんど', 'ほとんど', 'almost; hardly (with a negative)', '幾乎', 'adverb', 4),
      w('かなり', 'かなり', 'quite; fairly', '相當', 'adverb', 3),
      w('ずっと', 'ずっと', 'all along; much (more)', '一直；…得多', 'adverb', 4),
      w('やっと', 'やっと', 'finally; at last', '終於', 'adverb', 4),
      w('やっぱり', 'やっぱり', 'as expected; after all', '果然；還是', 'adverb', 3, ['Written: やはり', '書面：やはり']),
      w('なかなか', 'なかなか', 'quite; (not) easily', '相當；（不）容易', 'adverb', 4),
      w('だんだん', 'だんだん', 'gradually', '漸漸', 'adverb', 4),
      w('特に', 'とくに', 'especially', '特別是', 'adverb', 4),
      w('ちゃんと', 'ちゃんと', 'properly', '好好地；確實', 'adverb', 3),
      w('一緒に', 'いっしょに', 'together', '一起', 'adverb', 5),
    ],
  },
  {
    id: 'quantities',
    icon: 'bar-chart',
    topic: 'abstract',
    words: [
      w('全部', 'ぜんぶ', 'all; everything', '全部', 'noun', 5),
      w('みんな', 'みんな', 'everyone; all', '大家', 'noun', 5),
      w('すべて', 'すべて', 'all (formal)', '全部；一切（書面）', 'noun', 4),
      w('たくさん', 'たくさん', 'a lot; many', '很多', 'adverb', 5),
      w('いっぱい', 'いっぱい', 'lots; full', '很多；滿滿的', 'adverb', 4),
      w('少し', 'すこし', 'a little; a few', '一點；稍微', 'adverb', 5),
      w('少々', 'しょうしょう', 'a little (polite)', '稍微（禮貌）', 'adverb', 3, ['少々お待ちください = please wait a moment', '少々お待ちください＝請稍等']),
      w('いくつか', 'いくつか', 'some; several', '幾個', 'noun', 4),
      w('いくら', 'いくら', 'how much (price)', '多少錢', 'noun', 5),
      w('半分', 'はんぶん', 'half', '一半', 'noun', 4),
      w('一部', 'いちぶ', 'a part; some of', '一部分', 'noun', 3),
      w('両方', 'りょうほう', 'both', '兩者；雙方', 'noun', 3),
      w('全員', 'ぜんいん', 'everyone (in the group)', '全體人員', 'noun', 3),
      w('大勢', 'おおぜい', 'many people', '很多人', 'noun', 3),
      w('多く', 'おおく', 'many; much (written)', '許多（書面）', 'noun', 3),
    ],
  },
  {
    id: 'countThings',
    icon: 'category',
    topic: 'abstract',
    words: [
      w('一つ', 'ひとつ', 'one (thing)', '一個', 'noun', 5),
      w('二つ', 'ふたつ', 'two (things)', '兩個', 'noun', 5),
      w('三つ', 'みっつ', 'three (things)', '三個', 'noun', 5),
      w('四つ', 'よっつ', 'four (things)', '四個', 'noun', 5),
      w('五つ', 'いつつ', 'five (things)', '五個', 'noun', 5),
      w('六つ', 'むっつ', 'six (things)', '六個', 'noun', 5),
      w('七つ', 'ななつ', 'seven (things)', '七個', 'noun', 5),
      w('八つ', 'やっつ', 'eight (things)', '八個', 'noun', 5),
      w('九つ', 'ここのつ', 'nine (things)', '九個', 'noun', 5),
      w('十', 'とお', 'ten (things)', '十個', 'noun', 5, ['No つ. From 11 on, use 十一個 (じゅういっこ) etc.', '不加つ。11以上改用「〜個」：十一個（じゅういっこ）。']),
      w('いくつ', 'いくつ', 'how many; how old', '幾個；幾歲', 'noun', 5),
    ],
  },
  {
    id: 'countPeople',
    icon: 'groups',
    topic: 'abstract',
    words: [
      w('一人', 'ひとり', 'one person; alone', '一個人', 'noun', 5, ['Special reading.', '特殊念法。']),
      w('二人', 'ふたり', 'two people', '兩個人', 'noun', 5, ['Special reading.', '特殊念法。']),
      w('三人', 'さんにん', 'three people', '三個人', 'noun', 5),
      w('四人', 'よにん', 'four people', '四個人', 'noun', 5, ['よにん, not しにん or よんにん.', '念よにん，不是しにん或よんにん。']),
      w('五人', 'ごにん', 'five people', '五個人', 'noun', 5),
      w('六人', 'ろくにん', 'six people', '六個人', 'noun', 5),
      w('七人', 'ななにん', 'seven people', '七個人', 'noun', 5, ['Also しちにん.', '也可念しちにん。']),
      w('八人', 'はちにん', 'eight people', '八個人', 'noun', 5),
      w('九人', 'きゅうにん', 'nine people', '九個人', 'noun', 5),
      w('十人', 'じゅうにん', 'ten people', '十個人', 'noun', 5),
      w('何人', 'なんにん', 'how many people', '幾個人', 'noun', 5, ['なにじん means “what nationality”.', 'なにじん是「哪國人」。']),
    ],
  },
  {
    id: 'countDays',
    icon: 'calendar-today',
    topic: 'abstract',
    words: [
      w('一日', 'いちにち', 'one day (duration)', '一天', 'noun', 5, ['一日中 = all day.', '一日中＝一整天。']),
      w('一日', 'ついたち', 'the 1st (of the month)', '（每月）一號', 'noun', 5, ['Only for the date; one day long is いちにち.', '只用於日期；「一天」念いちにち。']),
      w('二日', 'ふつか', 'the 2nd; two days', '二號；兩天', 'noun', 5),
      w('三日', 'みっか', 'the 3rd; three days', '三號；三天', 'noun', 5),
      w('四日', 'よっか', 'the 4th; four days', '四號；四天', 'noun', 5),
      w('五日', 'いつか', 'the 5th; five days', '五號；五天', 'noun', 5),
      w('六日', 'むいか', 'the 6th; six days', '六號；六天', 'noun', 5),
      w('七日', 'なのか', 'the 7th; seven days', '七號；七天', 'noun', 5),
      w('八日', 'ようか', 'the 8th; eight days', '八號；八天', 'noun', 5),
      w('九日', 'ここのか', 'the 9th; nine days', '九號；九天', 'noun', 5),
      w('十日', 'とおか', 'the 10th; ten days', '十號；十天', 'noun', 5),
      w('十一日', 'じゅういちにち', 'the 11th; eleven days', '十一號；十一天', 'noun', 5, ['From 11: number + にち, except 14, 20 and 24.', '11號起：數字＋にち，14、20、24號除外。']),
      w('十四日', 'じゅうよっか', 'the 14th; fourteen days', '十四號；十四天', 'noun', 5),
      w('二十日', 'はつか', 'the 20th; twenty days', '二十號；二十天', 'noun', 5),
      w('二十四日', 'にじゅうよっか', 'the 24th; twenty-four days', '二十四號；二十四天', 'noun', 5),
      w('何日', 'なんにち', 'what date; how many days', '幾號；幾天', 'noun', 5),
    ],
  },
];

export function findEssentialGroup(id: string): EssentialGroup | null {
  return ESSENTIALS.find((group) => group.id === id) ?? null;
}

/** Same key as getSavedWordKeys, to show ✓ on words already in your library. */
export const essentialKey = (word: EssentialWord) => `${word.word}|${word.reading}`;
