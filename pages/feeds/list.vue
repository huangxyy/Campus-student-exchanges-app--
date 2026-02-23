<template>
  <view class="feeds-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="header glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="header-deco"></view>
      <view class="header-top">
        <view>
          <view class="header-title">📢 校园动态</view>
          <view class="header-desc">分享校园生活，发现身边趣事</view>
        </view>
        <button class="publish-btn btn-bounce" @tap="goPublish">
          <text class="btn-icon">＋</text>
          <text>发布</text>
        </button>
      </view>

      <scroll-view scroll-x class="topic-scroll" :show-scrollbar="false">
        <view class="topic-row">
          <view
            v-for="t in topics"
            :key="t"
            :class="['topic-tag', currentTopic === t ? 'active' : '']"
            @tap="currentTopic = t"
          >
            {{ t }}
          </view>
        </view>
      </scroll-view>
    </view>

    <empty-state
      v-if="list.length === 0 && !loading"
      title="暂无动态"
      description="快来发布第一条校园动态吧"
      action-text="发动态"
      @action="goPublish"
    />

    <view
      v-for="(item, idx) in list"
      :key="item.id"
      :class="['feed-card', 'card-press', 'anim-slide-up', idx < 10 ? ('anim-d' + (idx + 1)) : '']"
      @tap="goDetail(item.id)"
    >
      <view class="feed-header">
        <view class="avatar-ring" v-if="item.authorAvatar">
          <image :src="item.authorAvatar" class="avatar" mode="aspectFill" />
        </view>
        <view v-else class="avatar-placeholder">{{ (item.authorName || '?')[0] }}</view>
        <view class="author-info">
          <view class="name-row">
            <text class="author-name">{{ item.authorName }}</text>
            <text v-if="item.topic" class="topic-chip">{{ item.topic }}</text>
          </view>
          <text class="feed-time">{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>
      
      <view class="feed-content">{{ item.content }}</view>
      
      <view v-if="item.images && item.images.length > 0" :class="['feed-images', `image-count-${Math.min(item.images.length, 3)}`]">
        <view
          v-for="(img, imgIdx) in item.images.slice(0, 3)"
          :key="imgIdx"
          class="image-wrapper img-zoom-wrap"
          @tap.stop="previewImage(item.images, imgIdx)"
        >
          <image :src="img" class="feed-img" mode="aspectFill" />
          <view v-if="imgIdx === 2 && item.images.length > 3" class="more-images-overlay glass-dark">
            <text>+{{ item.images.length - 3 }}</text>
          </view>
        </view>
      </view>
      
      <view class="feed-footer">
        <view class="action-group">
          <view :class="['action-btn', isLiked(item) ? 'liked' : '']" @tap.stop="handleLike(item)">
            <text class="action-icon">{{ isLiked(item) ? '❤️' : '🤍' }}</text>
            <text class="action-text" v-if="item.likeCount">{{ item.likeCount }}</text>
            <text class="action-text" v-else>赞</text>
          </view>
          <view class="action-btn" @tap.stop="goDetail(item.id)">
            <text class="action-icon">💬</text>
            <text class="action-text" v-if="item.commentCount">{{ item.commentCount }}</text>
            <text class="action-text" v-else>评论</text>
          </view>
        </view>
        
        <view class="action-group">
          <view v-if="isOwn(item)" class="action-btn icon-only" @tap.stop="handleDelete(item)">
            <text class="action-icon">🗑️</text>
          </view>
          <view v-else class="action-btn icon-only" @tap.stop="handleReport(item)">
            <text class="action-icon">⚠️</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>
    
    <report-dialog ref="reportDialog" />
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import ReportDialog from "@/components/report-dialog/report-dialog.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { listFeeds, toggleLike, deleteFeed } from "@/utils/feed-service";

export default {
  components: { EmptyState, ReportDialog },

  data() {
    return {
      list: [],
      loading: false,
      currentTopic: "全部",
      topics: ["全部", "闲聊", "学习", "美食", "运动", "吐槽", "求助"]
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; },
    myUserId() { return this.userStore.profile?.userId || ""; }
  },

  onShow() { this.loadList(); },

  onPullDownRefresh() {
    this.loadList().finally(() => uni.stopPullDownRefresh());
  },

  watch: {
    currentTopic() { this.loadList(); }
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    isLiked(item) { return item.likedBy && item.likedBy.includes(this.myUserId); },
    isOwn(item) { return item.authorId === this.myUserId; },

    async loadList() {
      this.loading = true;
      try {
        const topic = this.currentTopic === "全部" ? "" : this.currentTopic;
        this.list = await listFeeds(topic).catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    goPublish() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url: "/pages/feeds/publish" });
    },

    goDetail(id) {
      uni.navigateTo({ url: `/pages/feeds/detail?id=${id}` });
    },

    previewImage(images, index) {
      uni.previewImage({ urls: images, current: images[index] });
    },

    async handleLike(item) {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      const idx = this.list.findIndex((f) => f.id === item.id);
      if (idx < 0) { return; }
      const feed = this.list[idx];
      const wasLiked = feed.likedBy && feed.likedBy.includes(this.myUserId);
      const updated = {
        ...feed,
        likedBy: wasLiked
          ? (feed.likedBy || []).filter((id) => id !== this.myUserId)
          : [...(feed.likedBy || []), this.myUserId],
        likeCount: Math.max(0, (feed.likeCount || 0) + (wasLiked ? -1 : 1))
      };
      this.list = [...this.list.slice(0, idx), updated, ...this.list.slice(idx + 1)];
      const result = await toggleLike(item.id).catch(() => null);
      if (result === null) {
        this.list = [...this.list.slice(0, idx), feed, ...this.list.slice(idx + 1)];
      }
    },

    handleDelete(item) {
      uni.showModal({
        title: "删除动态",
        content: "删除后不可恢复，是否继续？",
        success: async (res) => {
          if (!res.confirm) { return; }
          const ok = await deleteFeed(item.id);
          if (ok) {
            uni.showToast({ title: "已删除", icon: "none" });
            this.loadList();
          }
        }
      });
    },

    handleReport(item) {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      this.$refs.reportDialog.open("feed", item.id);
    }
  }
};
</script>

