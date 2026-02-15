<template>
  <view class="points-page">
    <view class="hero card anim-slide-down">
      <view class="hero-top">
        <view>
          <view class="hero-label">我的积分</view>
          <view class="hero-total">{{ pointsData.total }}</view>
        </view>
        <button
          :class="['checkin-btn', 'btn-bounce', checkinStatus.checkedIn ? 'disabled' : '']"
          size="mini"
          :disabled="checkinStatus.checkedIn"
          @tap="handleCheckin"
        >{{ checkinStatus.checkedIn ? '已签到' : '签到 +5' }}</button>
      </view>
      <view class="streak" v-if="checkinStatus.streak > 0">连续签到 {{ checkinStatus.streak }} 天</view>
      <view class="hero-actions">
        <button class="rank-btn btn-bounce" size="mini" @tap="goRanking">积分排行</button>
      </view>
    </view>

    <view class="section card anim-slide-up anim-d1">
      <view class="section-title">积分规则</view>
      <view v-for="rule in rules" :key="rule.type" class="rule-item">
        <text class="rule-reason">{{ rule.reason }}</text>
        <text class="rule-change">+{{ rule.change }}</text>
      </view>
    </view>

    <view class="section card anim-slide-up anim-d2">
      <view class="section-title">积分明细</view>
      <view v-if="pointsData.entries.length === 0" class="empty-hint">暂无积分记录</view>
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
import { getMyPoints, checkin, getCheckinStatus, getPointsRules } from "@/utils/points-service";

export default {
  data() {
    return {
      pointsData: { total: 0, entries: [] },
      checkinStatus: { checkedIn: false, streak: 0 },
      rules: []
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
      this.pointsData = await getMyPoints().catch(() => ({ total: 0, entries: [] }));
      this.checkinStatus = getCheckinStatus();
      this.rules = getPointsRules();
    },

    async handleCheckin() {
      if (this.checkinStatus.checkedIn) { return; }
      try {
        const result = await checkin();
        this.checkinStatus = { checkedIn: true, streak: result.streak };
        uni.showToast({ title: `签到成功 +5 积分`, icon: "success" });
        this.pointsData = await getMyPoints().catch(() => this.pointsData);
      } catch (error) {
        const msg = error?.message === "Already checked in today" ? "今天已签到" : "签到失败";
        uni.showToast({ title: msg, icon: "none" });
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
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 50% 0%, rgba(245, 166, 35, 0.1), rgba(245, 166, 35, 0) 60%), #f2f5fb;
}
.hero {
  padding: 28rpx;
  background: linear-gradient(140deg, rgba(255, 248, 230, 0.96), rgba(255, 252, 240, 0.98)), #ffffff;
  border: 1rpx solid #f5e3b0;
}
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; }
.hero-label { color: #7f6a3c; font-size: 24rpx; }
.hero-total { color: #d4860a; font-size: 64rpx; font-weight: 800; line-height: 1.2; }
.checkin-btn {
  margin: 0; height: 64rpx; line-height: 64rpx; border-radius: 32rpx; border: none;
  background: linear-gradient(135deg, #f5a623, #e8920f); color: #fff; font-size: 24rpx; padding: 0 28rpx;
}
.checkin-btn.disabled { background: #e0d8c8; color: #a09580; }
.checkin-btn::after { border: none; }
.streak { margin-top: 10rpx; color: #a08540; font-size: 22rpx; }
.hero-actions { margin-top: 16rpx; display: flex; gap: 10rpx; }
.rank-btn {
  margin: 0; height: 52rpx; line-height: 52rpx; border-radius: 26rpx; border: none;
  background: #fff5e0; color: #b07c1a; font-size: 22rpx; padding: 0 24rpx;
}
.rank-btn::after { border: none; }
.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 27rpx; font-weight: 600; margin-bottom: 14rpx; }
.rule-item { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 0; }
.rule-reason { color: #4f5d75; font-size: 24rpx; }
.rule-change { color: #d4860a; font-size: 24rpx; font-weight: 700; }
.empty-hint { color: #8a93a7; font-size: 24rpx; text-align: center; padding: 30rpx 0; }
.ledger-item { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f0f2f8; }
.ledger-item:last-child { border-bottom: none; }
.ledger-left { flex: 1; }
.ledger-reason { display: block; color: #2b3345; font-size: 24rpx; }
.ledger-time { display: block; color: #8a93a7; font-size: 20rpx; margin-top: 4rpx; }
.ledger-change { font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.ledger-change.positive { color: #d4860a; }
.ledger-change.negative { color: #6e7b92; }
</style>
