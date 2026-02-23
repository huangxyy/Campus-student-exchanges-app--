<template>
  <view class="ranking-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-content">
        <text class="banner-emoji anim-bounce-in">🏆</text>
        <view>
          <view class="banner-title">积分排行榜</view>
          <view class="banner-desc">校园积分达人，看看谁最活跃</view>
        </view>
      </view>
    </view>

    <!-- Top 3 Podium -->
    <view v-if="list.length >= 3" class="podium anim-slide-up anim-d2">
      <view class="podium-item second anim-stagger-fade anim-d3" @tap="() => {}">
        <view class="podium-medal">🥈</view>
        <view class="podium-avatar glass">{{ getUserInitial(list[1]) }}</view>
        <text class="podium-name">{{ getUserName(list[1]) }}</text>
        <text class="podium-score">{{ list[1].total }}分</text>
        <view class="podium-bar bar-2"></view>
      </view>
      <view class="podium-item first anim-stagger-fade anim-d2" @tap="() => {}">
        <view class="podium-medal anim-float">🥇</view>
        <view class="podium-avatar glass crown">{{ getUserInitial(list[0]) }}</view>
        <text class="podium-name">{{ getUserName(list[0]) }}</text>
        <text class="podium-score">{{ list[0].total }}分</text>
        <view class="podium-bar bar-1"></view>
      </view>
      <view class="podium-item third anim-stagger-fade anim-d4" @tap="() => {}">
        <view class="podium-medal">🥉</view>
        <view class="podium-avatar glass">{{ getUserInitial(list[2]) }}</view>
        <text class="podium-name">{{ getUserName(list[2]) }}</text>
        <text class="podium-score">{{ list[2].total }}分</text>
        <view class="podium-bar bar-3"></view>
      </view>
    </view>

    <view v-if="list.length === 0 && !loading" class="empty-hint">
      <text class="empty-emoji anim-float">📊</text>
      <text>暂无排行数据</text>
    </view>

    <!-- Rest of rankings -->
    <view class="rank-list" v-if="list.length > 3">
      <view class="section-head anim-fade-in anim-d4">
        <text class="section-title">更多排名</text>
      </view>
      <view
        v-for="(item, idx) in list.slice(3)"
        :key="item.userId"
        :class="['rank-card', 'glass-strong', 'card-press', 'anim-slide-up', (idx + 4) < 12 ? ('anim-d' + (idx + 5)) : '']"
        style="border-radius: 20rpx;"
      >
        <view class="rank-num">{{ idx + 4 }}</view>
        <view class="rank-avatar">{{ getUserInitial(item) }}</view>
        <view class="rank-info">
          <text class="rank-name">{{ getUserName(item) }}</text>
        </view>
        <text class="rank-score">{{ item.total }} <text class="score-unit">分</text></text>
      </view>
    </view>

    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { getRanking } from "@/utils/points-service";

export default {
  data() {
    return {
      list: [],
      loading: false
    };
  },

  onShow() {
    this.loadRanking();
  },

  onPullDownRefresh() {
    this.loadRanking().finally(() => uni.stopPullDownRefresh());
  },

  methods: {
    async loadRanking() {
      this.loading = true;
      try {
        this.list = await getRanking(20).catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    getUserName(item) {
      return "用户 " + (item.userId || "").slice(-6);
    },

    getUserInitial(item) {
      return (item.userId || "?").slice(-1).toUpperCase();
    }
  }
};
</script>

<style lang="scss" scoped>
.ranking-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 0%, rgba(245, 166, 35, 0.12), rgba(245, 166, 35, 0) 50%),
    radial-gradient(circle at 90% 30%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 40%),
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
  opacity: 0.45;
}
.orb-1 {
  width: 200rpx; height: 200rpx;
  top: -30rpx; right: -40rpx;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.3), transparent 70%);
}
.orb-2 {
  width: 160rpx; height: 160rpx;
  top: 350rpx; left: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%);
}

/* Banner */
.banner {
  position: relative;
  padding: 28rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}
.banner-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.1), transparent);
  pointer-events: none;
}
.banner-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.banner-emoji { font-size: 48rpx; }
.banner-title { color: #1a2540; font-size: 34rpx; font-weight: 800; }
.banner-desc { margin-top: 6rpx; color: #5a6a88; font-size: 24rpx; }

/* Podium */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10rpx;
  padding: 20rpx 0 10rpx;
}
.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}
.podium-medal { font-size: 36rpx; }
.podium-avatar {
  width: 80rpx; height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #4b62a8;
}
.podium-avatar.crown {
  width: 96rpx; height: 96rpx;
  font-size: 34rpx;
  border: 3rpx solid rgba(245, 166, 35, 0.4);
  box-shadow: 0 6rpx 20rpx rgba(245, 166, 35, 0.2);
}
.podium-name {
  font-size: 22rpx;
  color: #3a4a68;
  font-weight: 600;
  text-align: center;
}
.podium-score {
  font-size: 24rpx;
  color: #d4860a;
  font-weight: 800;
}
.podium-bar {
  width: 100%;
  border-radius: 12rpx 12rpx 0 0;
  margin-top: 4rpx;
}
.bar-1 {
  height: 120rpx;
  background: linear-gradient(180deg, rgba(245, 166, 35, 0.25), rgba(245, 166, 35, 0.08));
}
.bar-2 {
  height: 80rpx;
  background: linear-gradient(180deg, rgba(47, 107, 255, 0.18), rgba(47, 107, 255, 0.06));
}
.bar-3 {
  height: 60rpx;
  background: linear-gradient(180deg, rgba(19, 194, 163, 0.18), rgba(19, 194, 163, 0.06));
}

/* Section Head */
.section-head {
  margin: 20rpx 4rpx 14rpx;
}
.section-title {
  color: #1a2540;
  font-size: 28rpx;
  font-weight: 800;
}

/* Rank Cards */
.rank-list {
  margin-top: 10rpx;
}
.rank-card {
  margin-bottom: 10rpx;
  padding: 18rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.rank-num {
  width: 48rpx; height: 48rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #eef2fb, #e8efff);
  color: #5a72a0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.rank-avatar {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8efff, #dfe9ff);
  color: #4b62a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.rank-info { flex: 1; }
.rank-name { color: #1a2540; font-size: 26rpx; font-weight: 600; }
.rank-score { color: #d4860a; font-size: 28rpx; font-weight: 800; flex-shrink: 0; }
.score-unit { font-size: 20rpx; font-weight: 500; }

/* Empty & Loading */
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-top: 60rpx;
  text-align: center;
  color: $text-placeholder;
  font-size: 24rpx;
}
.empty-emoji { font-size: 48rpx; }

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  gap: 16rpx;
  color: #8a95ac;
  font-size: 24rpx;
}
.loading-spinner {
  width: 44rpx; height: 44rpx;
  border: 4rpx solid #e0e8f8;
  border-top-color: #f5a623;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
