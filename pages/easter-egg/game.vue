<template>
  <view class="game-page">
    <!-- 背景粒子 -->
    <view class="bg-orbs">
      <view class="bg-orb bg-orb-1"></view>
      <view class="bg-orb bg-orb-2"></view>
      <view class="bg-orb bg-orb-3"></view>
    </view>

    <!-- 开始界面 -->
    <view v-if="phase === 'idle'" class="screen start-screen">
      <view class="game-logo anim-bounce-in">🎯</view>
      <view class="game-title anim-slide-up anim-d1">校园宝物猎手</view>
      <view class="game-subtitle anim-fade-in anim-d2">点击屏幕上出现的 emoji 得分！</view>
      <view class="rule-cards anim-slide-up anim-d3">
        <view class="rule-card">
          <text class="rule-icon">📚</text>
          <text class="rule-text">好物 +1 分</text>
        </view>
        <view class="rule-card rule-bad">
          <text class="rule-icon">💣</text>
          <text class="rule-text">炸弹 −2 分</text>
        </view>
        <view class="rule-card rule-powerup">
          <text class="rule-icon">⏰</text>
          <text class="rule-text">道具加时</text>
        </view>
        <view class="rule-card rule-time">
          <text class="rule-icon">🔥</text>
          <text class="rule-text">连击加分</text>
        </view>
      </view>
      <view class="best-score anim-fade-in anim-d4" v-if="bestScore > 0">
        <text>🏆 最高记录：{{ bestScore }} 分</text>
      </view>
      <view class="start-btn btn-bounce anim-scale-in anim-d5" @tap="beginCountdown">
        <text class="start-btn-text">开始挑战</text>
        <text class="start-btn-icon">▶</text>
      </view>
    </view>

    <!-- 3-2-1 倒计时 -->
    <view v-if="phase === 'countdown'" class="screen countdown-screen">
      <text :key="countdownNum" class="countdown-num">{{ countdownNum }}</text>
    </view>

    <!-- 游戏进行中 -->
    <view v-if="phase === 'playing'" class="screen play-screen" @tap="onMiss">
      <!-- 顶部 HUD -->
      <view class="hud">
        <view class="hud-item hud-score">
          <text class="hud-label">得分</text>
          <text :class="['hud-value', scoreFlash ? 'score-flash' : '']">{{ score }}</text>
        </view>
        <view class="hud-item hud-timer-wrap" :class="{ 'timer-warn': timeLeft <= 5 }">
          <text class="hud-label">剩余</text>
          <text class="hud-value">{{ timeLeft }}s</text>
          <view class="timer-bar">
            <view class="timer-bar-fill" :style="{ width: timerPercent + '%' }"></view>
          </view>
        </view>
        <view class="hud-item hud-combo-wrap">
          <text class="hud-label">连击</text>
          <text class="hud-value">{{ combo }}</text>
        </view>
      </view>

      <!-- 连击里程碑 -->
      <view v-if="comboMilestone" class="combo-milestone">
        <text class="combo-milestone-text">{{ comboMilestone }}</text>
      </view>

      <!-- 游戏区域 -->
      <view class="game-area" id="gameArea">
        <view
          v-for="item in activeItems"
          :key="item.id"
          :class="['game-item', item.popping ? 'item-pop' : 'item-enter', item.bad ? 'item-bad' : '', item.powerup ? 'item-powerup' : '', 'item-size-' + (item.sizeClass || 'md')]"
          :style="{ left: item.x + '%', top: item.y + '%' }"
          @tap.stop="onTapItem(item)"
        >
          <text class="item-emoji">{{ item.emoji }}</text>
        </view>
      </view>

      <!-- 得分飘字 -->
      <view
        v-for="f in floatTexts"
        :key="f.id"
        :class="['float-text', f.type]"
        :style="{ left: f.x + '%', top: f.y + '%' }"
      >{{ f.text }}</view>

      <!-- 炸弹闪屏 -->
      <view v-if="bombFlash" class="bomb-flash"></view>
    </view>

    <!-- 结束界面 -->
    <view v-if="phase === 'end'" class="screen end-screen">
      <view class="end-emoji anim-bounce-in">{{ endEmoji }}</view>
      <view class="end-title anim-slide-up anim-d1">挑战结束！</view>
      <view class="end-score anim-scale-in anim-d2">
        <text class="end-score-num">{{ displayScore }}</text>
        <text class="end-score-unit">分</text>
      </view>
      <view class="end-msg anim-fade-in anim-d3">{{ endMessage }}</view>
      <view class="end-stats anim-slide-up anim-d3">
        <view class="end-stat">
          <text class="end-stat-val">{{ totalTaps }}</text>
          <text class="end-stat-lbl">命中</text>
        </view>
        <view class="end-stat">
          <text class="end-stat-val">{{ totalMisses }}</text>
          <text class="end-stat-lbl">漏掉</text>
        </view>
        <view class="end-stat">
          <text class="end-stat-val">{{ maxCombo }}x</text>
          <text class="end-stat-lbl">最高连击</text>
        </view>
        <view class="end-stat" v-if="isNewBest">
          <text class="end-stat-val new-record">🏆</text>
          <text class="end-stat-lbl new-record-lbl">新纪录！</text>
        </view>
      </view>
      <view class="end-actions anim-slide-up anim-d4">
        <view class="retry-btn btn-bounce" @tap="beginCountdown">再来一局</view>
        <view class="share-btn" @tap="shareScore">分享战绩</view>
        <view class="back-btn" @tap="goBack">返回</view>
      </view>
    </view>
  </view>
