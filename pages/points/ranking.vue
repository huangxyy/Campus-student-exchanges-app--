<template>
  <view class="ranking-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">积分排行榜</view>
      <view class="banner-desc">校园积分达人，看看谁最活跃</view>
    </view>

    <view v-if="list.length === 0 && !loading" class="empty-hint">暂无排行数据</view>

    <view
      v-for="(item, idx) in list"
      :key="item.userId"
      :class="['rank-card', 'card', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 1)) : '']"
    >
      <view :class="['rank-num', idx < 3 ? 'top' : '']">{{ idx + 1 }}</view>
      <view class="rank-info">
        <text class="rank-name">用户 {{ item.userId.slice(-6) }}</text>
      </view>
      <text class="rank-score">{{ item.total }} 分</text>
    </view>

    <view v-if="loading" class="loading-text">加载中...</view>
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

  methods: {
    async loadRanking() {
      this.loading = true;
      try {
        this.list = await getRanking(20).catch(() => []);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.ranking-page {
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 50% 0%, rgba(245, 166, 35, 0.1), rgba(245, 166, 35, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(255, 248, 230, 0.96), rgba(255, 252, 240, 0.98)), #ffffff; border: 1rpx solid #f5e3b0; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.empty-hint { margin-top: 60rpx; text-align: center; color: #8a93a7; font-size: 24rpx; }
.rank-card { margin-top: 10rpx; padding: 18rpx 20rpx; display: flex; align-items: center; gap: 16rpx; }
.rank-num {
  width: 48rpx; height: 48rpx; border-radius: 50%; background: #eef2fb; color: #68748d;
  display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; flex-shrink: 0;
}
.rank-num.top { background: linear-gradient(135deg, #f5a623, #e8920f); color: #fff; }
.rank-info { flex: 1; }
.rank-name { color: #2b3345; font-size: 26rpx; font-weight: 600; }
.rank-score { color: #d4860a; font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
