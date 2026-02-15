<template>
  <view class="activity-page">
    <view class="banner card anim-slide-down">
      <view class="banner-bg"></view>
      <view class="banner-content">
        <view class="banner-title">🎉 活动专题</view>
        <view class="banner-desc">校园精彩活动，一起参与赢好礼</view>
        <view class="banner-stats">
          <view class="banner-stat">
            <text class="stat-val">{{ activeCount }}</text>
            <text class="stat-lbl">进行中</text>
          </view>
          <view class="banner-stat">
            <text class="stat-val">{{ upcomingCount }}</text>
            <text class="stat-lbl">即将开始</text>
          </view>
        </view>
      </view>
    </view>

    <empty-state
      v-if="list.length === 0"
      title="暂无活动"
      description="敬请期待校园精彩活动"
    />

    <view
      v-for="(item, idx) in displayList"
      :key="item.id"
      :class="['activity-card', 'card', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 1)) : '']"
    >
      <view class="cover-wrap">
        <image v-if="item.cover" :src="item.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="cover-emoji">{{ item.emoji || '🎯' }}</text>
        </view>
        <view :class="['status-tag', 'tag-' + item.statusKey]">{{ item.statusText }}</view>
      </view>
      <view class="activity-body">
        <view class="activity-title">{{ item.title }}</view>
        <view class="activity-desc">{{ item.description }}</view>

        <view v-if="item.statusKey === 'active' && item.countdown" class="countdown-row">
          <text class="countdown-label">距结束</text>
          <view class="countdown-blocks">
            <view class="cd-block">{{ item.countdown.days }}<text class="cd-unit">天</text></view>
            <view class="cd-block">{{ item.countdown.hours }}<text class="cd-unit">时</text></view>
            <view class="cd-block">{{ item.countdown.minutes }}<text class="cd-unit">分</text></view>
          </view>
        </view>

        <view v-if="item.statusKey === 'upcoming' && item.countdown" class="countdown-row upcoming">
          <text class="countdown-label">距开始</text>
          <view class="countdown-blocks">
            <view class="cd-block">{{ item.countdown.days }}<text class="cd-unit">天</text></view>
            <view class="cd-block">{{ item.countdown.hours }}<text class="cd-unit">时</text></view>
            <view class="cd-block">{{ item.countdown.minutes }}<text class="cd-unit">分</text></view>
          </view>
        </view>

        <view class="activity-meta">
          <text class="activity-time">{{ item.timeText }}</text>
          <text class="activity-participants" v-if="item.participants">{{ item.participants }}人参与</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";

export default {
  components: { EmptyState },

  data() {
    return {
      now: Date.now(),
      timer: null,
      list: [
        {
          id: "act-1",
          title: "开学季跳蚤市场",
          description: "新学期到来，把闲置好物转给需要的同学，还能赚积分！",
          cover: "",
          emoji: "🛍️",
          startAt: new Date("2026-03-01").getTime(),
          endAt: new Date("2026-03-15T23:59:59").getTime(),
          timeText: "2026年3月1日 ~ 3月15日",
          participants: 128
        },
        {
          id: "act-2",
          title: "校园摄影大赛",
          description: "用镜头记录校园之美，优秀作品展示在校园动态首页。",
          cover: "",
          emoji: "📷",
          startAt: new Date("2026-03-10").getTime(),
          endAt: new Date("2026-03-31T23:59:59").getTime(),
          timeText: "2026年3月10日 ~ 3月31日",
          participants: 56
        },
        {
          id: "act-3",
          title: "期末教材互助",
          description: "考完试的教材别扔，传递给学弟学妹，循环利用更环保。",
          cover: "",
          emoji: "📚",
          startAt: new Date("2026-01-05").getTime(),
          endAt: new Date("2026-01-20T23:59:59").getTime(),
          timeText: "2026年1月5日 ~ 1月20日",
          participants: 342
        },
        {
          id: "act-4",
          title: "春季志愿服务周",
          description: "参与校园志愿服务，帮助他人的同时赚取额外积分奖励。",
          cover: "",
          emoji: "🤝",
          startAt: new Date("2026-04-01").getTime(),
          endAt: new Date("2026-04-07T23:59:59").getTime(),
          timeText: "2026年4月1日 ~ 4月7日",
          participants: 0
        }
      ]
    };
  },

  computed: {
    displayList() {
      return this.list.map((item) => {
        const statusKey = this.getStatusKey(item);
        const countdown = this.getCountdown(item, statusKey);
        return { ...item, statusKey, statusText: this.getStatusText(statusKey), countdown };
      }).sort((a, b) => {
        const order = { active: 0, upcoming: 1, ended: 2 };
        return (order[a.statusKey] ?? 9) - (order[b.statusKey] ?? 9);
      });
    },
    activeCount() {
      return this.list.filter((i) => this.getStatusKey(i) === "active").length;
    },
    upcomingCount() {
      return this.list.filter((i) => this.getStatusKey(i) === "upcoming").length;
    }
  },

  onLoad() {
    this.timer = setInterval(() => { this.now = Date.now(); }, 60000);
  },

  onUnload() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  methods: {
    getStatusKey(item) {
      if (this.now < item.startAt) { return "upcoming"; }
      if (this.now <= item.endAt) { return "active"; }
      return "ended";
    },
    getStatusText(key) {
      if (key === "active") { return "进行中"; }
      if (key === "upcoming") { return "即将开始"; }
      return "已结束";
    },
    getCountdown(item, statusKey) {
      let target = 0;
      if (statusKey === "active") { target = item.endAt; }
      else if (statusKey === "upcoming") { target = item.startAt; }
      else { return null; }

      const diff = Math.max(0, target - this.now);
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      return { days: String(days).padStart(2, "0"), hours: String(hours).padStart(2, "0"), minutes: String(minutes).padStart(2, "0") };
    }
  }
};
</script>

