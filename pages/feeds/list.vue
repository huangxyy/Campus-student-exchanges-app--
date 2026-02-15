<template>
  <view class="feeds-page">
    <view class="banner card anim-slide-down">
      <view class="banner-top">
        <view>
          <view class="banner-title">校园动态</view>
          <view class="banner-desc">分享校园生活，发现身边趣事</view>
        </view>
        <button class="publish-btn btn-bounce" size="mini" @tap="goPublish">发动态</button>
      </view>
    </view>

    <view class="topic-row anim-fade-in anim-d1">
      <text
        v-for="t in topics"
        :key="t"
        :class="['topic-tag', currentTopic === t ? 'active' : '']"
        @tap="currentTopic = t"
      >{{ t }}</text>
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
      :class="['feed-card', 'card', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 1)) : '']"
      @tap="goDetail(item.id)"
    >
      <view class="feed-author">
        <image v-if="item.authorAvatar" :src="item.authorAvatar" class="avatar" mode="aspectFill" />
        <view v-else class="avatar-placeholder">{{ (item.authorName || '?')[0] }}</view>
        <view class="author-info">
          <text class="author-name">{{ item.authorName }}</text>
          <text class="feed-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text v-if="item.topic" class="topic-chip">{{ item.topic }}</text>
      </view>
      <view class="feed-content">{{ item.content }}</view>
      <view v-if="item.images && item.images.length > 0" class="feed-images">
        <image
          v-for="(img, imgIdx) in item.images.slice(0, 3)"
          :key="imgIdx"
          :src="img"
          class="feed-img"
          mode="aspectFill"
          @tap.stop="previewImage(item.images, imgIdx)"
        />
        <view v-if="item.images.length > 3" class="more-images">+{{ item.images.length - 3 }}</view>
      </view>
      <view class="feed-actions">
        <view :class="['action-item', isLiked(item) ? 'liked' : '']" @tap.stop="handleLike(item)">
          <text class="action-icon">{{ isLiked(item) ? '❤️' : '🤍' }}</text>
          <text class="action-count">{{ item.likeCount || 0 }}</text>
        </view>
        <view class="action-item" @tap.stop="goDetail(item.id)">
          <text class="action-icon">💬</text>
          <text class="action-count">{{ item.commentCount || 0 }}</text>
        </view>
        <view v-if="isOwn(item)" class="action-item danger" @tap.stop="handleDelete(item)">
          <text class="action-icon">🗑️</text>
        </view>
        <view v-else class="action-item" @tap.stop="handleReport(item)">
          <text class="action-icon">⚠️</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading-text">加载中...</view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { listFeeds, toggleLike, deleteFeed } from "@/utils/feed-service";
import { submitReport, REPORT_REASONS } from "@/utils/report-service";

export default {
  components: { EmptyState },

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
      const result = await toggleLike(item.id);
      if (result !== null) {
        this.loadList();
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
      uni.showActionSheet({
        itemList: REPORT_REASONS.map((r) => r.label),
        success: async (res) => {
          const reason = REPORT_REASONS[res.tapIndex];
          if (!reason) { return; }
          await submitReport({
            targetType: "feed",
            targetId: item.id,
            reason: reason.value
          }).catch(() => null);
          uni.showToast({ title: "举报已提交", icon: "none" });
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.feeds-page {
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 12% 8%, rgba(124, 58, 237, 0.08), rgba(124, 58, 237, 0)),
    radial-gradient(circle at 88% 20%, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0)), #f5f7fc;
}
.banner { padding: 26rpx; background: linear-gradient(140deg, rgba(243, 238, 255, 0.96), rgba(250, 248, 255, 0.98)), #ffffff; border: 1rpx solid #e6dff8; }
.banner-top { display: flex; align-items: flex-start; justify-content: space-between; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.publish-btn {
  margin: 0; height: 58rpx; line-height: 58rpx; border-radius: 32rpx; border: none;
  background: linear-gradient(135deg, #7c3aed, #6025c0); color: #fff; font-size: 22rpx; padding: 0 24rpx;
}
.publish-btn::after { border: none; }
.topic-row { margin: 16rpx 4rpx 10rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.topic-tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.topic-tag.active { background: #7c3aed; color: #fff; }
.feed-card { margin-bottom: 12rpx; padding: 20rpx; }
.feed-author { display: flex; align-items: center; gap: 12rpx; }
.avatar { width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0; }
.avatar-placeholder {
  width: 64rpx; height: 64rpx; border-radius: 50%; background: #e8e0f8; color: #7c3aed;
  display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; flex-shrink: 0;
}
.author-info { flex: 1; min-width: 0; }
.author-name { display: block; color: #1f2430; font-size: 26rpx; font-weight: 600; }
.feed-time { display: block; color: #8a93a7; font-size: 20rpx; margin-top: 2rpx; }
.topic-chip { background: #f0e8ff; color: #7b5ec6; border-radius: 999rpx; padding: 4rpx 14rpx; font-size: 20rpx; flex-shrink: 0; }
.feed-content { margin-top: 14rpx; color: #2b3345; font-size: 26rpx; line-height: 1.65; }
.feed-images { margin-top: 12rpx; display: flex; gap: 8rpx; flex-wrap: wrap; }
.feed-img { width: 200rpx; height: 200rpx; border-radius: 12rpx; }
.more-images {
  width: 200rpx; height: 200rpx; border-radius: 12rpx; background: #f0f2f8;
  display: flex; align-items: center; justify-content: center; color: #6e7b92; font-size: 28rpx;
}
.feed-actions { margin-top: 14rpx; display: flex; align-items: center; gap: 28rpx; }
.action-item { display: flex; align-items: center; gap: 6rpx; }
.action-item.liked .action-count { color: #e74a62; }
.action-item.danger .action-icon { opacity: 0.6; }
.action-icon { font-size: 28rpx; }
.action-count { color: #8a93a7; font-size: 22rpx; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
