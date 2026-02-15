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
      <view class="hero card anim-slide-down">
        <view class="article-title">{{ article.title }}</view>
        <view class="article-meta">
          <text class="meta-cat">{{ article.category }}</text>
          <text class="meta-author">{{ article.authorName }}</text>
          <text class="meta-views">{{ article.viewCount }} 次阅读</text>
        </view>
      </view>

      <view class="body card anim-slide-up anim-d1">
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
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 10% 6%, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0)), #f5f7fc;
}
.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }
.hero { padding: 24rpx; background: linear-gradient(140deg, rgba(232, 252, 244, 0.96), rgba(245, 255, 250, 0.98)), #ffffff; border: 1rpx solid #c8e8d8; }
.article-title { color: #1f2430; font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.article-meta { margin-top: 14rpx; display: flex; align-items: center; gap: 14rpx; color: #8a93a7; font-size: 22rpx; }
.meta-cat { background: #e0f5ec; color: #0d9668; border-radius: 999rpx; padding: 4rpx 12rpx; font-size: 20rpx; }
.body { margin-top: 14rpx; padding: 22rpx; }
.article-content { color: #2b3345; font-size: 28rpx; line-height: 1.85; white-space: pre-wrap; }
</style>
