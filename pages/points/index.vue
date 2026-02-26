<template>
  <view class="points-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
      <view class="orb orb-3 anim-float"></view>
    </view>

    <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="hero-deco"></view>
      <view class="hero-top">
        <view class="hero-left">
          <view class="hero-label anim-fade-in">我的积分</view>
          <view class="hero-total anim-bounce-in">{{ pointsData.total }}</view>
          <view class="streak anim-fade-in anim-d2" v-if="checkinStatus.streak > 0">
            <text class="streak-icon">🔥</text>
            连续签到 {{ checkinStatus.streak }} 天
          </view>
        </view>
        <view class="hero-actions">
          <button
            :class="['checkin-btn', 'btn-bounce', checkinStatus.checkedIn ? 'disabled' : '']"
            :disabled="checkinStatus.checkedIn"
            @tap="handleCheckin"
          >
            <text class="checkin-icon">{{ checkinStatus.checkedIn ? '✓' : '☀' }}</text>
            {{ checkinStatus.checkedIn ? '已签到' : '签到 +5' }}
          </button>
          <button class="rank-btn btn-bounce anim-scale-in anim-d3" @tap="goRanking">
            <text class="rank-icon">🏆</text>
            排行榜
          </button>
        </view>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d3">
      <text class="section-title">积分规则</text>
      <text class="section-badge">{{ rules.length }}种途径</text>
    </view>

    <view class="rules-grid">
      <view
        v-for="(rule, idx) in rules"
        :key="rule.type"
        :class="['rule-card', 'glass-strong', 'card-press', 'anim-stagger-fade', idx < 8 ? ('anim-d' + (idx + 3)) : '']"
        style="border-radius: 20rpx;"
      >
        <view class="rule-icon-wrap" :class="'rule-tone-' + (idx % 4)">
          {{ ruleIcons[idx] || '📌' }}
        </view>
        <text class="rule-reason">{{ rule.reason }}</text>
        <text class="rule-change">+{{ rule.change }}</text>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d5">
      <text class="section-title">积分明细</text>
      <text class="section-badge">{{ pointsData.entries.length }}条</text>
    </view>

    <view class="ledger glass-strong anim-slide-up anim-d6" style="border-radius: 24rpx;">
      <view v-if="pointsData.entries.length === 0" class="empty-hint">
        <text class="empty-emoji anim-float">📊</text>
        <text>暂无积分记录</text>
      </view>
      <view v-for="entry in pointsData.entries" :key="entry.id" class="ledger-item">
        <view class="ledger-left">
          <text class="ledger-reason">{{ entry.reason }}</text>
          <text class="ledger-time">{{ formatTime(entry.createdAt) }}</text>
        </view>
        <text :class="['ledger-change', entry.change > 0 ? 'positive' : 'negative']">
          {{ entry.change > 0 ? '+' : '' }}{{ entry.change }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { checkin, getCheckinStatus, getMyPoints, getPointsRules } from "@/utils/points-service";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      pointsData: { total: 0, entries: [] },
      checkinStatus: { checkedIn: false, streak: 0 },
      rules: [],
      ruleIcons: ["📅", "📦", "📌", "⭐", "📢", "📖", "🎯", "🤝"],
      loading: false
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; }
  },

  onShow() {
    if (!this.isLogin) {
      uni.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => uni.navigateTo({ url: "/pages/login/login" }), 300);
      return;
    }
    this.loadData();
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    async loadData() {
      this.loading = true;
      try {
        const [pointsData] = await Promise.all([
          getMyPoints().catch(() => ({ total: 0, entries: [] }))
        ]);
        this.pointsData = pointsData;
        this.checkinStatus = getCheckinStatus();
        this.rules = getPointsRules();
      } finally {
        this.loading = false;
      }
    },

    async handleCheckin() {
      if (this.checkinStatus.checkedIn) { return; }
      try {
        const result = await checkin();
        this.checkinStatus = { checkedIn: true, streak: result.streak };
        uni.showToast({ title: `签到成功 +5 积分`, icon: "success" });
        this.pointsData = await getMyPoints().catch(() => this.pointsData);
      } catch (error) {
        if (error?.message === "Already checked in today") {
          uni.showToast({ title: "今天已签到", icon: "none" });
        } else {
          showError(error, { title: "签到失败" });
        }
      }
    },

    goRanking() {
      uni.navigateTo({ url: "/pages/points/ranking" });
    }
  }
};
</script>