</template>

<script>
const GOOD_EMOJIS = ["📚", "🎒", "⭐", "💎", "🎁", "🍀", "🎓", "✏️", "🏀", "🎸", "💻", "🧸", "🍕", "🧋", "🎵"];
const BAD_EMOJIS  = ["💣", "👻", "🌀"];
const POWERUP_ITEMS = [
  { emoji: "⏰", type: "time",  label: "+3s" },
  { emoji: "💰", type: "score", label: "+5" },
];
const SIZES = ["sm", "md", "lg"];
const COMBO_MILESTONES = {
  5:  "🔥 5连击！手感不错！",
  10: "⚡ 10连击！太强了！",
  15: "💥 15连击！无人能挡！",
  20: "👑 20连击！你是传说！",
};

const END_MESSAGES = {
  god:    ["你是校园之神！无人能及！🏆", "逆天操作！同学们都惊呆了！", "满分选手就是你！传说级别！"],
  great:  ["太厉害了！手速惊人！🔥", "大佬级别！再接再厉！", "眼疾手快，校园猎手名不虚传！"],
  good:   ["不错不错！潜力无限~", "干得漂亮！下次冲击更高分！", "很有天赋！继续练习吧~"],
  normal: ["还行还行，热身完毕！", "慢慢来，下次更快~", "初次体验，下次一定更好！"],
  low:    ["emmm...再试一次？💪", "手速需要锻炼一下哦~", "别灰心！多玩几次就上手了~"],
};

const GAME_DURATION = 30;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _itemId = 0;
let _floatId = 0;

