<template>
  <view class="wiki-detail-page">
    <view v-if="loading" class="loading">加载中...</view>

    <empty-state
      v-else-if="!article"
      title="文章不存在"
      description="可能已被删除或尚未通过审核"
      action-text="返回维基首页"
      @action="goBack"
    />

    <template v-else>
      <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
        <view class="hero-deco"></view>
        <view class="article-title">{{ article.title }}</view>
        <view class="article-meta">
          <text class="meta-cat">{{ article.category }}</text>
          <text class="meta-author">✍️ {{ article.authorName }}</text>
          <text class="meta-views">👁 {{ article.viewCount }}</text>
        </view>
      </view>

      <view class="body glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
        <view class="body-header">
          <view class="body-bar"></view>
          <text class="body-label">正文</text>
        </view>
        <view class="article-content">{{ article.content }}</view>
      </view>

      <view class="comments-section glass-strong anim-slide-up anim-d2" style="border-radius: 24rpx;">
        <view class="body-header">
          <view class="body-bar"></view>
          <text class="body-label">评论 ({{ comments.length }})</text>
        </view>
        <view v-if="comments.length === 0" class="comments-empty">暂无评论，来说两句吧</view>
        <view v-for="c in comments" :key="c.id" class="comment-item">
          <text class="comment-user">{{ c.userName }}</text>
          <text class="comment-content">{{ c.content }}</text>
          <text class="comment-time">{{ formatTime(c.createdAt) }}</text>
        </view>
        <view class="comment-input-row">
          <input v-model.trim="commentText" class="comment-input" placeholder="写一条评论..." maxlength="500" />
          <button class="comment-btn btn-bounce" size="mini" :disabled="submitting || !commentText" @tap="submitComment">发送</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { getArticle, listComments, addComment } from "@/utils/wiki-service";
import { formatRelativeTime } from "@/utils/date";
import { showError } from "@/utils/error-handler";

export default {
  components: { EmptyState },

  data() {
    return {
      articleId: "",
      article: null,
      loading: false,
      comments: [],
      commentText: "",
      submitting: false
    };
  },

  onLoad(query) {
    this.articleId = query.id || "";
    this.loadArticle();
    this.loadComments();
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    async loadArticle() {
      if (!this.articleId) { return; }
      this.loading = true;
      try {
        this.article = await getArticle(this.articleId);
      } finally {
        this.loading = false;
      }
    },

    async loadComments() {
      if (!this.articleId) return;
      this.comments = await listComments(this.articleId).catch(() => []);
    },

    async submitComment() {
      if (!this.commentText || this.submitting) return;
      this.submitting = true;
      try {
        const c = await addComment(this.articleId, this.commentText);
        this.comments.push(c);
        this.commentText = "";
        uni.showToast({ title: "评论成功", icon: "success" });
      } catch (error) {
        showError(error, { title: "评论失败" });
      } finally {
        this.submitting = false;
      }
    },

    goBack() { uni.navigateBack(); }
  }
};
</script>

<style lang="scss" scoped>
.wiki-detail-page {
  position: relative;
  padding: 24rpx; padding-bottom: 120rpx;
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 6%, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0) 45%),
    radial-gradient(circle at 88% 18%, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0) 40%),
    #f2f5fc;
}
.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }

.hero { position: relative; padding: 28rpx; overflow: hidden; }
.hero-deco {
  position: absolute; top: -50rpx; right: -30rpx; width: 180rpx; height: 180rpx; border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent); pointer-events: none;
}
.article-title { position: relative; color: #1a2540; font-size: 36rpx; font-weight: 800; line-height: 1.5; }
.article-meta { margin-top: 16rpx; display: flex; align-items: center; gap: 16rpx; color: #8a95ac; font-size: 22rpx; }
.meta-cat {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.06));
  color: #0d9668; border-radius: 999rpx; padding: 6rpx 16rpx; font-size: 21rpx; font-weight: 600;
}

.body { margin-top: 16rpx; padding: 24rpx; }
.body-header {
  display: flex; align-items: center; gap: 10rpx; margin-bottom: 20rpx;
  padding-bottom: 16rpx; border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
}
.body-bar {
  width: 6rpx; height: 28rpx; border-radius: 3rpx;
  background: linear-gradient(180deg, #10b981, #059669);
}
.body-label { color: #1a2540; font-size: 28rpx; font-weight: 700; }
.article-content { color: #2b3a56; font-size: 28rpx; line-height: 2; white-space: pre-wrap; letter-spacing: 0.3rpx; }

.comments-section { margin-top: 16rpx; padding: 24rpx; }
.comments-empty { color: #8a96a8; font-size: 24rpx; padding: 24rpx 0; text-align: center; }
.comment-item { padding: 16rpx 0; border-bottom: 1rpx solid rgba(228,235,251,0.5); }
.comment-user { color: #1f2636; font-size: 24rpx; font-weight: 600; }
.comment-content { display: block; color: #2b3a56; font-size: 26rpx; margin-top: 6rpx; }
.comment-time { display: block; color: #8a96a8; font-size: 20rpx; margin-top: 6rpx; }
.comment-input-row { display: flex; gap: 16rpx; margin-top: 20rpx; align-items: center; }
.comment-input { flex: 1; height: 72rpx; padding: 0 20rpx; border-radius: 36rpx; background: #f6f8fc; border: 1rpx solid #e5ebf8; font-size: 26rpx; }
.comment-btn { margin: 0; padding: 0 28rpx; height: 64rpx; line-height: 64rpx; border-radius: 32rpx; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 24rpx; }
.comment-btn::after { border: none; }
</style>
