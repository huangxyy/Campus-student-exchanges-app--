<template>
  <view class="activity-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-content">
        <view class="banner-top">
          <view>
            <view class="banner-title anim-fade-in">🎉 活动专题</view>
            <view class="banner-desc anim-fade-in anim-d1">校园精彩活动，一起参与赢好礼</view>
          </view>
        </view>
        <view class="banner-stats anim-slide-up anim-d2">
          <view class="banner-stat">
            <text class="stat-val num-animate">{{ activeCount }}</text>
            <text class="stat-lbl">进行中</text>
          </view>
          <view class="banner-stat upcoming-stat">
            <text class="stat-val num-animate">{{ upcomingCount }}</text>
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
      :class="['activity-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 2)) : '']"
      style="border-radius: 24rpx;"
    >
      <view class="cover-wrap img-zoom-wrap">
        <image v-if="item.cover" :src="item.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder" :class="'cover-tone-' + (idx % 3)">
          <text class="cover-emoji anim-float">{{ item.emoji || '🎯' }}</text>
        </view>
        <view :class="['status-tag', 'tag-' + item.statusKey]">
          <text class="status-dot" :class="'dot-' + item.statusKey"></text>
          {{ item.statusText }}
        </view>
      </view>

      <view class="activity-body">
        <view class="activity-title">{{ item.title }}</view>
        <view class="activity-desc">{{ item.description }}</view>

        <view v-if="item.statusKey === 'active' && item.countdown" class="countdown-row active-countdown">
          <text class="countdown-label">⏱ 距结束</text>
          <view class="countdown-blocks">
            <view class="cd-block">{{ item.countdown.days }}<text class="cd-unit">天</text></view>
            <text class="cd-sep">:</text>
            <view class="cd-block">{{ item.countdown.hours }}<text class="cd-unit">时</text></view>
            <text class="cd-sep">:</text>
            <view class="cd-block">{{ item.countdown.minutes }}<text class="cd-unit">分</text></view>
          </view>
        </view>

        <view v-if="item.statusKey === 'upcoming' && item.countdown" class="countdown-row upcoming-countdown">
          <text class="countdown-label">⏳ 距开始</text>
          <view class="countdown-blocks">
            <view class="cd-block">{{ item.countdown.days }}<text class="cd-unit">天</text></view>
            <text class="cd-sep">:</text>
            <view class="cd-block">{{ item.countdown.hours }}<text class="cd-unit">时</text></view>
            <text class="cd-sep">:</text>
            <view class="cd-block">{{ item.countdown.minutes }}<text class="cd-unit">分</text></view>
          </view>
        </view>

        <view class="activity-meta">
          <text class="activity-time">📅 {{ item.timeText }}</text>
          <text class="activity-participants" v-if="item.participants">
            <text class="participants-icon">👥</text> {{ item.participants }}人参与
          </text>
        </view>

        <view class="activity-footer" v-if="item.statusKey !== 'ended'">
          <button :class="['join-btn', 'btn-bounce', item.statusKey === 'active' ? 'join-active' : 'join-upcoming']" size="mini">
            {{ item.statusKey === 'active' ? '立即参与' : '关注活动' }}
          </button>
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
    enrichedList() {
      return this.list.map((item) => {
        const statusKey = this.getStatusKey(item);
        const countdown = this.getCountdown(item, statusKey);
        return { ...item, statusKey, statusText: this.getStatusText(statusKey), countdown };
      });
    },
    displayList() {
      const order = { active: 0, upcoming: 1, ended: 2 };
      return [...this.enrichedList].sort((a, b) =>
        (order[a.statusKey] ?? 9) - (order[b.statusKey] ?? 9)
      );
    },
    activeCount() {
      return this.enrichedList.filter((i) => i.statusKey === "active").length;
    },
    upcomingCount() {
      return this.enrichedList.filter((i) => i.statusKey === "upcoming").length;
    }
  },

  onLoad() {
    this.startTimer();
  },

  onShow() {
    if (!this.timer) { this.startTimer(); }
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  methods: {
    startTimer() {
      this.now = Date.now();
      this.timer = setInterval(() => { this.now = Date.now(); }, 60000);
    },
    stopTimer() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },
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
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 6%, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0) 45%),
    radial-gradient(circle at 88% 20%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 40%),
    radial-gradient(circle at 50% 65%, rgba(19, 194, 163, 0.05), rgba(19, 194, 163, 0) 40%),
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
  width: 180rpx; height: 180rpx;
  top: -20rpx; left: -30rpx;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.25), transparent 70%);
}
.orb-2 {
  width: 150rpx; height: 150rpx;
  top: 400rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%);
}