export default {
  data() {
    return {
      phase: "idle",
      countdownNum: 3,
      score: 0,
      displayScore: 0,
      timeLeft: GAME_DURATION,
      combo: 0,
      maxCombo: 0,
      totalTaps: 0,
      totalMisses: 0,
      bestScore: 0,
      isNewBest: false,
      scoreFlash: false,
      bombFlash: false,
      comboMilestone: "",
      activeItems: [],
      floatTexts: [],
      spawnTimer: null,
      tickTimer: null,
      cleanTimer: null,
    };
  },

  computed: {
    timerPercent() {
      return Math.max(0, (this.timeLeft / GAME_DURATION) * 100);
    },

    endEmoji() {
      if (this.score >= 50) return "👑";
      if (this.score >= 35) return "🔥";
      if (this.score >= 20) return "😎";
      if (this.score >= 8) return "😊";
      return "💪";
    },

    endMessage() {
      let tier = "low";
      if (this.score >= 50) tier = "god";
      else if (this.score >= 35) tier = "great";
      else if (this.score >= 20) tier = "good";
      else if (this.score >= 8) tier = "normal";
      return pickRandom(END_MESSAGES[tier]);
    },
  },

  onLoad() {
    try {
      const saved = uni.getStorageSync("egg_game_best");
      if (saved) this.bestScore = Number(saved) || 0;
    } catch (e) {}
  },

  onUnload() {
    this.clearTimers();
  },

  onHide() {
    if (this.phase === "playing") {
      this.endGame();
    }
  },

  methods: {
    clearTimers() {
      if (this.spawnTimer) { clearInterval(this.spawnTimer); this.spawnTimer = null; }
      if (this.tickTimer)  { clearInterval(this.tickTimer);  this.tickTimer = null; }
      if (this.cleanTimer) { clearInterval(this.cleanTimer); this.cleanTimer = null; }
    },

    // ---- 3-2-1 倒计时 ----
    beginCountdown() {
      this.phase = "countdown";
      this.countdownNum = 3;
      const cdTimer = setInterval(() => {
        this.countdownNum -= 1;
        uni.vibrateShort && uni.vibrateShort({ type: "light" });
        if (this.countdownNum <= 0) {
          clearInterval(cdTimer);
          this.startGame();
        }
      }, 700);
    },

    startGame() {
      this.clearTimers();
      this.phase = "playing";
      this.score = 0;
      this.displayScore = 0;
      this.timeLeft = GAME_DURATION;
      this.combo = 0;
      this.maxCombo = 0;
      this.totalTaps = 0;
      this.totalMisses = 0;
      this.isNewBest = false;
      this.bombFlash = false;
      this.comboMilestone = "";
      this.activeItems = [];
      this.floatTexts = [];
      _itemId = 0;
      _floatId = 0;

      this.tickTimer = setInterval(() => {
        this.timeLeft -= 1;
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }, 1000);

      this.spawnTimer = setInterval(() => {
        this.spawnItem();
      }, this.getSpawnInterval());

      this.cleanTimer = setInterval(() => {
        this.cleanExpired();
      }, 400);
    },

    getSpawnInterval() {
      const elapsed = GAME_DURATION - this.timeLeft;
      if (elapsed < 8)  return 950;
      if (elapsed < 16) return 720;
      if (elapsed < 24) return 520;
      return 380;
    },

    spawnItem() {
      if (this.spawnTimer) {
        clearInterval(this.spawnTimer);
        this.spawnTimer = setInterval(() => this.spawnItem(), this.getSpawnInterval());
      }

      const roll = Math.random();
      let isBad = false;
      let isPowerup = false;
      let emoji, powerupType, label;

      if (roll < 0.06) {
        isPowerup = true;
        const pu = pickRandom(POWERUP_ITEMS);
        emoji = pu.emoji;
        powerupType = pu.type;
        label = pu.label;
      } else if (roll < 0.22) {
        isBad = true;
        emoji = pickRandom(BAD_EMOJIS);
      } else {
        emoji = pickRandom(GOOD_EMOJIS);
      }

      const sizeClass = pickRandom(SIZES);
      const baseTtl = isBad ? 2400 : isPowerup ? 2000 : 1500;
      const sizeMult = sizeClass === "sm" ? 0.8 : sizeClass === "lg" ? 1.3 : 1;

      const id = ++_itemId;
      this.activeItems.push({
        id,
        emoji,
        bad: isBad,
        powerup: isPowerup,
        powerupType: powerupType || null,
        powerupLabel: label || null,
        sizeClass,
        x: 5 + Math.random() * 78,
        y: 14 + Math.random() * 62,
        popping: false,
        born: Date.now(),
        ttl: Math.round(baseTtl * sizeMult),
      });

      if (this.activeItems.length > 10) {
        this.activeItems.splice(0, 1);
      }
    },

    addFloatText(text, x, y, type) {
      const fid = ++_floatId;
      this.floatTexts.push({ id: fid, text, x, y, type });
      setTimeout(() => {
        this.floatTexts = this.floatTexts.filter((f) => f.id !== fid);
      }, 800);
    },

    onTapItem(item) {
      if (item.popping) return;
      item.popping = true;
      this.totalTaps += 1;

      let delta = 0;
      let floatType = "float-good";

      if (item.powerup) {
        if (item.powerupType === "time") {
          this.timeLeft = Math.min(this.timeLeft + 3, GAME_DURATION + 5);
          this.addFloatText("⏰ +3s", item.x, item.y - 5, "float-powerup");
        } else if (item.powerupType === "score") {
          delta = 5;
          floatType = "float-powerup";
        }
        this.combo += 1;
      } else if (item.bad) {
        delta = -2;
        this.combo = 0;
        floatType = "float-bad";
        this.triggerBombFlash();
      } else {
        delta = 1;
        this.combo += 1;
        if (this.combo >= 5)  delta += 1;
        if (this.combo >= 10) delta += 1;
        if (this.combo >= 20) delta += 1;
        if (item.sizeClass === "sm") delta += 1;
      }

      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      if (delta !== 0) {
        this.score += delta;
        if (this.score < 0) this.score = 0;
        this.addFloatText(delta > 0 ? `+${delta}` : `${delta}`, item.x, item.y - 5, floatType);
      }

      this.scoreFlash = true;
      setTimeout(() => { this.scoreFlash = false; }, 200);

      this.checkComboMilestone();

      setTimeout(() => {
        this.activeItems = this.activeItems.filter((i) => i.id !== item.id);
      }, 250);

      uni.vibrateShort && uni.vibrateShort({ type: item.bad ? "heavy" : "light" });
    },

    triggerBombFlash() {
      this.bombFlash = true;
      setTimeout(() => { this.bombFlash = false; }, 300);
    },

    checkComboMilestone() {
      const msg = COMBO_MILESTONES[this.combo];
      if (msg) {
        this.comboMilestone = msg;
        setTimeout(() => { this.comboMilestone = ""; }, 1500);
      }
    },

    onMiss() {
      if (this.combo > 0) {
        this.combo = 0;
      }
    },

    cleanExpired() {
      const now = Date.now();
      const before = this.activeItems.length;
      this.activeItems = this.activeItems.filter((item) => {
        if (item.popping) return false;
        return (now - item.born) < item.ttl;
      });
      const expired = before - this.activeItems.length;
      if (expired > 0) {
        this.totalMisses += expired;
      }
    },

    endGame() {
      this.clearTimers();
      this.phase = "end";
      this.timeLeft = 0;

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.isNewBest = true;
        try {
          uni.setStorageSync("egg_game_best", String(this.score));
        } catch (e) {}
      }

      this.animateScore();
    },

    animateScore() {
      const target = this.score;
      this.displayScore = 0;
      if (target === 0) return;
      const step = Math.max(1, Math.ceil(target / 30));
      const anim = setInterval(() => {
        this.displayScore += step;
        if (this.displayScore >= target) {
          this.displayScore = target;
          clearInterval(anim);
        }
      }, 35);
    },

    shareScore() {
      uni.setClipboardData({
        data: `🎯 校园宝物猎手 | 我拿了 ${this.score} 分！最高连击 ${this.maxCombo}x ${this.isNewBest ? '🏆新纪录！' : ''} 来挑战我吧~`,
        success() {
          uni.showToast({ title: "战绩已复制，去分享给朋友吧~", icon: "none", duration: 2000 });
        },
      });
    },

    goBack() {
      uni.navigateBack();
    },
  },
};
</script>

