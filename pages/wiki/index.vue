<template>
  <view class="wiki-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-top">
        <view>
          <view class="banner-title">📖 校园维基</view>
          <view class="banner-desc">校园生活经验与知识沉淀</view>
        </view>
        <button class="submit-btn btn-bounce" size="mini" @tap="goSubmit">✏️ 投稿</button>
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
      :class="['wiki-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 1)) : '']"
      style="border-radius: 22rpx;"
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
  position: relative;
  padding: 24rpx; padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 10% 6%, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0) 45%),
    radial-gradient(circle at 90% 20%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 40%),
    radial-gradient(circle at 50% 70%, rgba(124, 58, 237, 0.04), rgba(124, 58, 237, 0) 40%),
    #f2f5fc;
}

.page-orbs {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; overflow: hidden;
}
.orb { position: absolute; border-radius: 50%; filter: blur(40rpx); opacity: 0.45; }
.orb-1 { width: 180rpx; height: 180rpx; top: -20rpx; left: -30rpx; background: radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent 70%); }
.orb-2 { width: 140rpx; height: 140rpx; top: 350rpx; right: -30rpx; background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%); }

.banner { position: relative; padding: 28rpx; margin-bottom: 4rpx; overflow: hidden; }
.banner-deco {
  position: absolute; top: -50rpx; right: -30rpx; width: 180rpx; height: 180rpx; border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent); pointer-events: none;
}
.banner-top { position: relative; display: flex; align-items: flex-start; justify-content: space-between; }
.banner-title { color: #1a2540; font-size: 36rpx; font-weight: 800; }
.banner-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; }
.submit-btn {
  margin: 0; height: 64rpx; line-height: 64rpx; border-radius: 32rpx; border: none;
  background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 24rpx; font-weight: 600;
  padding: 0 28rpx; box-shadow: 0 6rpx 18rpx rgba(16, 185, 129, 0.3);
  display: flex; align-items: center; gap: 6rpx; flex-shrink: 0;
}
.submit-btn::after { border: none; }

.cat-row { margin: 16rpx 4rpx 12rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.cat-tag {
  padding: 12rpx 22rpx; border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7); color: #5f708e; font-size: 24rpx; font-weight: 600;
  border: 1rpx solid rgba(228, 235, 251, 0.5); transition: all 0.25s ease;
}
.cat-tag.active {
  background: linear-gradient(135deg, #10b981, #059669); color: #fff;
  border-color: transparent; box-shadow: 0 4rpx 14rpx rgba(16, 185, 129, 0.3);
}

.wiki-card { margin-bottom: 14rpx; padding: 22rpx; }
.wiki-title { color: #1a2540; font-size: 29rpx; font-weight: 700; }
.wiki-summary { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wiki-meta { margin-top: 12rpx; display: flex; align-items: center; gap: 14rpx; color: #8a95ac; font-size: 22rpx; }
.wiki-cat {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.06));
  color: #0d9668; border-radius: 999rpx; padding: 6rpx 14rpx; font-size: 20rpx; font-weight: 600;
}
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
