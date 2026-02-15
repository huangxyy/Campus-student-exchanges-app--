/**
 * 🎉 校园跳蚤市场 — 彩蛋系统
 *
 * 包含：连击检测器、节日主题、粒子效果数据、趣味文案
 */

// ==================== 连击检测器 ====================

/**
 * 创建多次点击检测器
 * @param {number} threshold  需要点击的次数
 * @param {number} interval   两次点击最大间隔 (ms)
 * @param {Function} onTrigger 触发回调
 * @returns {{ tap: Function, reset: Function }}
 */
export function createTapCounter(threshold = 5, interval = 400, onTrigger = () => {}) {
  let count = 0;
  let timer = null;

  function reset() {
    count = 0;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function tap() {
    count += 1;
    if (timer) clearTimeout(timer);

    if (count >= threshold) {
      reset();
      onTrigger();
      return true;
    }

    timer = setTimeout(reset, interval);
    return false;
  }

  return { tap, reset };
}

// ==================== 节日 / 主题检测 ====================

const FESTIVALS = [
  { name: "元旦",       month: 1,  day: 1,  emoji: "🎆", theme: "newyear",   greeting: "新年快乐！新的一年继续淘好物~" },
  { name: "情人节",     month: 2,  day: 14, emoji: "💝", theme: "valentine",  greeting: "情人节快乐！送TA一份校园好礼~" },
  { name: "妇女节",     month: 3,  day: 8,  emoji: "🌸", theme: "spring",     greeting: "女神节快乐！" },
  { name: "愚人节",     month: 4,  day: 1,  emoji: "🤡", theme: "fool",       greeting: "今天的商品...都是真的啦！" },
  { name: "劳动节",     month: 5,  day: 1,  emoji: "💪", theme: "labor",      greeting: "劳动最光荣！五一快乐~" },
  { name: "儿童节",     month: 6,  day: 1,  emoji: "🎈", theme: "children",   greeting: "谁还不是个宝宝呢~ 儿童节快乐！" },
  { name: "教师节",     month: 9,  day: 10, emoji: "🍎", theme: "teacher",    greeting: "老师辛苦了！教师节快乐~" },
  { name: "国庆节",     month: 10, day: 1,  emoji: "🇨🇳", theme: "national",   greeting: "祖国生日快乐！国庆假期愉快~" },
  { name: "万圣节",     month: 10, day: 31, emoji: "🎃", theme: "halloween",  greeting: "Trick or Treat! 🎃" },
  { name: "双十一",     month: 11, day: 11, emoji: "🛍️", theme: "shopping",   greeting: "双十一不如来校园淘！比网购更快~" },
  { name: "平安夜",     month: 12, day: 24, emoji: "🎄", theme: "christmas",  greeting: "平安夜快乐！🎄" },
  { name: "圣诞节",     month: 12, day: 25, emoji: "🎅", theme: "christmas",  greeting: "Merry Christmas! 圣诞快乐~" },
  { name: "跨年",       month: 12, day: 31, emoji: "✨", theme: "newyear",    greeting: "最后一天！准备迎接新年吧~" },
];

/**
 * 获取当前节日主题（如果今天是节日）
 * @returns {{ name, emoji, theme, greeting } | null}
 */
export function getFestivalTheme() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return FESTIVALS.find((f) => f.month === m && f.day === d) || null;
}

/**
 * 获取当前季节主题
 * @returns {'spring'|'summer'|'autumn'|'winter'}
 */
export function getSeasonTheme() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

// ==================== 彩蛋粒子 emoji 集合 ====================

export const PARTICLE_SETS = {
  confetti:  ["🎉", "🎊", "✨", "⭐", "💫", "🌟", "🥳", "🎆"],
  hearts:    ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝"],
  nature:    ["🌸", "🌺", "🍀", "🌻", "🌈", "🦋", "🌷", "🍃"],
  food:      ["🍕", "🍔", "🍟", "🧋", "🍦", "🍩", "🎂", "🍪"],
  campus:    ["📚", "🎓", "✏️", "🏫", "⚽", "🎸", "💻", "🎒"],
  halloween: ["🎃", "👻", "🦇", "🕸️", "💀", "🧙", "🕯️", "🍬"],
  christmas: ["🎄", "🎅", "⛄", "🎁", "🔔", "❄️", "🦌", "🌟"],
  spring:    ["🌸", "🌺", "🐝", "🌷", "🦋", "🌱", "🐣", "☘️"],
  summer:    ["☀️", "🌊", "🍉", "🌴", "🏖️", "🍧", "🌻", "⛱️"],
  autumn:    ["🍂", "🍁", "🎃", "🌾", "🍄", "🦊", "🌰", "🍎"],
  winter:    ["❄️", "⛄", "🧣", "☕", "🎿", "🌨️", "🏔️", "🧤"],
};

