import type { ChineseLinkKind, JlptLevel, PartOfSpeech, RelationKind, Topic } from './types';

/**
 * Starter vocabulary. Each word has furigana markup, English and Traditional Chinese
 * meanings, a note on how it relates to Chinese, and three example sentences.
 * Sentences wrap the target word in {braces} for highlighting and fill-in-the-blank.
 */

export type SeedWord = {
  furigana: string;
  reading: string;
  en: string;
  zh: string;
  pos: PartOfSpeech;
  jlpt: JlptLevel | null;
  topic: Topic;
  tags?: string[];
  zhLink: ChineseLinkKind;
  zhNoteEn: string;
  zhNoteZh: string;
  sentences: [ja: string, en: string, zh: string][];
};

export const SEED_WORDS: SeedWord[] = [
  // ── Daily Life ──────────────────────────────────────────────
  {
    furigana: '勉強[べんきょう]', reading: 'べんきょう', en: 'study', zh: '學習；讀書',
    pos: 'noun', jlpt: 5, topic: 'daily-life', tags: ['する verb'],
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 勉強 means "reluctantly" or "barely managing". In Japanese it simply means to study.',
    zhNoteZh: '中文的「勉強」是「不情願、硬撐」的意思；日文的「勉強」則是「學習、讀書」。',
    sentences: [
      ['毎日[まいにち]、図書館[としょかん]で日本語[にほんご]を{勉強[べんきょう]}しています。', 'I study Japanese at the library every day.', '我每天在圖書館學日文。'],
      ['試験[しけん]の前[まえ]に、友達[ともだち]と一緒[いっしょ]に{勉強[べんきょう]}しました。', 'I studied with a friend before the exam.', '考試前，我和朋友一起讀書。'],
      ['今日[きょう]は疲[つか]れたので、{勉強[べんきょう]}は明日[あした]にします。', "I'm tired today, so I'll study tomorrow.", '今天累了，明天再讀書。'],
    ],
  },
  {
    furigana: '手紙[てがみ]', reading: 'てがみ', en: 'letter', zh: '信；書信',
    pos: 'noun', jlpt: 5, topic: 'daily-life',
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 手紙 means toilet paper. In Japanese it is a letter you write to someone.',
    zhNoteZh: '中文的「手紙」是衛生紙；日文的「手紙」是寫給別人的「信」。',
    sentences: [
      ['祖母[そぼ]に{手紙[てがみ]}を書[か]きました。', 'I wrote a letter to my grandmother.', '我寫了一封信給奶奶。'],
      ['昨日[きのう]、昔[むかし]の友達[ともだち]から{手紙[てがみ]}が届[とど]きました。', 'Yesterday a letter arrived from an old friend.', '昨天收到了老朋友寄來的信。'],
      ['メールより{手紙[てがみ]}のほうが気持[きも]ちが伝[つた]わります。', 'A letter conveys feelings better than an email.', '比起電子郵件，信更能傳達心意。'],
    ],
  },
  {
    furigana: '料理[りょうり]', reading: 'りょうり', en: 'cooking; dish, cuisine', zh: '料理；做菜',
    pos: 'noun', jlpt: 5, topic: 'daily-life', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: 'Same as 料理 in Taiwanese Mandarin (日本料理). Japanese also uses it as a verb: 料理する, "to cook".',
    zhNoteZh: '和台灣常說的「料理」（日本料理）意思相同；日文還能當動詞用：「料理する」＝做菜。',
    sentences: [
      ['父[ちち]は{料理[りょうり]}がとても上手[じょうず]です。', 'My father is very good at cooking.', '我爸爸很會做菜。'],
      ['週末[しゅうまつ]は家[いえ]で{料理[りょうり]}をすることが多[おお]いです。', 'On weekends I often cook at home.', '週末我常在家做菜。'],
      ['この店[みせ]の{料理[りょうり]}はどれも美味[おい]しいです。', 'Every dish at this restaurant is delicious.', '這家店的菜每道都很好吃。'],
    ],
  },
  {
    furigana: '掃除[そうじ]', reading: 'そうじ', en: 'cleaning', zh: '打掃',
    pos: 'noun', jlpt: 4, topic: 'daily-life', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: 'Chinese 掃除 means "to eliminate" (掃除障礙). In Japanese it is everyday housecleaning.',
    zhNoteZh: '中文「掃除」多指「清除、消除」（掃除障礙）；日文是日常的「打掃」。',
    sentences: [
      ['日曜日[にちようび]に部屋[へや]を{掃除[そうじ]}しました。', 'I cleaned my room on Sunday.', '我星期天打掃了房間。'],
      ['毎朝[まいあさ]、十分[じゅっぷん]だけ{掃除[そうじ]}をしています。', 'Every morning I clean for just ten minutes.', '我每天早上只打掃十分鐘。'],
      ['年末[ねんまつ]には家族[かぞく]みんなで家[いえ]を{掃除[そうじ]}します。', 'At the end of the year, the whole family cleans the house.', '年底全家人一起打掃家裡。'],
    ],
  },
  {
    furigana: '洗濯[せんたく]', reading: 'せんたく', en: 'laundry, washing clothes', zh: '洗衣服',
    pos: 'noun', jlpt: 4, topic: 'daily-life', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '洗 (wash) + 濯 (rinse): the characters mean what they say, as in Chinese 洗濯.',
    zhNoteZh: '「洗」加「濯」，字面意思和中文一樣，就是洗衣服。',
    sentences: [
      ['天気[てんき]がいいので、{洗濯[せんたく]}をしました。', 'The weather was nice, so I did the laundry.', '天氣很好，所以我洗了衣服。'],
      ['雨[あめ]の日[ひ]は{洗濯[せんたく]}ができません。', "I can't do laundry on rainy days.", '下雨天沒辦法洗衣服。'],
      ['夜[よる]に{洗濯[せんたく]}するのは近所[きんじょ]に迷惑[めいわく]ですか。', 'Is doing laundry at night a bother to the neighbors?', '晚上洗衣服會吵到鄰居嗎？'],
    ],
  },
  {
    furigana: '大丈夫[だいじょうぶ]', reading: 'だいじょうぶ', en: 'all right, OK', zh: '沒問題；沒關係',
    pos: 'na-adj', jlpt: 4, topic: 'daily-life',
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 大丈夫 means "a real man". In Japanese it is the everyday word for "I\'m OK" or "no problem".',
    zhNoteZh: '中文的「大丈夫」是「男子漢」；日文是最常用的「沒事、沒問題」。',
    sentences: [
      ['転[ころ]んだけど、{大丈夫[だいじょうぶ]}です。', "I fell, but I'm all right.", '我跌倒了，不過沒事。'],
      ['顔色[かおいろ]が悪[わる]いですね。{大丈夫[だいじょうぶ]}ですか。', 'You look pale. Are you okay?', '你臉色不太好，還好嗎？'],
      ['時間[じかん]はまだ{大丈夫[だいじょうぶ]}ですよ。', "We're still fine on time.", '時間還來得及喔。'],
    ],
  },
  {
    furigana: '丈夫[じょうぶ]', reading: 'じょうぶ', en: 'sturdy, durable; healthy', zh: '結實；耐用；健康',
    pos: 'na-adj', jlpt: 4, topic: 'daily-life',
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 丈夫 means "husband". In Japanese it describes something sturdy or someone healthy. Husband is 夫 (おっと).',
    zhNoteZh: '中文的「丈夫」是「先生、老公」；日文是「結實、健康」。日文的老公是「夫（おっと）」。',
    sentences: [
      ['この鞄[かばん]はとても{丈夫[じょうぶ]}です。', 'This bag is very sturdy.', '這個包包非常耐用。'],
      ['祖父[そふ]は九十歳[きゅうじゅっさい]ですが、とても{丈夫[じょうぶ]}です。', 'My grandfather is ninety but very healthy.', '我爺爺九十歲了，但身體很硬朗。'],
      ['{丈夫[じょうぶ]}な靴[くつ]を買[か]いたいです。', 'I want to buy sturdy shoes.', '我想買耐穿的鞋子。'],
    ],
  },
  {
    furigana: '冷蔵庫[れいぞうこ]', reading: 'れいぞうこ', en: 'refrigerator', zh: '冰箱',
    pos: 'noun', jlpt: 4, topic: 'daily-life',
    zhLink: 'same',
    zhNoteEn: 'Literally "cold-storage-store". The characters match Chinese 冷藏庫, but Taiwan calls a fridge 冰箱.',
    zhNoteZh: '字面就是「冷藏庫」，看字就懂；只是台灣日常說「冰箱」。',
    sentences: [
      ['牛乳[ぎゅうにゅう]は{冷蔵庫[れいぞうこ]}に入[い]れてください。', 'Please put the milk in the fridge.', '請把牛奶放進冰箱。'],
      ['{冷蔵庫[れいぞうこ]}の中[なか]に何[なに]もありません。', "There's nothing in the fridge.", '冰箱裡什麼都沒有。'],
      ['新[あたら]しい{冷蔵庫[れいぞうこ]}を買[か]いました。', 'I bought a new refrigerator.', '我買了新冰箱。'],
    ],
  },
  {
    furigana: '走[はし]る', reading: 'はしる', en: 'to run', zh: '跑',
    pos: 'verb', jlpt: 5, topic: 'daily-life', tags: ['godan'],
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 走 means "to walk". In Japanese 走る means "to run". To walk is 歩く (あるく).',
    zhNoteZh: '中文的「走」是走路；日文的「走る」是「跑」。日文的走路是「歩く（あるく）」。',
    sentences: [
      ['駅[えき]まで{走[はし]}りました。', 'I ran to the station.', '我跑到了車站。'],
      ['毎朝[まいあさ]、公園[こうえん]を{走[はし]}っています。', 'I run in the park every morning.', '我每天早上在公園跑步。'],
      ['廊下[ろうか]を{走[はし]}らないでください。', "Please don't run in the hallway.", '請不要在走廊上奔跑。'],
    ],
  },
  {
    furigana: '歩[ある]く', reading: 'あるく', en: 'to walk', zh: '走路；步行',
    pos: 'verb', jlpt: 5, topic: 'daily-life', tags: ['godan'],
    zhLink: 'nuance',
    zhNoteEn: '歩 is the 步 in 步行 (walking), so it is a good hint. Don\'t mix it up with 走る, which means "run".',
    zhNoteZh: '「歩」就是「步行」的「步」，可以聯想；別和「走る」（跑）搞混。',
    sentences: [
      ['駅[えき]まで{歩[ある]}いて十分[じゅっぷん]です。', "It's a ten-minute walk to the station.", '走路到車站要十分鐘。'],
      ['天気[てんき]がいい日[ひ]は川沿[かわぞ]いを{歩[ある]}きます。', 'On nice days I walk along the river.', '天氣好的時候我會沿著河邊散步。'],
      ['疲[つか]れて、もう{歩[ある]}けません。', "I'm so tired I can't walk anymore.", '我累到走不動了。'],
    ],
  },

  // ── Travel ──────────────────────────────────────────────────
  {
    furigana: '切符[きっぷ]', reading: 'きっぷ', en: 'ticket (train, bus)', zh: '車票；票',
    pos: 'noun', jlpt: 5, topic: 'travel',
    zhLink: 'nuance',
    zhNoteEn: 'Chinese doesn\'t use 切符. 符 suggests a token or tally (符號), which is a helpful hint for "ticket".',
    zhNoteZh: '中文沒有「切符」這個詞；「符」有憑證、符號的意思，可以聯想成「票」。',
    sentences: [
      ['駅[えき]で新幹線[しんかんせん]の{切符[きっぷ]}を買[か]いました。', 'I bought a shinkansen ticket at the station.', '我在車站買了新幹線的車票。'],
      ['{切符[きっぷ]}をなくしてしまいました。', 'I lost my ticket.', '我把車票弄丟了。'],
      ['この{切符[きっぷ]}で京都[きょうと]まで行[い]けますか。', 'Can I get to Kyoto with this ticket?', '這張票可以到京都嗎？'],
    ],
  },
  {
    furigana: '予約[よやく]', reading: 'よやく', en: 'reservation, booking', zh: '預約；訂位',
    pos: 'noun', jlpt: 4, topic: 'travel', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: 'In this word, Japanese writes 予 where Chinese writes 預. 予約 = 預約, with the same meaning.',
    zhNoteZh: '「予」對應中文的「預」，「予約」就是「預約」，意思相同。',
    sentences: [
      ['レストランを七時[しちじ]に{予約[よやく]}しました。', 'I booked a table at the restaurant for seven.', '我訂了七點的餐廳。'],
      ['ホテルの{予約[よやく]}を確認[かくにん]したいんですが。', "I'd like to confirm my hotel reservation.", '我想確認一下飯店的預約。'],
      ['人気[にんき]の店[みせ]なので、{予約[よやく]}が必要[ひつよう]です。', "It's a popular place, so you need a reservation.", '這家店很熱門，需要預約。'],
    ],
  },
  {
    furigana: '荷物[にもつ]', reading: 'にもつ', en: 'luggage, baggage; package', zh: '行李；包裹',
    pos: 'noun', jlpt: 5, topic: 'travel',
    zhLink: 'nuance',
    zhNoteEn: '荷 means "to carry a load" (負荷), so 荷物 is literally "carried things". Chinese uses 行李 instead.',
    zhNoteZh: '「荷」是「負荷、扛」的意思，「荷物」＝扛著的東西；中文則說「行李」。',
    sentences: [
      ['{荷物[にもつ]}が重[おも]すぎて、一人[ひとり]で持[も]てません。', 'The luggage is too heavy to carry alone.', '行李太重了，我一個人拿不動。'],
      ['ホテルに{荷物[にもつ]}を預[あず]けてから観光[かんこう]しました。', 'I left my luggage at the hotel and then went sightseeing.', '我把行李寄放在飯店後去觀光。'],
      ['空港[くうこう]で{荷物[にもつ]}を待[ま]っています。', "I'm waiting for my luggage at the airport.", '我在機場等行李。'],
    ],
  },
  {
    furigana: '観光[かんこう]', reading: 'かんこう', en: 'sightseeing, tourism', zh: '觀光',
    pos: 'noun', jlpt: 3, topic: 'travel', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '観 is 觀. Same word, same meaning as 觀光.',
    zhNoteZh: '「観」就是「觀」，和中文的「觀光」完全一樣。',
    sentences: [
      ['週末[しゅうまつ]、奈良[なら]へ{観光[かんこう]}に行[い]きます。', "This weekend I'm going sightseeing in Nara.", '這週末要去奈良觀光。'],
      ['京都[きょうと]は{観光[かんこう]}で有名[ゆうめい]な町[まち]です。', 'Kyoto is a city famous for sightseeing.', '京都是以觀光聞名的城市。'],
      ['{観光[かんこう]}の前[まえ]に、地図[ちず]をダウンロードしておきました。', 'Before sightseeing, I downloaded a map.', '觀光之前，我先下載了地圖。'],
    ],
  },
  {
    furigana: '乗[の]り換[か]え', reading: 'のりかえ', en: 'transfer (trains)', zh: '轉乘；轉車',
    pos: 'noun', jlpt: 3, topic: 'travel',
    zhLink: 'same',
    zhNoteEn: '乗 (乘, ride) + 換 (change): the same idea as 換乘, just in reverse order.',
    zhNoteZh: '「乗」（乘）＋「換」，和中文「換乘」意思相同，只是順序相反。',
    sentences: [
      ['次[つぎ]の駅[えき]で{乗[の]り換[か]え}です。', 'We transfer at the next station.', '下一站要轉車。'],
      ['東京[とうきょう]までは{乗[の]り換[か]え}が二回[にかい]あります。', 'There are two transfers to Tokyo.', '到東京要轉車兩次。'],
      ['{乗[の]り換[か]え}の時間[じかん]が五分[ごふん]しかありません。', 'I only have five minutes to transfer.', '轉車時間只有五分鐘。'],
    ],
  },
  {
    furigana: '空港[くうこう]', reading: 'くうこう', en: 'airport', zh: '機場',
    pos: 'noun', jlpt: 4, topic: 'travel',
    zhLink: 'nuance',
    zhNoteEn: 'Literally "sky harbor" (空 + 港). Easy to guess, though Chinese says 機場.',
    zhNoteZh: '字面是「空中的港口」，很好猜；中文則說「機場」。',
    sentences: [
      ['{空港[くうこう]}までバスで一時間[いちじかん]かかります。', 'It takes an hour by bus to the airport.', '搭公車到機場要一個小時。'],
      ['成田[なりた]{空港[くうこう]}に着[つ]いたら連絡[れんらく]します。', "I'll contact you when I arrive at Narita Airport.", '到成田機場後我會聯絡你。'],
      ['{空港[くうこう]}で友達[ともだち]を見送[みおく]りました。', 'I saw my friend off at the airport.', '我在機場送朋友。'],
    ],
  },
  {
    furigana: '道[みち]', reading: 'みち', en: 'road, way, path', zh: '路；道路',
    pos: 'noun', jlpt: 5, topic: 'travel',
    zhLink: 'same',
    zhNoteEn: 'Same as 道 in 道路. On its own it is read みち, but in compounds it is often どう (柔道 = じゅうどう).',
    zhNoteZh: '和「道路」的「道」相同；單獨讀「みち」，複合詞常讀「どう」（柔道＝じゅうどう）。',
    sentences: [
      ['駅[えき]までの{道[みち]}を教[おし]えてください。', 'Please tell me the way to the station.', '請告訴我去車站的路。'],
      ['{道[みち]}に迷[まよ]ってしまいました。', 'I got lost.', '我迷路了。'],
      ['この{道[みち]}をまっすぐ行[い]くと、右[みぎ]に銀行[ぎんこう]があります。', "Go straight along this road and there's a bank on the right.", '沿著這條路直走，右邊有銀行。'],
    ],
  },
  {
    furigana: '両替[りょうがえ]', reading: 'りょうがえ', en: 'currency exchange; making change', zh: '換錢；兌換',
    pos: 'noun', jlpt: 3, topic: 'travel', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: '両 (兩) was an old unit of money, and 替 means "swap", so it means "money swap". Chinese says 換錢 or 兌換.',
    zhNoteZh: '「両」（兩）是古代貨幣單位，「替」是交換；中文說「換錢、兌換」。',
    sentences: [
      ['空港[くうこう]で円[えん]に{両替[りょうがえ]}しました。', 'I exchanged money into yen at the airport.', '我在機場換了日圓。'],
      ['銀行[ぎんこう]で{両替[りょうがえ]}できますか。', 'Can I exchange money at the bank?', '可以在銀行換錢嗎？'],
      ['千円札[せんえんさつ]を百円玉[ひゃくえんだま]に{両替[りょうがえ]}してもらえますか。', 'Could you break a thousand-yen bill into hundred-yen coins?', '可以幫我把千圓鈔換成百圓硬幣嗎？'],
    ],
  },
  {
    furigana: '出発[しゅっぱつ]', reading: 'しゅっぱつ', en: 'departure', zh: '出發',
    pos: 'noun', jlpt: 4, topic: 'travel', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '発 is 發. Same as 出發.',
    zhNoteZh: '「発」就是「發」，和中文「出發」相同。',
    sentences: [
      ['飛行機[ひこうき]は十時[じゅうじ]に{出発[しゅっぱつ]}します。', 'The plane departs at ten.', '飛機十點出發。'],
      ['明日[あした]の朝[あさ]早[はや]く{出発[しゅっぱつ]}しましょう。', "Let's set off early tomorrow morning.", '我們明天一早出發吧。'],
      ['{出発[しゅっぱつ]}の前[まえ]にパスポートを確認[かくにん]してください。', 'Please check your passport before departure.', '出發前請確認護照。'],
    ],
  },
  {
    furigana: '到着[とうちゃく]', reading: 'とうちゃく', en: 'arrival', zh: '抵達；到達',
    pos: 'noun', jlpt: 3, topic: 'travel', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: 'Chinese says 到達 or 抵達. In Japanese, 着 means "arrive" (着く = つく), which is different from 著/着 in Chinese.',
    zhNoteZh: '中文說「到達、抵達」；日文的「着」有「抵達」的意思（着く＝つく），和中文的「著」不同。',
    sentences: [
      ['電車[でんしゃ]が五分[ごふん]遅[おく]れて{到着[とうちゃく]}しました。', 'The train arrived five minutes late.', '電車晚了五分鐘抵達。'],
      ['ホテルに{到着[とうちゃく]}したら、すぐに寝[ね]ました。', 'As soon as I arrived at the hotel, I went to sleep.', '一到飯店我就睡了。'],
      ['荷物[にもつ]の{到着[とうちゃく]}は明日[あした]の予定[よてい]です。', 'The package is scheduled to arrive tomorrow.', '包裹預計明天送達。'],
    ],
  },

  // ── Relationships ───────────────────────────────────────────
  {
    furigana: '友達[ともだち]', reading: 'ともだち', en: 'friend', zh: '朋友',
    pos: 'noun', jlpt: 5, topic: 'relationships',
    zhLink: 'nuance',
    zhNoteEn: '友 = 友, and 達 was originally a plural marker. Today 友達 can mean one friend or several.',
    zhNoteZh: '「友」同中文；「達」原本表示複數，但現在「友達」一個或多個朋友都能用。',
    sentences: [
      ['大学[だいがく]で新[あたら]しい{友達[ともだち]}ができました。', 'I made a new friend at university.', '我在大學交到了新朋友。'],
      ['{友達[ともだち]}と映画[えいが]を見[み]に行[い]きました。', 'I went to see a movie with a friend.', '我和朋友去看了電影。'],
      ['彼[かれ]は子供[こども]のころからの{友達[ともだち]}です。', "He's been my friend since childhood.", '他是我從小到大的朋友。'],
    ],
  },
  {
    furigana: '恋人[こいびと]', reading: 'こいびと', en: 'boyfriend/girlfriend, partner', zh: '戀人；男女朋友',
    pos: 'noun', jlpt: 3, topic: 'relationships',
    zhLink: 'same',
    zhNoteEn: '恋 is 戀. Same as 戀人. Also: 愛人 in Japanese means a secret lover, so avoid it.',
    zhNoteZh: '「恋」就是「戀」，同「戀人」。另外，日文的「愛人」是「外遇對象」，千萬別用錯！',
    sentences: [
      ['{恋人[こいびと]}と一緒[いっしょ]に花火[はなび]を見[み]ました。', 'I watched fireworks with my partner.', '我和戀人一起看了煙火。'],
      ['彼女[かのじょ]には{恋人[こいびと]}がいるそうです。', 'I heard she has a boyfriend.', '聽說她有男朋友了。'],
      ['{恋人[こいびと]}の誕生日[たんじょうび]にケーキを作[つく]りました。', "I made a cake for my partner's birthday.", '我為戀人的生日做了蛋糕。'],
    ],
  },
  {
    furigana: '夫[おっと]', reading: 'おっと', en: '(my) husband', zh: '丈夫；老公',
    pos: 'noun', jlpt: 4, topic: 'relationships',
    zhLink: 'nuance',
    zhNoteEn: 'Chinese says 丈夫, but Japanese drops 丈: husband is just 夫. In Japanese, 丈夫 means "sturdy".',
    zhNoteZh: '中文說「丈夫」，日文只用「夫」；日文的「丈夫」是「結實」的意思。',
    sentences: [
      ['{夫[おっと]}は銀行[ぎんこう]で働[はたら]いています。', 'My husband works at a bank.', '我先生在銀行上班。'],
      ['{夫[おっと]}と二人[ふたり]で旅行[りょこう]に行[い]きました。', 'I went on a trip with my husband.', '我和先生兩個人去旅行了。'],
      ['{夫[おっと]}は料理[りょうり]が得意[とくい]です。', 'My husband is good at cooking.', '我先生很擅長做菜。'],
    ],
  },
  {
    furigana: '家族[かぞく]', reading: 'かぞく', en: 'family', zh: '家人；家庭',
    pos: 'noun', jlpt: 5, topic: 'relationships',
    zhLink: 'nuance',
    zhNoteEn: 'Chinese 家族 means an extended clan. Japanese 家族 is your immediate family (家人).',
    zhNoteZh: '中文的「家族」偏向大家族、宗族；日文的「家族」就是「家人」。',
    sentences: [
      ['週末[しゅうまつ]は{家族[かぞく]}と過[す]ごします。', 'I spend weekends with my family.', '週末我和家人一起度過。'],
      ['{家族[かぞく]}は四人[よにん]です。', 'There are four people in my family.', '我家有四個人。'],
      ['お正月[しょうがつ]に{家族[かぞく]}みんなで集[あつ]まりました。', 'The whole family got together for New Year.', '新年時全家人聚在一起。'],
    ],
  },
  {
    furigana: '娘[むすめ]', reading: 'むすめ', en: 'daughter; young woman', zh: '女兒',
    pos: 'noun', jlpt: 4, topic: 'relationships',
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 娘 means "mother". In Japanese 娘 means "daughter".',
    zhNoteZh: '中文的「娘」是「母親」；日文的「娘」是「女兒」！',
    sentences: [
      ['{娘[むすめ]}は今年[ことし]小学生[しょうがくせい]になりました。', 'My daughter started elementary school this year.', '我女兒今年上小學了。'],
      ['{娘[むすめ]}と公園[こうえん]で遊[あそ]びました。', 'I played in the park with my daughter.', '我和女兒在公園玩。'],
      ['田中[たなか]さんの{娘[むすめ]}さんは医者[いしゃ]です。', "Mr. Tanaka's daughter is a doctor.", '田中先生的女兒是醫生。'],
    ],
  },
  {
    furigana: '約束[やくそく]', reading: 'やくそく', en: 'promise; plans, appointment', zh: '約定；承諾',
    pos: 'noun', jlpt: 4, topic: 'relationships', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: 'Chinese 約束 means "to restrain". Japanese 約束 is a promise or plans to meet.',
    zhNoteZh: '中文的「約束」是「限制、管束」；日文是「約定、承諾」。',
    sentences: [
      ['明日[あした]、友達[ともだち]と会[あ]う{約束[やくそく]}があります。', 'I have plans to meet a friend tomorrow.', '明天我跟朋友約好要見面。'],
      ['{約束[やくそく]}を守[まも]るのは大切[たいせつ]です。', 'Keeping promises is important.', '遵守約定很重要。'],
      ['必[かなら]ず電話[でんわ]すると{約束[やくそく]}しました。', "I promised I'd definitely call.", '我答應了一定會打電話。'],
    ],
  },
  {
    furigana: '喧嘩[けんか]', reading: 'けんか', en: 'quarrel, fight', zh: '吵架；打架',
    pos: 'noun', jlpt: 3, topic: 'relationships', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: 'Chinese 喧嘩 means "noisy, clamor". Japanese 喧嘩 is an argument or fight.',
    zhNoteZh: '中文的「喧嘩」是「吵雜」；日文的「喧嘩」是「吵架、打架」。',
    sentences: [
      ['兄[あに]とテレビのことで{喧嘩[けんか]}しました。', 'I argued with my older brother over the TV.', '我和哥哥為了電視吵架。'],
      ['小[ちい]さいことで{喧嘩[けんか]}するのはやめよう。', "Let's stop fighting over little things.", '別再為小事吵架了。'],
      ['{喧嘩[けんか]}の後[あと]、すぐに仲直[なかなお]りしました。', 'We made up right after the fight.', '吵架之後我們馬上就和好了。'],
    ],
  },

  // ── Work & Technology ───────────────────────────────────────
  {
    furigana: '会議[かいぎ]', reading: 'かいぎ', en: 'meeting, conference', zh: '會議',
    pos: 'noun', jlpt: 4, topic: 'work-tech',
    zhLink: 'same',
    zhNoteEn: '会 is 會. Same as 會議.',
    zhNoteZh: '「会」就是「會」，和「會議」相同。',
    sentences: [
      ['午後[ごご]三時[さんじ]から{会議[かいぎ]}があります。', "There's a meeting from 3 p.m.", '下午三點開始有會議。'],
      ['{会議[かいぎ]}の資料[しりょう]を準備[じゅんび]しました。', 'I prepared the materials for the meeting.', '我準備了會議資料。'],
      ['今日[きょう]の{会議[かいぎ]}はオンラインで行[おこな]います。', "Today's meeting will be held online.", '今天的會議在線上舉行。'],
    ],
  },
  {
    furigana: '残業[ざんぎょう]', reading: 'ざんぎょう', en: 'overtime work', zh: '加班',
    pos: 'noun', jlpt: 3, topic: 'work-tech', tags: ['する verb'],
    zhLink: 'nuance',
    zhNoteEn: 'Literally "leftover work" (残 = 殘). Chinese says 加班.',
    zhNoteZh: '字面是「殘留的工作」（残＝殘）；中文說「加班」。',
    sentences: [
      ['今週[こんしゅう]は毎日[まいにち]{残業[ざんぎょう]}しています。', "I've been working overtime every day this week.", '這週我每天都在加班。'],
      ['今日[きょう]は{残業[ざんぎょう]}しないで早[はや]く帰[かえ]ります。', "Today I'm skipping overtime and going home early.", '今天不加班，早點回家。'],
      ['締[し]め切[き]りが近[ちか]いので、{残業[ざんぎょう]}が続[つづ]いています。', 'The deadline is close, so I keep working overtime.', '截止日期快到了，所以一直在加班。'],
    ],
  },
  {
    furigana: '締[し]め切[き]り', reading: 'しめきり', en: 'deadline', zh: '截止日期',
    pos: 'noun', jlpt: 3, topic: 'work-tech',
    zhLink: 'nuance',
    zhNoteEn: '締める (close, tighten) + 切る (cut off): the point where things are "closed off". Chinese says 截止.',
    zhNoteZh: '「締める」（關閉）＋「切る」（切斷）＝截止；中文說「截止日期」。',
    sentences: [
      ['レポートの{締[し]め切[き]り}は金曜日[きんようび]です。', 'The report deadline is Friday.', '報告的截止日是星期五。'],
      ['{締[し]め切[き]り}に間[ま]に合[あ]いませんでした。', "I didn't make the deadline.", '我沒趕上截止日期。'],
      ['{締[し]め切[き]り}を一日[いちにち]延[の]ばしてもらえませんか。', 'Could you extend the deadline by one day?', '截止日期可以延後一天嗎？'],
    ],
  },
  {
    furigana: '保存[ほぞん]', reading: 'ほぞん', en: 'saving (a file); preservation', zh: '儲存；保存',
    pos: 'noun', jlpt: 3, topic: 'work-tech', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: 'Same as 保存. It is also the "Save" button in Japanese software.',
    zhNoteZh: '和中文「保存」相同，也是日文軟體裡的「儲存」按鈕。',
    sentences: [
      ['ファイルを{保存[ほぞん]}するのを忘[わす]れました。', 'I forgot to save the file.', '我忘了存檔。'],
      ['写真[しゃしん]をクラウドに{保存[ほぞん]}しています。', 'I save my photos to the cloud.', '我把照片存在雲端。'],
      ['この野菜[やさい]は冷蔵庫[れいぞうこ]で一週間[いっしゅうかん]{保存[ほぞん]}できます。', 'These vegetables keep for a week in the fridge.', '這種蔬菜在冰箱裡可以保存一週。'],
    ],
  },
  {
    furigana: '画面[がめん]', reading: 'がめん', en: 'screen (display)', zh: '螢幕；畫面',
    pos: 'noun', jlpt: 3, topic: 'work-tech',
    zhLink: 'same',
    zhNoteEn: '画 is 畫. Same as 畫面, and also used for a device screen (螢幕).',
    zhNoteZh: '「画」就是「畫」；同「畫面」，也用來指手機或電腦的「螢幕」。',
    sentences: [
      ['スマホの{画面[がめん]}が割[わ]れてしまいました。', 'My phone screen cracked.', '我的手機螢幕裂了。'],
      ['{画面[がめん]}を共有[きょうゆう]してもいいですか。', 'May I share my screen?', '我可以分享螢幕嗎？'],
      ['{画面[がめん]}が暗[くら]くて、よく見[み]えません。', 'The screen is dark and hard to see.', '螢幕太暗，看不太清楚。'],
    ],
  },
  {
    furigana: '新聞[しんぶん]', reading: 'しんぶん', en: 'newspaper', zh: '報紙',
    pos: 'noun', jlpt: 5, topic: 'work-tech',
    zhLink: 'false-friend',
    zhNoteEn: 'In Chinese, 新聞 means "news". In Japanese it is the newspaper itself. News is ニュース.',
    zhNoteZh: '中文的「新聞」是消息；日文的「新聞」是「報紙」。新聞（消息）日文說「ニュース」。',
    sentences: [
      ['父[ちち]は毎朝[まいあさ]{新聞[しんぶん]}を読[よ]みます。', 'My father reads the newspaper every morning.', '我爸爸每天早上看報紙。'],
      ['最近[さいきん]は{新聞[しんぶん]}をスマホで読[よ]んでいます。', 'These days I read the newspaper on my phone.', '最近我都用手機看報紙。'],
      ['その事件[じけん]は{新聞[しんぶん]}に載[の]っていました。', 'That incident was in the newspaper.', '那起事件登在報紙上了。'],
    ],
  },
  {
    furigana: '経験[けいけん]', reading: 'けいけん', en: 'experience', zh: '經驗',
    pos: 'noun', jlpt: 3, topic: 'work-tech', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '経 is 經 and 験 is 驗. Same as 經驗.',
    zhNoteZh: '「経」＝「經」、「験」＝「驗」，同「經驗」。',
    sentences: [
      ['この仕事[しごと]の{経験[けいけん]}は三年[さんねん]あります。', 'I have three years of experience in this job.', '這份工作我有三年經驗。'],
      ['海外[かいがい]で働[はたら]いた{経験[けいけん]}がありますか。', 'Do you have experience working abroad?', '你有在國外工作的經驗嗎？'],
      ['失敗[しっぱい]もいい{経験[けいけん]}になりました。', 'Even the failure became a good experience.', '失敗也成了很好的經驗。'],
    ],
  },
  {
    furigana: '工夫[くふう]', reading: 'くふう', en: 'ingenuity; to devise a way', zh: '巧思；想辦法',
    pos: 'noun', jlpt: 3, topic: 'work-tech', tags: ['する verb'],
    zhLink: 'false-friend',
    zhNoteEn: 'Chinese 工夫 means "time" or "effort" (as in kung fu). Japanese 工夫 means coming up with a clever solution.',
    zhNoteZh: '中文的「工夫」是「時間、功夫」；日文是「動腦筋、想辦法」。',
    sentences: [
      ['説明[せつめい]をわかりやすくするために{工夫[くふう]}しました。', 'I found ways to make the explanation easier to understand.', '為了讓說明更好懂，我花了些巧思。'],
      ['狭[せま]い部屋[へや]でも、{工夫[くふう]}すれば広[ひろ]く使[つか]えます。', 'Even a small room can feel spacious with some creativity.', '房間再小，只要動點腦筋也能用得很寬敞。'],
      ['このアプリは使[つか]いやすいように{工夫[くふう]}されています。', 'This app is cleverly designed to be easy to use.', '這個App在易用性上下了不少功夫。'],
    ],
  },

  // ── Anime & Games ───────────────────────────────────────────
  {
    furigana: '仲間[なかま]', reading: 'なかま', en: 'companion, comrade, teammate', zh: '夥伴；同伴',
    pos: 'noun', jlpt: 3, topic: 'anime-games',
    zhLink: 'nuance',
    zhNoteEn: 'Not used in Chinese. 仲 suggests "between" (as in 仲介), so think "the people you\'re among". Very common in anime.',
    zhNoteZh: '中文不用這個詞；「仲」有「居中」之意（仲介），可想成「身邊的人」。動漫超常見。',
    sentences: [
      ['{仲間[なかま]}と一緒[いっしょ]なら、どんな敵[てき]にも勝[か]てる。', 'With my comrades, I can beat any enemy.', '只要和夥伴在一起，什麼敵人都打得贏。'],
      ['新[あたら]しい{仲間[なかま]}がパーティーに加[くわ]わりました。', 'A new companion joined the party.', '新夥伴加入了隊伍。'],
      ['彼[かれ]は大切[たいせつ]な{仲間[なかま]}です。', "He's a precious comrade.", '他是重要的夥伴。'],
    ],
  },
  {
    furigana: '勇者[ゆうしゃ]', reading: 'ゆうしゃ', en: 'hero (of a fantasy story)', zh: '勇者',
    pos: 'noun', jlpt: null, topic: 'anime-games',
    zhLink: 'same',
    zhNoteEn: 'Same as 勇者, the classic RPG hero.',
    zhNoteZh: '和中文「勇者」相同，就是 RPG 裡的勇者。',
    sentences: [
      ['{勇者[ゆうしゃ]}は魔王[まおう]を倒[たお]すために旅[たび]に出[で]た。', 'The hero set out on a journey to defeat the Demon King.', '勇者為了打倒魔王而踏上旅程。'],
      ['子供[こども]のころ、{勇者[ゆうしゃ]}になりたかった。', 'As a kid, I wanted to be a hero.', '小時候我想成為勇者。'],
      ['このゲームでは{勇者[ゆうしゃ]}の名前[なまえ]を自由[じゆう]に決[き]められる。', "In this game you can choose the hero's name freely.", '這款遊戲可以自由決定勇者的名字。'],
    ],
  },
  {
    furigana: '攻撃[こうげき]', reading: 'こうげき', en: 'attack', zh: '攻擊',
    pos: 'noun', jlpt: 2, topic: 'anime-games', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '撃 is 擊. Same as 攻擊.',
    zhNoteZh: '「撃」就是「擊」，同「攻擊」。',
    sentences: [
      ['敵[てき]の{攻撃[こうげき]}を避[さ]けた。', "I dodged the enemy's attack.", '我躲開了敵人的攻擊。'],
      ['ボスに{攻撃[こうげき]}が効[き]かない。', "Attacks don't work on the boss.", '攻擊對頭目無效。'],
      ['守[まも]るより{攻撃[こうげき]}するほうが好[す]きだ。', 'I prefer attacking to defending.', '比起防守，我更喜歡進攻。'],
    ],
  },
  {
    furigana: '冒険[ぼうけん]', reading: 'ぼうけん', en: 'adventure', zh: '冒險',
    pos: 'noun', jlpt: 2, topic: 'anime-games', tags: ['する verb'],
    zhLink: 'same',
    zhNoteEn: '険 is 險. Same as 冒險.',
    zhNoteZh: '「険」就是「險」，同「冒險」。',
    sentences: [
      ['主人公[しゅじんこう]は世界中[せかいじゅう]を{冒険[ぼうけん]}する。', 'The protagonist adventures across the world.', '主角在世界各地冒險。'],
      ['子供[こども]のころの夏休[なつやす]みは毎日[まいにち]が{冒険[ぼうけん]}だった。', 'Every day of my childhood summer break was an adventure.', '小時候的暑假每天都是一場冒險。'],
      ['{冒険[ぼうけん]}の始[はじ]まりだ！', 'The adventure begins!', '冒險開始了！'],
    ],
  },
  {
    furigana: '声優[せいゆう]', reading: 'せいゆう', en: 'voice actor', zh: '聲優；配音員',
    pos: 'noun', jlpt: null, topic: 'anime-games',
    zhLink: 'same',
    zhNoteEn: '声 is 聲. Taiwanese anime fans already say 聲優.',
    zhNoteZh: '「声」就是「聲」；台灣動漫迷也直接說「聲優」。',
    sentences: [
      ['好[す]きな{声優[せいゆう]}のイベントに行[い]きました。', 'I went to an event for my favorite voice actor.', '我去參加了喜歡的聲優的活動。'],
      ['この{声優[せいゆう]}さんはいろいろなキャラクターを演[えん]じています。', 'This voice actor plays many different characters.', '這位聲優演過很多不同的角色。'],
      ['将来[しょうらい]、{声優[せいゆう]}になるのが夢[ゆめ]です。', 'My dream is to become a voice actor.', '我的夢想是將來成為聲優。'],
    ],
  },
  {
    furigana: '続[つづ]き', reading: 'つづき', en: 'continuation, next part', zh: '後續；續集',
    pos: 'noun', jlpt: 3, topic: 'anime-games',
    zhLink: 'nuance',
    zhNoteEn: '続 is 續, as in 繼續 and 續集. It comes from the verb 続く ("to continue").',
    zhNoteZh: '「続」就是「續」（繼續、續集），來自動詞「続く」（繼續）。',
    sentences: [
      ['早[はや]く{続[つづ]き}が読[よ]みたい！', "I can't wait to read what happens next!", '好想快點看後續！'],
      ['この話[はなし]の{続[つづ]き}は来週[らいしゅう]放送[ほうそう]されます。', 'The next part of this story airs next week.', '這個故事的後續下週播出。'],
      ['ゲームの{続[つづ]き}は明日[あした]やろう。', "Let's continue the game tomorrow.", '遊戲明天再接著玩吧。'],
    ],
  },
  {
    furigana: '主人公[しゅじんこう]', reading: 'しゅじんこう', en: 'protagonist, main character', zh: '主角',
    pos: 'noun', jlpt: 2, topic: 'anime-games',
    zhLink: 'nuance',
    zhNoteEn: '主人公 also exists in literary Chinese, but everyday Chinese says 主角. Don\'t confuse it with 主人 ("master, owner").',
    zhNoteZh: '中文書面語也有「主人公」，口語多說「主角」；別和「主人」（主人、老闆）搞混。',
    sentences: [
      ['この漫画[まんが]の{主人公[しゅじんこう]}は高校生[こうこうせい]です。', 'The protagonist of this manga is a high school student.', '這部漫畫的主角是高中生。'],
      ['{主人公[しゅじんこう]}がついに真実[しんじつ]を知[し]った。', 'The protagonist finally learned the truth.', '主角終於知道了真相。'],
      ['どの作品[さくひん]でも、{主人公[しゅじんこう]}の成長[せいちょう]が好[す]きです。', "In any story, I love watching the protagonist grow.", '不管哪部作品，我都喜歡看主角的成長。'],
    ],
  },
  {
    furigana: '必殺技[ひっさつわざ]', reading: 'ひっさつわざ', en: 'special move, finishing move', zh: '必殺技；絕招',
    pos: 'noun', jlpt: null, topic: 'anime-games',
    zhLink: 'same',
    zhNoteEn: 'Borrowed straight into Chinese as 必殺技. Note that 技 is read わざ here, not ぎ.',
    zhNoteZh: '中文直接借用了「必殺技」；注意這裡的「技」讀「わざ」，不是「ぎ」。',
    sentences: [
      ['最後[さいご]に{必殺技[ひっさつわざ]}でボスを倒[たお]した。', 'I finally beat the boss with my special move.', '最後用必殺技打倒了頭目。'],
      ['{必殺技[ひっさつわざ]}を出[だ]すにはゲージが必要[ひつよう]だ。', 'You need a full gauge to use a special move.', '要放必殺技需要集滿量表。'],
      ['彼[かれ]の{必殺技[ひっさつわざ]}はかっこいい。', 'His special move is cool.', '他的必殺技很帥。'],
    ],
  },
];

/** Hand-picked relations between seed words, by written form. Shared-kanji links are found automatically. */
export const SEED_RELATIONS: [word: string, other: string, kind: RelationKind][] = [
  ['走る', '歩く', 'confusing'],
  ['丈夫', '大丈夫', 'confusing'],
  ['丈夫', '夫', 'confusing'],
  ['友達', '仲間', 'synonym'],
  ['勇者', '主人公', 'synonym'],
  ['出発', '到着', 'antonym'],
];
