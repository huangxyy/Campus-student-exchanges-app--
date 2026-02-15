<template>
  <view class="wiki-page">
    <view class="banner card anim-slide-down">
      <view class="banner-top">
        <view>
          <view class="banner-title">校园维基</view>
          <view class="banner-desc">校园生活经验与知识沉淀</view>
        </view>
        <button class="submit-btn btn-bounce" size="mini" @tap="goSubmit">投稿</button>
      </view>
    </view>

    <view class="cat-row anim-fade-in anim-d1">
      <text
        v-for="cat in categories"
        :key="cat"
        :class="['cat-tag', currentCategory === cat ? 'active' : '']"
        @tap="currentCategory = cat"
      >{{ cat }}</text>
    </view>

    <empty-state
      v-if="list.length === 0 && !loading"
      title="暂无文章"
      description="快来投稿第一篇校园攻略吧"
      action-text="去投稿"
      @action="goSubmit"
    />

    <view
      v-for="(item, idx) in list"
      :key="item.id"
      :class="['wiki-card', 'card', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 1)) : '']"
      @tap="goDetail(item.id)"
    >
      <view class="wiki-title">{{ item.title }}</view>
      <view class="wiki-summary" v-if="item.summary">{{ item.summary }}</view>
      <view class="wiki-meta">
        <text class="wiki-cat">{{ item.category }}</text>
        <text class="wiki-author">{{ item.authorName }}</text>
        <text class="wiki-views">{{ item.viewCount }} 次阅读</text>
      </view>
    </view>

    <view v-if="loading" class="loading-text">加载中...</view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { listArticles } from "@/utils/wiki-service";

export default {
  components: { EmptyState },

  data() {
    return {
      list: [],
      loading: false,
      currentCategory: "全部",
      categories: ["全部", "新生指南", "学习攻略", "生活技巧", "校园设施", "其他"]
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; }
  },

  onShow() { this.loadList(); },

  onPullDownRefresh() {
    this.loadList().finally(() => uni.stopPullDownRefresh());
  },

  watch: {
    currentCategory() { this.loadList(); }
  },

  methods: {
    async loadList() {
      this.loading = true;
      try {
        const cat = this.currentCategory === "全部" ? "" : this.currentCategory;
        this.list = await listArticles(cat).catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    goDetail(id) {
      uni.navigateTo({ url: `/pages/wiki/detail?id=${id}` });
    },

    goSubmit() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url: "/pages/wiki/submit" });
    }
  }
};
</script>

<style lang="scss" scoped>
.wiki-page {
  padding: 24rpx; padding-bottom: 120rpx;
  background: radial-gradient(circle at 10% 6%, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0)),
    radial-gradient(circle at 90% 20%, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0)), #f5f7fc;
}
.banner { padding: 26rpx; background: linear-gradient(140deg, rgba(232, 252, 244, 0.96), rgba(245, 255, 250, 0.98)), #ffffff; border: 1rpx solid #c8e8d8; }
.banner-top { display: flex; align-items: flex-start; justify-content: space-between; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.submit-btn {
  margin: 0; height: 58rpx; line-height: 58rpx; border-radius: 32rpx; border: none;
  background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 22rpx; padding: 0 24rpx;
}
.submit-btn::after { border: none; }
.cat-row { margin: 16rpx 4rpx 10rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.cat-tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.cat-tag.active { background: #10b981; color: #fff; }
.wiki-card { margin-bottom: 12rpx; padding: 20rpx; }
.wiki-title { color: #1f2430; font-size: 29rpx; font-weight: 600; }
.wiki-summary { margin-top: 8rpx; color: #5f6d85; font-size: 24rpx; line-height: 1.5; }
.wiki-meta { margin-top: 10rpx; display: flex; align-items: center; gap: 14rpx; color: #8a93a7; font-size: 22rpx; }
.wiki-cat { background: #e0f5ec; color: #0d9668; border-radius: 999rpx; padding: 4rpx 12rpx; font-size: 20rpx; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