<style lang="scss" scoped>
.points-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 10% 4%, rgba(245, 166, 35, 0.12), rgba(245, 166, 35, 0) 45%),
    radial-gradient(circle at 88% 16%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 40%),
    radial-gradient(circle at 50% 60%, rgba(19, 194, 163, 0.05), rgba(19, 194, 163, 0) 40%),
    #f2f5fc;
}

.page-orbs {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.5;
}
.orb-1 {
  width: 200rpx; height: 200rpx;
  top: -30rpx; left: -40rpx;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.3), transparent 70%);
}
.orb-2 {
  width: 160rpx; height: 160rpx;
  top: 320rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%);
}
.orb-3 {
  width: 120rpx; height: 120rpx;
  top: 600rpx; left: 60rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.2), transparent 70%);
}

/* Hero */
.hero {
  position: relative;
  padding: 28rpx;
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.12), transparent);
  pointer-events: none;
}

.hero-top {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}
.hero-left { flex: 1; }
.hero-label {
  color: #7f6a3c;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 0.5rpx;
}
.hero-total {
  color: #d4860a;
  font-size: 64rpx;
  font-weight: 800;
  line-height: 1.2;
  background: linear-gradient(135deg, #d4860a, #f5a623);
  -webkit-background-clip: text;
  background-clip: text;
}
.streak {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #a08540;
  font-size: 22rpx;
  font-weight: 500;
}
.streak-icon { font-size: 22rpx; }

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex-shrink: 0;
}
.checkin-btn {
  margin: 0;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  border: none;
  background: linear-gradient(135deg, #f5a623, #e8920f);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  box-shadow: 0 6rpx 18rpx rgba(245, 166, 35, 0.3);
}
.checkin-btn.disabled {
  background: linear-gradient(135deg, #e0d8c8, #d8d0c0);
  color: #a09580;
  box-shadow: none;
}
.checkin-btn::after { border: none; }
.checkin-icon { font-size: 24rpx; }

.rank-btn {
  margin: 0;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  border: none;
  background: rgba(255, 245, 224, 0.85);
  color: #b07c1a;
  font-size: 22rpx;
  font-weight: 600;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  border: 1rpx solid rgba(245, 166, 35, 0.15);
}
.rank-btn::after { border: none; }
.rank-icon { font-size: 20rpx; }

/* Section Head */
.section-head {
  margin: 26rpx 4rpx 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  color: #1a2540;
  font-size: 29rpx;
  font-weight: 800;
  letter-spacing: 0.5rpx;
}
.section-badge {
  height: 34rpx;
  line-height: 34rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(245, 166, 35, 0.1);
  color: #b07c1a;
  font-size: 20rpx;
  font-weight: 600;
}

/* Rules Grid */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}
.rule-card {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}
.rule-icon-wrap {
  width: 52rpx; height: 52rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  box-shadow: 0 4rpx 10rpx rgba(31, 38, 66, 0.04);
}
.rule-tone-0 { background: linear-gradient(145deg, rgba(255, 242, 224, 0.95), rgba(255, 250, 240, 0.96)); }
.rule-tone-1 { background: linear-gradient(145deg, rgba(224, 239, 255, 0.95), rgba(240, 248, 255, 0.96)); }
.rule-tone-2 { background: linear-gradient(145deg, rgba(224, 248, 240, 0.95), rgba(240, 252, 248, 0.96)); }
.rule-tone-3 { background: linear-gradient(145deg, rgba(242, 236, 255, 0.95), rgba(250, 248, 255, 0.96)); }

.rule-reason {
  color: #3a4a68;
  font-size: 24rpx;
  font-weight: 600;
}
.rule-change {
  color: #d4860a;
  font-size: 26rpx;
  font-weight: 800;
}

/* Ledger */
.ledger {
  padding: 20rpx 24rpx;
}
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  color: $text-placeholder;
  font-size: 24rpx;
  text-align: center;
  padding: 40rpx 0;
}
.empty-emoji { font-size: 44rpx; }

.ledger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
}
.ledger-item:last-child { border-bottom: none; }
.ledger-left { flex: 1; }
.ledger-reason { display: block; color: #2b3a56; font-size: 24rpx; font-weight: 600; }
.ledger-time { display: block; color: #a7afbe; font-size: 20rpx; margin-top: 4rpx; }
.ledger-change { font-size: 28rpx; font-weight: 800; flex-shrink: 0; }
.ledger-change.positive { color: #d4860a; }
.ledger-change.negative { color: #8a95ac; }
</style>
