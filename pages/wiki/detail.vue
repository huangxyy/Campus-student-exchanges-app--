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
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { getArticle } from "@/utils/wiki-service";

export default {
  components: { EmptyState },

  data() {
    return {
      articleId: "",
      article: null,
      loading: false
    };
  },

  onLoad(query) {
    this.articleId = query.id || "";
    this.loadArticle();
  },

  methods: {
    async loadArticle() {
      if (!this.articleId) { return; }
      this.loading = true;
      try {
        this.article = await getArticle(this.articleId);
      } finally {
        this.loading = false;
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
</style>