<style lang="scss" scoped>
.game-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(99, 102, 241, 0.15), transparent 55%),
    radial-gradient(ellipse at 80% 85%, rgba(16, 185, 129, 0.12), transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.06), transparent 60%),
    #0f172a;
}

/* ---- 背景粒子 ---- */
.bg-orbs { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
.bg-orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(50rpx);
}
.bg-orb-1 {
  width: 300rpx; height: 300rpx;
  top: -60rpx; left: -80rpx;
  background: radial-gradient(circle, #6366f1, transparent 70%);
  animation: orb-drift-1 8s ease-in-out infinite alternate;
}
.bg-orb-2 {
  width: 200rpx; height: 200rpx;
  bottom: 100rpx; right: -40rpx;
  background: radial-gradient(circle, #10b981, transparent 70%);
  animation: orb-drift-2 10s ease-in-out infinite alternate;
}
.bg-orb-3 {
  width: 160rpx; height: 160rpx;
  top: 40%; left: 50%;
  background: radial-gradient(circle, #f59e0b, transparent 70%);
  animation: orb-drift-1 12s ease-in-out infinite alternate-reverse;
}
@keyframes orb-drift-1 {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(40rpx, 30rpx); }
}
@keyframes orb-drift-2 {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(-30rpx, -40rpx); }
}

/* ---- 通用界面 ---- */
.screen {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
}

/* ============ 开始界面 ============ */
.start-screen { justify-content: center; }
.game-logo { font-size: 120rpx; margin-bottom: 20rpx; }
.game-title {
  font-size: 52rpx;
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: 4rpx;
  text-shadow: 0 4rpx 20rpx rgba(99, 102, 241, 0.5);
}
.game-subtitle { margin-top: 16rpx; font-size: 26rpx; color: #94a3b8; }
.rule-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14rpx;
  margin-top: 48rpx;
}
.rule-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(99, 102, 241, 0.12);
  border: 1rpx solid rgba(99, 102, 241, 0.2);
}
.rule-bad {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.2);
}
.rule-powerup {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.2);
}
.rule-time {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.2);
}
.rule-icon { font-size: 36rpx; }
.rule-text { font-size: 21rpx; color: #cbd5e1; }
.best-score {
  margin-top: 36rpx;
  color: #fbbf24;
  font-size: 26rpx;
  font-weight: 600;
}
.start-btn {
  margin-top: 48rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 56rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow:
    0 8rpx 30rpx rgba(99, 102, 241, 0.45),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.15);
}
.start-btn-text { color: #fff; font-size: 30rpx; font-weight: 700; }
.start-btn-icon { color: rgba(255, 255, 255, 0.7); font-size: 24rpx; }

/* ============ 3-2-1 倒计时 ============ */
.countdown-screen { justify-content: center; }
.countdown-num {
  font-size: 200rpx;
  font-weight: 900;
  color: #f1f5f9;
  text-shadow: 0 0 60rpx rgba(99, 102, 241, 0.6), 0 0 120rpx rgba(99, 102, 241, 0.3);
  animation: cd-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes cd-pop {
  0%   { opacity: 0; transform: scale(2.5); }
  50%  { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

/* ============ 游戏界面 ============ */
.play-screen { padding: 0; }
.hud {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  padding-top: calc(16rpx + env(safe-area-inset-top, 0));
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(99, 102, 241, 0.15);
}
.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}
.hud-label { font-size: 20rpx; color: #64748b; font-weight: 500; }
.hud-value {
  font-size: 36rpx;
  font-weight: 800;
  color: #f1f5f9;
  transition: transform 0.15s, color 0.15s;
}
.score-flash { transform: scale(1.3); color: #fbbf24; }

/* 计时进度条 */
.hud-timer-wrap { align-items: center; min-width: 140rpx; }
.timer-bar {
  margin-top: 6rpx;
  width: 120rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.timer-bar-fill {
  height: 100%;
  border-radius: 3rpx;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  transition: width 0.9s linear;
}
.timer-warn .timer-bar-fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
}
.timer-warn .hud-value {
  color: #ef4444;
  animation: timer-pulse 0.5s ease-in-out infinite;
}
@keyframes timer-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.15); }
}

/* 连击里程碑 */
.combo-milestone {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 30;
  pointer-events: none;
  animation: milestone-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.combo-milestone-text {
  font-size: 36rpx;
  font-weight: 900;
  color: #fbbf24;
  text-shadow: 0 4rpx 20rpx rgba(251, 191, 36, 0.6);
  padding: 16rpx 36rpx;
  border-radius: 20rpx;
  background: rgba(15, 23, 42, 0.8);
  border: 1rpx solid rgba(251, 191, 36, 0.3);
}
@keyframes milestone-in {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* ---- 游戏区域 ---- */
.game-area { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }
.game-item {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  z-index: 5;
}
.item-emoji { pointer-events: none; }

/* 三种尺寸 */
.item-size-sm { width: 72rpx; height: 72rpx; }
.item-size-sm .item-emoji { font-size: 38rpx; }
.item-size-md { width: 90rpx; height: 90rpx; }
.item-size-md .item-emoji { font-size: 48rpx; }
.item-size-lg { width: 110rpx; height: 110rpx; }
.item-size-lg .item-emoji { font-size: 58rpx; }

.item-enter { animation: item-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.item-pop   { animation: item-pop-out 0.25s ease forwards; }

.item-bad {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 16rpx rgba(239, 68, 68, 0.2);
}
.item-powerup {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 20rpx rgba(16, 185, 129, 0.3);
  animation: item-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, powerup-glow 0.8s ease-in-out infinite alternate;
}
@keyframes powerup-glow {
  0%   { box-shadow: 0 0 16rpx rgba(16, 185, 129, 0.2); }
  100% { box-shadow: 0 0 30rpx rgba(16, 185, 129, 0.5); }
}
@keyframes item-pop-in {
  0%   { opacity: 0; transform: scale(0); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes item-pop-out {
  0%   { opacity: 1; transform: scale(1); }
  50%  { opacity: 0.8; transform: scale(1.4); }
  100% { opacity: 0; transform: scale(0); }
}

/* ---- 炸弹闪屏 ---- */
.bomb-flash {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 25;
  pointer-events: none;
  background: rgba(239, 68, 68, 0.2);
  animation: bomb-flash-anim 0.3s ease-out forwards;
}
@keyframes bomb-flash-anim {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}

/* ---- 得分飘字 ---- */
.float-text {
  position: fixed;
  z-index: 20;
  font-size: 36rpx;
  font-weight: 900;
  pointer-events: none;
  animation: float-up 0.7s ease-out forwards;
}
.float-good    { color: #4ade80; text-shadow: 0 2rpx 10rpx rgba(74, 222, 128, 0.5); }
.float-bad     { color: #f87171; text-shadow: 0 2rpx 10rpx rgba(248, 113, 113, 0.5); }
.float-powerup { color: #34d399; font-size: 32rpx; text-shadow: 0 2rpx 12rpx rgba(52, 211, 153, 0.6); }
@keyframes float-up {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-80rpx) scale(1.3); }
}

/* ============ 结束界面 ============ */
.end-screen { justify-content: center; }
.end-emoji { font-size: 100rpx; margin-bottom: 16rpx; }
.end-title { font-size: 40rpx; font-weight: 800; color: #e2e8f0; }
.end-score {
  margin-top: 24rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.end-score-num {
  font-size: 96rpx;
  font-weight: 900;
  color: #fbbf24;
  text-shadow: 0 4rpx 24rpx rgba(251, 191, 36, 0.4);
  line-height: 1;
}
.end-score-unit { font-size: 30rpx; color: #94a3b8; font-weight: 600; }
.end-msg { margin-top: 16rpx; font-size: 26rpx; color: #94a3b8; text-align: center; }
.end-stats {
  margin-top: 40rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 32rpx;
}
.end-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.end-stat-val { font-size: 36rpx; font-weight: 800; color: #f1f5f9; }
.end-stat-lbl { font-size: 22rpx; color: #64748b; }
.new-record { animation: record-pulse 0.6s ease-in-out infinite alternate; }
.new-record-lbl { color: #fbbf24; font-weight: 600; }
@keyframes record-pulse {
  0%   { transform: scale(1); }
  100% { transform: scale(1.25); }
}
.end-actions {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 30rpx rgba(99, 102, 241, 0.4);
}
.share-btn {
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  background: rgba(99, 102, 241, 0.12);
  border: 1rpx solid rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
  font-size: 26rpx;
  font-weight: 600;
}
.back-btn { padding: 12rpx 40rpx; color: #64748b; font-size: 26rpx; }
</style>