/* Banner */
.banner {
  position: relative;
  padding: 28rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.banner-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.08), transparent);
  pointer-events: none;
}
.banner-content { position: relative; }
.banner-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.banner-title {
  color: #1a2540;
  font-size: 36rpx;
  font-weight: 800;
}
.banner-desc {
  margin-top: 8rpx;
  color: #5a6a88;
  font-size: 24rpx;
}

.banner-stats {
  margin-top: 18rpx;
  display: flex;
  gap: 14rpx;
}
.banner-stat {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 16rpx;
  background: rgba(16, 185, 129, 0.08);
  border: 1rpx solid rgba(16, 185, 129, 0.12);
}
.upcoming-stat {
  background: rgba(47, 107, 255, 0.08);
  border: 1rpx solid rgba(47, 107, 255, 0.12);
}
.stat-val {
  color: #10b981;
  font-size: 32rpx;
  font-weight: 800;
}
.upcoming-stat .stat-val { color: #2f6bff; }
.stat-lbl {
  color: #6a7e9a;
  font-size: 21rpx;
}

/* Activity Cards */
.activity-card {
  margin-bottom: 14rpx;
  overflow: hidden;
}
.cover-wrap {
  position: relative;
}
.cover {
  width: 100%;
  height: 280rpx;
}
.cover-placeholder {
  width: 100%;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-tone-0 { background: linear-gradient(140deg, rgba(224, 239, 255, 0.95), rgba(240, 248, 255, 0.98)); }
.cover-tone-1 { background: linear-gradient(140deg, rgba(224, 248, 240, 0.95), rgba(240, 252, 248, 0.98)); }
.cover-tone-2 { background: linear-gradient(140deg, rgba(242, 236, 255, 0.95), rgba(250, 248, 255, 0.98)); }
.cover-emoji { font-size: 72rpx; }

.status-tag {
  position: absolute;
  top: 16rpx; right: 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
}
.status-dot {
  width: 10rpx; height: 10rpx;
  border-radius: 50%;
}
.tag-active {
  background: rgba(16, 185, 129, 0.88);
  color: #fff;
}
.dot-active { background: rgba(255, 255, 255, 0.8); animation: anim-pulse 2s ease-in-out infinite; }
.tag-upcoming {
  background: rgba(47, 107, 255, 0.88);
  color: #fff;
}
.dot-upcoming { background: rgba(255, 255, 255, 0.7); }
.tag-ended {
  background: rgba(140, 150, 170, 0.75);
  color: #fff;
}
.dot-ended { background: rgba(255, 255, 255, 0.5); }

.activity-body { padding: 20rpx 22rpx; }
.activity-title { color: #1a2540; font-size: 30rpx; font-weight: 700; }
.activity-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; line-height: 1.6; }

/* Countdown */
.countdown-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 16rpx;
}
.active-countdown {
  background: rgba(16, 185, 129, 0.06);
  border: 1rpx solid rgba(16, 185, 129, 0.1);
}
.upcoming-countdown {
  background: rgba(47, 107, 255, 0.06);
  border: 1rpx solid rgba(47, 107, 255, 0.1);
}
.countdown-label {
  color: #5a6a88;
  font-size: 22rpx;
  flex-shrink: 0;
  font-weight: 500;
}
.countdown-blocks { display: flex; align-items: center; gap: 6rpx; }
.cd-block {
  min-width: 56rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  color: #1a2540;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(26, 38, 66, 0.04);
}
.cd-unit { color: #8a95ac; font-size: 18rpx; font-weight: 400; margin-left: 2rpx; }
.cd-sep { color: #b0b8cc; font-size: 20rpx; font-weight: 600; }

.activity-meta {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
}
.activity-time { color: #8a95ac; font-size: 22rpx; }
.activity-participants { color: #5a6a88; font-size: 22rpx; display: flex; align-items: center; gap: 4rpx; }
.participants-icon { font-size: 20rpx; }

.activity-footer {
  margin-top: 16rpx;
  display: flex;
  justify-content: flex-end;
}
.join-btn {
  margin: 0;
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 32rpx;
  border-radius: 30rpx;
  border: none;
  font-size: 24rpx;
  font-weight: 600;
}
.join-btn::after { border: none; }
.join-active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4rpx 14rpx rgba(16, 185, 129, 0.3);
}
.join-upcoming {
  background: linear-gradient(135deg, #e7efff, #dfe9ff);
  color: #2f6bff;
}
</style>
