<template>
  <view class="feed-detail-page">
    <view v-if="loading" class="loading">加载中...</view>

    <empty-state
      v-else-if="!feed"
      title="动态不存在"
      description="可能已被删除"
      action-text="返回动态列表"
      @action="goBack"
    />

    <template v-else>
      <view class="feed-card card anim-slide-down">
        <view class="feed-author">
          <image v-if="feed.authorAvatar" :src="feed.authorAvatar" class="avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ (feed.authorName || '?')[0] }}</view>
          <view class="author-info">
            <text class="author-name">{{ feed.authorName }}</text>
            <text class="feed-time">{{ formatTime(feed.createdAt) }}</text>
          </view>
          <text v-if="feed.topic" class="topic-chip">{{ feed.topic }}</text>
        </view>
        <view class="feed-content">{{ feed.content }}</view>
        <view v-if="feed.images && feed.images.length > 0" class="feed-images">
          <image
            v-for="(img, idx) in feed.images"
            :key="idx"
            :src="img"
            class="feed-img"
            mode="aspectFill"
            @tap="previewImage(feed.images, idx)"
          />
        </view>
        <view class="feed-stats">
          <view :class="['stat-item', isLiked ? 'liked' : '']" @tap="handleLike">
            <text>{{ isLiked ? '❤️' : '🤍' }} {{ feed.likeCount || 0 }} 赞</text>
          </view>
          <view class="stat-item">
            <text>💬 {{ comments.length }} 评论</text>
          </view>
        </view>
      </view>

      <view class="comment-section card anim-slide-up anim-d1">
        <view class="section-title">评论 ({{ comments.length }})</view>
        <view v-if="comments.length === 0" class="no-comment">暂无评论，来说两句吧</view>
        <view v-for="c in comments" :key="c.id" class="comment-item">
          <view class="comment-head">
            <text class="comment-author">{{ c.authorName }}</text>
            <text v-if="c.replyToName" class="reply-hint"> 回复 {{ c.replyToName }}</text>
            <text class="comment-time">{{ formatTime(c.createdAt) }}</text>
          </view>
          <view class="comment-body" @tap="setReplyTarget(c)">{{ c.content }}</view>
        </view>
      </view>
    </template>

    <view class="input-bar" v-if="feed">
      <input
        v-model.trim="commentText"
        class="comment-input"
        :placeholder="replyTarget ? `回复 ${replyTarget.authorName}` : '写评论...'"
        confirm-type="send"
        @confirm="submitComment"
      />
      <button class="send-btn" :loading="commentSubmitting" @tap="submitComment">发送</button>
    </view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { getFeedById, toggleLike, listComments, addComment } from "@/utils/feed-service";

export default {
  components: { EmptyState },

  data() {
    return {
      feedId: "",
      feed: null,
      comments: [],
      loading: false,
      commentText: "",
      commentSubmitting: false,
      replyTarget: null
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; },
    myUserId() { return this.userStore.profile?.userId || ""; },
    isLiked() { return this.feed && this.feed.likedBy && this.feed.likedBy.includes(this.myUserId); }
  },

  onLoad(query) {
    this.feedId = query.id || "";
    this.loadFeed();
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    async loadFeed() {
      if (!this.feedId) { return; }
      this.loading = true;
      try {
        this.feed = await getFeedById(this.feedId);
        this.comments = await listComments(this.feedId).catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    previewImage(images, index) {
      uni.previewImage({ urls: images, current: images[index] });
    },

    async handleLike() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      try {
        await toggleLike(this.feedId);
        this.feed = await getFeedById(this.feedId).catch(() => this.feed);
      } catch (e) {
        uni.showToast({ title: "操作失败", icon: "none" });
      }
    },

    setReplyTarget(comment) {
      this.replyTarget = comment;
    },

    async submitComment() {
      if (!this.commentText) { return; }
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      if (this.commentSubmitting) { return; }

      this.commentSubmitting = true;
      try {
        await addComment({
          feedId: this.feedId,
          content: this.commentText,
          replyToCommentId: this.replyTarget?.id || "",
          replyToName: this.replyTarget?.authorName || ""
        });
        this.commentText = "";
        this.replyTarget = null;
        this.comments = await listComments(this.feedId).catch(() => this.comments);
        this.feed = await getFeedById(this.feedId).catch(() => this.feed);
      } catch (error) {
        uni.showToast({ title: "评论失败", icon: "none" });
      } finally {
        this.commentSubmitting = false;
      }
    },

    goBack() { uni.navigateBack(); }
  }
};
</script>

<style lang="scss" scoped>
.feed-detail-page {
  padding: 24rpx; padding-bottom: 130rpx;
  background: radial-gradient(circle at 12% 8%, rgba(124, 58, 237, 0.08), rgba(124, 58, 237, 0)), #f5f7fc;
}
.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }
.feed-card { padding: 22rpx; }
.feed-author { display: flex; align-items: center; gap: 12rpx; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; }
.avatar-placeholder {
  width: 72rpx; height: 72rpx; border-radius: 50%; background: #e8e0f8; color: #7c3aed;
  display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; flex-shrink: 0;
}
.author-info { flex: 1; min-width: 0; }
.author-name { display: block; color: #1f2430; font-size: 28rpx; font-weight: 600; }
.feed-time { display: block; color: #8a93a7; font-size: 22rpx; margin-top: 4rpx; }
.topic-chip { background: #f0e8ff; color: #7b5ec6; border-radius: 999rpx; padding: 4rpx 14rpx; font-size: 20rpx; flex-shrink: 0; }
.feed-content { margin-top: 18rpx; color: #2b3345; font-size: 28rpx; line-height: 1.7; }
.feed-images { margin-top: 14rpx; display: flex; gap: 10rpx; flex-wrap: wrap; }
.feed-img { width: 210rpx; height: 210rpx; border-radius: 14rpx; }
.feed-stats { margin-top: 18rpx; display: flex; gap: 28rpx; padding-top: 14rpx; border-top: 1rpx solid #eef0f6; }
.stat-item { color: #6e7b92; font-size: 24rpx; }
.stat-item.liked { color: #e74a62; }
.comment-section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 27rpx; font-weight: 600; margin-bottom: 14rpx; }
.no-comment { color: #8a93a7; font-size: 24rpx; text-align: center; padding: 30rpx 0; }
.comment-item { padding: 14rpx 0; border-bottom: 1rpx solid #f0f2f8; }
.comment-item:last-child { border-bottom: none; }
.comment-head { display: flex; align-items: center; gap: 8rpx; }
.comment-author { color: #4f5d75; font-size: 23rpx; font-weight: 600; }
.reply-hint { color: #8a93a7; font-size: 22rpx; }
.comment-time { margin-left: auto; color: #8a93a7; font-size: 20rpx; }
.comment-body { margin-top: 8rpx; color: #2b3345; font-size: 25rpx; line-height: 1.5; }
.input-bar {
  position: fixed; left: 0; right: 0; bottom: 0; padding: 14rpx 20rpx 24rpx;
  display: flex; gap: 12rpx; background: #fff; border-top: 1rpx solid #e8edf5;
}
.comment-input {
  flex: 1; height: 72rpx; padding: 0 20rpx; border-radius: 36rpx; background: #f3f5fb;
  color: #2b3345; font-size: 26rpx;
}
.send-btn {
  margin: 0; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; border: none;
  background: #7c3aed; color: #fff; font-size: 26rpx; padding: 0 28rpx;
}
.send-btn::after { border: none; }
</style>