/**
 * 获取当天适合的粒子 emoji 集合
 */
export function getTodayParticles() {
  const festival = getFestivalTheme();
  if (festival && PARTICLE_SETS[festival.theme]) {
    return PARTICLE_SETS[festival.theme];
  }
  return PARTICLE_SETS[getSeasonTheme()] || PARTICLE_SETS.confetti;
}

// ==================== 趣味文案 ====================

const FUN_SEARCH_PLACEHOLDERS = [
  "搜索你的梦中情物...",
  "听说隔壁寝室在卖Switch？",
  "输入关键词，发现校园宝藏~",
  "搜一搜，也许有惊喜！",
  "今天想淘点什么呢？",
  "二手不二价，校园好物多~",
  "有人在找你的闲置哦~",
  "搜索你的下一个宝贝...",
  "今日份的快乐，从淘货开始！",
  "室友的好物，也许正在打折~",
];

/**
 * 获取随机趣味搜索占位文案
 */
export function getRandomSearchPlaceholder() {
  return FUN_SEARCH_PLACEHOLDERS[Math.floor(Math.random() * FUN_SEARCH_PLACEHOLDERS.length)];
}

const FUN_FACTS = [
  "你知道吗？校园二手交易平均节省40%的开支！",
  "今日冷知识：最受欢迎的二手商品是教材 📚",
  "有趣的是：周三下午是发布商品的高峰期~",
  "小贴士：好评率高的卖家，商品更容易被推荐 ⭐",
  "据说连续签到7天会有神秘奖励...🤫",
  "校园跳蚤市场的第一笔交易是一本高数课本！",
  "你是今天第一个发现这个彩蛋的人！（也许）",
  "开发者寄语：愿每一笔交易都温暖而美好 💙",
  "彩蛋发现！你的运气今天+10 🍀",
  "恭喜你发现了隐藏功能！你真是太细心了~",
];

/**
 * 获取随机趣味事实
 */
export function getRandomFunFact() {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

const AVATAR_SECRETS = [
  "嘿！你发现了我的秘密！✨",
  "被你抓到了！这是隐藏动画~",
  "头像彩蛋已激活！你真厉害 🎉",
  "哇，你居然长按了我！",
  "解锁成就：好奇心满满 🏆",
];

export function getRandomAvatarSecret() {
  return AVATAR_SECRETS[Math.floor(Math.random() * AVATAR_SECRETS.length)];
}

const CHAT_SECRETS = [
  "消息彩蛋！今天和朋友多聊聊吧 💬",
  "你发现了消息中心的秘密！",
  "连击达人！每一条消息都值得认真回复~",
  "彩蛋解锁：社交达人 🌟",
  "隐藏成就：消息中心探索者 🔍",
];

export function getRandomChatSecret() {
  return CHAT_SECRETS[Math.floor(Math.random() * CHAT_SECRETS.length)];
}

// ==================== 节日浮动粒子数据生成 ====================

/**
 * 生成节日浮动粒子数据（用于模板 v-for 渲染）
 * @param {number} count 粒子数量
 * @returns {Array<{id, emoji, left, delay, duration, size}>}
 */
export function generateFloatingParticles(count = 6) {
  const emojis = getTodayParticles();
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `p-${i}`,
      emoji: emojis[i % emojis.length],
      left: Math.round(5 + Math.random() * 85),       // 5%~90%
      delay: (Math.random() * 4).toFixed(1),            // 0~4s
      duration: (5 + Math.random() * 5).toFixed(1),     // 5~10s
      size: Math.round(24 + Math.random() * 16),        // 24~40rpx font-size
    });
  }
  return particles;
}