<style lang="scss" scoped>
.feeds-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background: $page-bg;
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
  background: radial-gradient(circle, rgba(47, 107, 255, 0.28), transparent 70%);
}
.orb-2 {
  width: 150rpx; height: 150rpx;
  top: 400rpx; left: -30rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 70%);
}

/* Header */
.header {
  position: relative;
  padding: 28rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.header-deco {
  position: absolute;
  top: -60rpx; right: -40rpx;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.08), transparent);
  pointer-events: none;
}

.header-top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #1a2540;
}

.header-desc {
  margin-top: 8rpx;
  color: #5a6a88;
  font-size: 24rpx;
  letter-spacing: 0.5rpx;
}

.publish-btn {
  margin: 0;
  height: 64rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.3);
  border: none;
  flex-shrink: 0;
}
.publish-btn::after { border: none; }
.btn-icon { font-size: 28rpx; font-weight: bold; }

/* Topic Scroll */
.topic-scroll {
  width: 100%;
  white-space: nowrap;
}
.topic-row {
  display: flex;
  gap: 14rpx;
  padding-right: 20rpx;
}
.topic-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 30rpx;
  background: rgba(255, 255, 255, 0.7);
  color: #6a7e9a;
  font-size: 24rpx;
  font-weight: 600;
  border-radius: 999rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  transition: all 0.25s ease;
}
.topic-tag.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 6rpx 16rpx rgba(47, 107, 255, 0.25);
  transform: translateY(-2rpx);
}

/* Feed Card */
.feed-card {
  position: relative;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: $radius-lg;
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  padding: 28rpx;
  margin-bottom: 18rpx;
  box-shadow: $shadow-card;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 18rpx;
}

.avatar-ring {
  width: 80rpx; height: 80rpx;
  border-radius: 50%;
  padding: 3rpx;
  background: linear-gradient(135deg, #2f6bff, #13c2a3);
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(47, 107, 255, 0.18);
}
.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 3rpx solid #fff;
  display: block;
}
.avatar-placeholder {
  width: 80rpx; height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8efff, #dfe9ff);
  color: #4b62a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.author-info { flex: 1; }
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.author-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2540;
}
.topic-chip {
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(47, 107, 255, 0.08);
  color: #4a78d4;
  font-size: 20rpx;
  font-weight: 600;
}
.feed-time {
  font-size: 22rpx;
  color: #8a95ac;
  margin-top: 4rpx;
  display: block;
}

.feed-content {
  font-size: 28rpx;
  color: #2b3a56;
  line-height: 1.65;
  margin-bottom: 18rpx;
  word-break: break-all;
}

/* Feed Images */
.feed-images {
  display: flex;
  gap: 10rpx;
  margin-bottom: 18rpx;
}
.image-wrapper {
  position: relative;
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(26, 38, 66, 0.06);
}
.image-count-1 .image-wrapper { width: 100%; height: 360rpx; }
.image-count-2 .image-wrapper { width: calc(50% - 5rpx); height: 260rpx; }
.image-count-3 .image-wrapper { width: calc(33.333% - 7rpx); height: 200rpx; }
.feed-img { width: 100%; height: 100%; background-color: #eef2fb; }

.more-images-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 36rpx;
  font-weight: 700;
}

/* Footer Actions */
.feed-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
}
.action-group {
  display: flex;
  gap: 14rpx;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.6);
  transition: all 0.2s ease;
}
.action-btn:active {
  background: rgba(228, 235, 251, 0.9);
  transform: scale(0.95);
}
.action-btn.icon-only {
  padding: 10rpx 14rpx;
}
.action-btn.liked {
  background: rgba(255, 215, 220, 0.5);
}
.action-btn.liked .action-text {
  color: #e25269;
  font-weight: 700;
}
.action-icon { font-size: 28rpx; }
.action-text {
  font-size: 23rpx;
  font-weight: 600;
  color: #6a7e9a;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  gap: 16rpx;
  color: #8a95ac;
  font-size: 24rpx;
}
.loading-spinner {
  width: 44rpx; height: 44rpx;
  border: 4rpx solid #e0e8f8;
  border-top-color: #2f6bff;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
