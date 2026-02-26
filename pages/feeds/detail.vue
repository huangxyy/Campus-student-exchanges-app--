<template>
  <view class="feed-detail-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <empty-state
      v-else-if="!feed"
      title="动态不存在"
      description="可能已被删除"
      action-text="返回动态列表"
      @action="goBack"
    />

    <template v-else>
      <view class="feed-card glass-strong anim-slide-down" style="border-radius: 28rpx;">
        <view class="feed-header">
          <view class="avatar-ring" v-if="feed.authorAvatar">
            <image :src="feed.authorAvatar" class="avatar" mode="aspectFill" />
          </view>
          <view v-else class="avatar-placeholder">{{ (feed.authorName || '?')[0] }}</view>
          <view class="author-info">
            <view class="name-row">
              <text class="author-name">{{ feed.authorName }}</text>
              <text v-if="feed.topic" class="topic-chip">{{ feed.topic }}</text>
            </view>
            <text class="feed-time">{{ formatTime(feed.createdAt) }}</text>
          </view>
        </view>
        
        <view class="feed-content">{{ feed.content }}</view>
        
        <view v-if="feed.images && feed.images.length > 0" class="feed-images">
          <view
            v-for="(img, idx) in feed.images"
            :key="idx"
            class="image-wrapper img-zoom-wrap"
            @tap="previewImage(feed.images, idx)"
          >
            <image :src="img" class="feed-img" mode="aspectFill" />
          </view>
        </view>
        
        <view class="feed-footer">
          <view class="action-group">
            <view :class="['action-btn', isLiked ? 'liked' : '']" @tap="handleLike">
              <text :class="['action-icon', likeAnimating ? 'anim-heart' : '']">{{ isLiked ? '❤️' : '🤍' }}</text>
              <text class="action-text">{{ feed.likeCount || '赞' }}</text>
            </view>
            <view class="action-btn">
              <text class="action-icon">💬</text>
              <text class="action-text">{{ comments.length || '评论' }}</text>
            </view>
          </view>
          
          <view class="action-group">
            <view v-if="isOwner" class="action-btn icon-only" @tap="handleDeleteFeed">
              <text class="action-icon">🗑️</text>
            </view>
            <view v-else class="action-btn icon-only" @tap="reportFeed">
              <text class="action-icon">⚠️</text>
            </view>
          </view>
        </view>
      </view>

      <view class="comment-section glass-strong anim-slide-up anim-d2" style="border-radius: 28rpx;">
        <view class="section-header">
          <text class="section-title">全部评论</text>
          <text class="comment-count-badge">{{ comments.length }}</text>
        </view>
        
        <view v-if="comments.length === 0" class="empty-comment">
          <text class="empty-emoji anim-float">💬</text>
          <text>暂无评论，来做第一个发言的人吧</text>
        </view>
        
        <view class="comment-list">
          <view
            v-for="(cmt, idx) in comments"
            :key="cmt.id"
            :class="['comment-item', 'anim-stagger-fade', idx < 10 ? ('anim-d' + (idx + 1)) : '']"
            @tap="setReplyTarget(cmt)"
          >
            <view class="comment-avatar">{{ (cmt.authorName || '?')[0] }}</view>
            <view class="comment-content">
              <view class="comment-head">
                <text class="comment-author">{{ cmt.authorName }}</text>
                <text v-if="cmt.replyToName" class="reply-hint">
                  <text class="reply-arrow">▸</text> {{ cmt.replyToName }}
                </text>
                <text class="comment-time">{{ formatTime(cmt.createdAt) }}</text>
              </view>
              <view class="comment-body">{{ cmt.content }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="input-bar-container">
        <view class="input-bar glass-strong">
          <view v-if="replyTarget" class="reply-badge" @tap="replyTarget = null">
            <text>回复 {{ replyTarget.authorName }}</text>
            <text class="close-icon">×</text>
          </view>
          <view class="input-wrapper">
            <input
              v-model="commentText"
              class="comment-input"
              :placeholder="replyTarget ? '说点什么...' : '写下你的评论...'"
              confirm-type="send"
              :adjust-position="true"
              @confirm="submitComment"
            />
            <button 
              class="send-btn btn-bounce" 
              :class="{ 'active': commentText.trim().length > 0 }"
              @tap="submitComment" 
              :loading="commentSubmitting"
            >
              发送
            </button>
          </view>
        </view>
      </view>
    </template>

    <report-dialog ref="reportDialog" />
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import ReportDialog from "@/components/report-dialog/report-dialog.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { getFeedById, toggleLike, deleteFeed, listComments, addComment } from "@/utils/feed-service";
import { showError } from "@/utils/error-handler";

export default {
  components: { EmptyState, ReportDialog },

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
    isLiked() { return this.feed && this.feed.likedBy && this.feed.likedBy.includes(this.myUserId); },
    isOwner() { return this.feed && this.myUserId && this.feed.authorId === this.myUserId; }
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
      if (!this.feed) { return; }
      this.likeAnimating = true;
      setTimeout(() => { this.likeAnimating = false; }, 600);

      const prev = { ...this.feed };
      const wasLiked = this.isLiked;
      this.feed = {
        ...this.feed,
        likedBy: wasLiked
          ? (this.feed.likedBy || []).filter((id) => id !== this.myUserId)
          : [...(this.feed.likedBy || []), this.myUserId],
        likeCount: Math.max(0, (this.feed.likeCount || 0) + (wasLiked ? -1 : 1))
      };

      try {
        const result = await toggleLike(this.feedId);
        if (result === null) { this.feed = prev; }
      } catch (e) {
        this.feed = prev;
        showError(e, { title: "操作失败" });
      }
    },

    setReplyTarget(comment) {
      this.replyTarget = comment;
    },

    async submitComment() {
      if (!this.commentText.trim()) { return; }
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      if (this.commentSubmitting) { return; }

      this.commentSubmitting = true;
      try {
        await addComment({
          feedId: this.feedId,
          content: this.commentText.trim(),
          replyToCommentId: this.replyTarget?.id || "",
          replyToName: this.replyTarget?.authorName || ""
        });
        this.commentText = "";
        this.replyTarget = null;
        this.comments = await listComments(this.feedId).catch(() => this.comments);
        this.feed = await getFeedById(this.feedId).catch(() => this.feed);
      } catch (error) {
        showError(error, { title: "评论失败" });
      } finally {
        this.commentSubmitting = false;
      }
    },

    reportFeed() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      this.$refs.reportDialog.open("feed", this.feedId);
    },

    handleDeleteFeed() {
      uni.showModal({
        title: "删除动态",
        content: "确定删除这条动态？删除后不可恢复。",
        success: async (res) => {
          if (!res.confirm) { return; }
          const ok = await deleteFeed(this.feedId);
          if (ok) {
            uni.showToast({ title: "已删除", icon: "success" });
            setTimeout(() => { uni.navigateBack(); }, 600);
          } else {
            showError("UNKNOWN", { title: "删除失败" });
          }
        }
      });
    },

    goBack() { uni.navigateBack(); }
  }
};
</script>