<style lang="scss" scoped>
.activity-page {
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0) 60%), #f2f5fb;
}
.banner {
  position: relative; overflow: hidden; padding: 30rpx;
  background: linear-gradient(140deg, rgba(255, 230, 230, 0.96), rgba(255, 245, 245, 0.98)), #ffffff;
  border: 1rpx solid #f5d0d0;
}
.banner-bg {
  position: absolute; top: -40rpx; right: -30rpx; width: 200rpx; height: 200rpx;
  border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.08), transparent); pointer-events: none;
}
.banner-content { position: relative; }
.banner-title { color: #1f2636; font-size: 36rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.banner-stats { margin-top: 18rpx; display: flex; gap: 20rpx; }
.banner-stat {
  display: flex; align-items: baseline; gap: 6rpx; padding: 8rpx 18rpx;
  border-radius: 12rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(239, 68, 68, 0.1);
}
.stat-val { color: #e74a62; font-size: 30rpx; font-weight: 700; }
.stat-lbl { color: #8a93a7; font-size: 20rpx; }

.activity-card { margin-top: 14rpx; overflow: hidden; }
.cover-wrap { position: relative; }
.cover { width: 100%; height: 280rpx; }
.cover-placeholder {
  width: 100%; height: 220rpx;
  background: linear-gradient(140deg, #f0f4ff, #e8f0ff);
  display: flex; align-items: center; justify-content: center;
}
.cover-emoji { font-size: 80rpx; }
.status-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  font-size: 20rpx; font-weight: 600; border-radius: 999rpx; padding: 6rpx 16rpx;
  backdrop-filter: blur(8rpx);
}
.tag-active { background: rgba(16, 185, 129, 0.88); color: #fff; }
.tag-upcoming { background: rgba(47, 107, 255, 0.88); color: #fff; }
.tag-ended { background: rgba(140, 150, 170, 0.8); color: #fff; }

.activity-body { padding: 20rpx; }
.activity-title { color: #1f2430; font-size: 30rpx; font-weight: 700; }
.activity-desc { margin-top: 8rpx; color: #5f6d85; font-size: 24rpx; line-height: 1.6; }

.countdown-row {
  margin-top: 14rpx; display: flex; align-items: center; gap: 12rpx;
  padding: 12rpx 16rpx; border-radius: 12rpx; background: #f0faf5;
}
.countdown-row.upcoming { background: #f0f4ff; }
.countdown-label { color: #5f6d85; font-size: 22rpx; flex-shrink: 0; }
.countdown-blocks { display: flex; gap: 8rpx; }
.cd-block {
  min-width: 52rpx; height: 44rpx; line-height: 44rpx; text-align: center;
  border-radius: 8rpx; background: #fff; border: 1rpx solid #e3eaf9;
  color: #1f2430; font-size: 24rpx; font-weight: 700;
}
.cd-unit { color: #8a93a7; font-size: 18rpx; font-weight: 400; margin-left: 2rpx; }

.activity-meta { margin-top: 12rpx; display: flex; align-items: center; justify-content: space-between; }
.activity-time { color: #8a93a7; font-size: 22rpx; }
.activity-participants { color: #5f6d85; font-size: 22rpx; }
</style>
