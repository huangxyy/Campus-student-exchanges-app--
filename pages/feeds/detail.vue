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
      <view class="feed-card glass-strong anim-slide-down" style="border-radius: 24rpx;">
        <view class="feed-author">
          <view class="author-avatar-ring">
            <image v-if="feed.authorAvatar" :src="feed.authorAvatar" class="avatar" mode="aspectFill" />
            <view v-else class="avatar-placeholder">{{ (feed.authorName || '?')[0] }}</view>
          </view>
          <view class="author-info">
            <text class="author-name">{{ feed.authorName }}</text>
            <text class="feed-time">{{ formatTime(feed.createdAt) }}</text>
          </view>
          <text v-if="feed.topic" class="topic-chip">{{ feed.topic }}</text>
        </view>
        <view class="feed-content">{{ feed.content }}</view>
        <view v-if="feed.images && feed.images.length > 0" class="feed-images">
          <view
            v-for="(img, idx) in feed.images"
            :key="idx"
            class="feed-img-wrap img-zoom-wrap"
            @tap="previewImage(feed.images, idx)"
          >
            <image :src="img" class="feed-img" mode="aspectFill" />
          </view>
        </view>
        <view class="feed-stats">
          <view :class="['stat-item', 'btn-bounce', isLiked ? 'liked' : '']" @tap="handleLike">
            <text :class="['like-icon', likeAnimating ? 'anim-heart' : '']">{{ isLiked ? '❤️' : '🤍' }}</text>
            <text>{{ feed.likeCount || 0 }} 赞</text>
          </view>
          <view class="stat-item">
            <text>💬 {{ comments.length }} 评论</text>
          </view>
        </view>
      </view>

      <view class="comment-section glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
        <view class="section-title">评论 ({{ comments.length }})</view>
        <view v-if="comments.length === 0" class="no-comment anim-fade-in">暂无评论，来说两句吧</view>
        <view
          v-for="(c, idx) in comments"
          :key="c.id"
          :class="['comment-item', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 1)) : '']"
        >
          <view class="comment-head">
            <text class="comment-author">{{ c.authorName }}</text>
            <text v-if="c.replyToName" class="reply-hint"> 回复 {{ c.replyToName }}</text>
            <text class="comment-time">{{ formatTime(c.createdAt) }}</text>
          </view>
          <view class="comment-body card-press" @tap="setReplyTarget(c)">{{ c.content }}</view>
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
      replyTarget: null,
      likeAnimating: false
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
      this.likeAnimating = true;
      setTimeout(() => { this.likeAnimating = false; }, 1200);
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
@import "@/styles/anim-extra.scss";

.feed-detail-page {
  padding: 24rpx; padding-bottom: 140rpx;
  background:
    radial-gradient(circle at 12% 8%, rgba(124, 58, 237, 0.1), rgba(124, 58, 237, 0) 45%),
    radial-gradient(circle at 88% 30%, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0) 40%),
    #f2f5fc;
}
.loading { margin-top: 100rpx; text-align: center; color: #8a95ac; font-size: 25rpx; }
.feed-card { padding: 24rpx; }
.feed-author { display: flex; align-items: center; gap: 12rpx; }
.author-avatar-ring {
  width: 76rpx; height: 76rpx; border-radius: 50%;
  padding: 3rpx;
  background: linear-gradient(135deg, #7c3aed, #2f6bff);
  flex-shrink: 0;
}
.avatar { width: 100%; height: 100%; border-radius: 50%; border: 3rpx solid #fff; display: block; }
.avatar-placeholder {
  width: 100%; height: 100%; border-radius: 50%; background: #e8e0f8; color: #7c3aed;
  display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700;
  border: 3rpx solid #fff;
}
.author-info { flex: 1; min-width: 0; }
.author-name { display: block; color: #1a2540; font-size: 28rpx; font-weight: 700; }
.feed-time { display: block; color: #8a95ac; font-size: 22rpx; margin-top: 4rpx; }
.topic-chip {
  background: rgba(124, 58, 237, 0.1); color: #7b5ec6; border-radius: 999rpx;
  padding: 4rpx 14rpx; font-size: 20rpx; font-weight: 600; flex-shrink: 0;
}
.feed-content { margin-top: 18rpx; color: #2b3345; font-size: 28rpx; line-height: 1.7; }
.feed-images { margin-top: 14rpx; display: flex; gap: 10rpx; flex-wrap: wrap; }
.feed-img-wrap {
  width: 210rpx; height: 210rpx; border-radius: 16rpx; overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(31, 38, 66, 0.08);
}
.feed-img {
  width: 100%; height: 100%; display: block;
}
.feed-stats {
  margin-top: 18rpx; display: flex; gap: 28rpx; padding-top: 16rpx;
  border-top: 1rpx solid rgba(238, 240, 246, 0.6);
}
.stat-item {
  display: flex; align-items: center; gap: 6rpx;
  color: #6a7e9a; font-size: 24rpx;
  transition: color 0.2s ease;
}
.stat-item.liked { color: #e63950; }
.like-icon { display: inline-block; font-size: 26rpx; }
.comment-section { margin-top: 14rpx; padding: 22rpx; }
.section-title { color: #1a2540; font-size: 27rpx; font-weight: 700; margin-bottom: 14rpx; }
.no-comment { color: #8a95ac; font-size: 24rpx; text-align: center; padding: 30rpx 0; }
.comment-item { padding: 14rpx 0; border-bottom: 1rpx solid rgba(240, 242, 248, 0.6); }
.comment-item:last-child { border-bottom: none; }
.comment-head { display: flex; align-items: center; gap: 8rpx; }
.comment-author { color: #4a5a78; font-size: 23rpx; font-weight: 700; }
.reply-hint { color: #8a95ac; font-size: 22rpx; }
.comment-time { margin-left: auto; color: #8a95ac; font-size: 20rpx; }
.comment-body {
  margin-top: 8rpx; color: #2b3345; font-size: 25rpx; line-height: 1.6;
  padding: 8rpx 0; border-radius: 8rpx;
}
.input-bar {
  position: fixed; left: 0; right: 0; bottom: 0; padding: 14rpx 20rpx 28rpx;
  display: flex; gap: 12rpx;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20rpx); -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
}
.comment-input {
  flex: 1; height: 76rpx; padding: 0 22rpx; border-radius: 38rpx;
  background: rgba(243, 245, 251, 0.9); color: #2b3345; font-size: 26rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
}
.send-btn {
  margin: 0; height: 76rpx; line-height: 76rpx; border-radius: 38rpx; border: none;
  background: linear-gradient(135deg, #7c3aed, #9b5bf5); color: #fff;
  font-size: 26rpx; font-weight: 600; padding: 0 30rpx;
  box-shadow: 0 4rpx 14rpx rgba(124, 58, 237, 0.3);
}
.send-btn::after { border: none; }
</style>