<style lang="scss" scoped>
.feed-detail-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
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
  top: -30rpx; left: -40rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.28), transparent 70%);
}
.orb-2 {
  width: 160rpx; height: 160rpx;
  top: 500rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.22), transparent 70%);
}

/* Feed Card */
.feed-card {
  position: relative;
  padding: 28rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 20rpx;
}
.avatar-ring {
  width: 88rpx; height: 88rpx;
  border-radius: 50%;
  padding: 3rpx;
  background: linear-gradient(135deg, #2f6bff, #13c2a3);
  flex-shrink: 0;
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.2);
}
.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 3rpx solid #fff;
  display: block;
}
.avatar-placeholder {
  width: 88rpx; height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8efff, #dfe9ff);
  color: #4b62a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.author-info { flex: 1; }
.name-row { display: flex; align-items: center; gap: 12rpx; }
.author-name { font-size: 30rpx; font-weight: 700; color: #1a2540; }
.topic-chip {
  height: 36rpx; line-height: 36rpx; padding: 0 14rpx;
  border-radius: 999rpx; background: rgba(47, 107, 255, 0.08);
  color: #4a78d4; font-size: 20rpx; font-weight: 600;
}
.feed-time { font-size: 24rpx; color: #8a95ac; margin-top: 4rpx; display: block; }

.feed-content {
  font-size: 30rpx;
  color: #2b3a56;
  line-height: 1.65;
  margin-bottom: 22rpx;
  word-break: break-all;
}

/* Images Grid */
.feed-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
  margin-bottom: 24rpx;
}
.image-wrapper {
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  box-shadow: 0 4rpx 12rpx rgba(26, 38, 66, 0.06);
}
.feed-img {
  width: 100%; height: 100%;
  background-color: #eef2fb;
  display: block;
}

/* Footer Actions */
.feed-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
}
.action-group { display: flex; gap: 16rpx; }
.action-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.6);
  transition: all 0.2s ease;
}
.action-btn:active { background: rgba(228, 235, 251, 0.9); transform: scale(0.95); }
.action-btn.icon-only { padding: 12rpx 16rpx; }
.action-btn.liked { background: rgba(255, 215, 220, 0.5); }
.action-btn.liked .action-text { color: #e25269; font-weight: 700; }
.action-icon { font-size: 30rpx; }
.action-text { font-size: 26rpx; font-weight: 600; color: #6a7e9a; }

/* Comment Section */
.comment-section {
  position: relative;
  padding: 28rpx;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.section-title { font-size: 30rpx; font-weight: 800; color: #1a2540; }
.comment-count-badge {
  height: 36rpx; line-height: 36rpx; padding: 0 14rpx;
  border-radius: 999rpx; background: rgba(47, 107, 255, 0.08);
  color: #4a78d4; font-size: 22rpx; font-weight: 700;
}

.empty-comment {
  padding: 50rpx 0;
  text-align: center;
  color: #8a95ac;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.empty-emoji { font-size: 48rpx; }

.comment-item {
  display: flex;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
}
.comment-item:last-child { border-bottom: none; padding-bottom: 0; }
.comment-item:active {
  background-color: rgba(238, 242, 251, 0.4);
  border-radius: 16rpx;
  margin: 0 -8rpx;
  padding-left: 8rpx;
  padding-right: 8rpx;
}

.comment-avatar {
  width: 64rpx; height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8efff, #dfe9ff);
  color: #4b62a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.comment-content { flex: 1; }
.comment-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.comment-author { font-size: 26rpx; font-weight: 700; color: #1a2540; }
.reply-hint {
  font-size: 24rpx; color: #8a95ac;
  display: flex; align-items: center; gap: 4rpx;
}
.reply-arrow { font-size: 18rpx; }
.comment-time { font-size: 22rpx; color: #b0b8cc; margin-left: auto; }
.comment-body { font-size: 28rpx; color: #3a4a68; line-height: 1.55; }

/* Input Bar */
.input-bar-container {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 100;
}
.input-bar {
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  border-radius: 28rpx 28rpx 0 0 !important;
}
.reply-badge {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  background: rgba(47, 107, 255, 0.06);
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #4a78d4;
  font-weight: 500;
  align-self: flex-start;
  border: 1rpx solid rgba(47, 107, 255, 0.12);
}
.close-icon { font-size: 28rpx; line-height: 1; color: #8a95ac; }

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.comment-input {
  flex: 1;
  height: 76rpx;
  background: rgba(238, 242, 251, 0.7);
  border-radius: 38rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  color: #1a2540;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
}
.send-btn {
  margin: 0;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 36rpx;
  border-radius: 38rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #8a95ac;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  transition: all 0.25s ease;
}
.send-btn.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  box-shadow: 0 6rpx 16rpx rgba(47, 107, 255, 0.25);
}
.send-btn::after { border: none; }

/* States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  gap: 16rpx;
  color: #8a95ac;
  font-size: 26rpx;
}
.loading-spinner {
  width: 48rpx; height: 48rpx;
  border: 4rpx solid #e0e8f8;
  border-top-color: #2f6bff;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.anim-heart {
  animation: heartPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes heartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
</style>
