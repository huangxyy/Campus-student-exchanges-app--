<template>
  <view class="home-page">
    <view class="hero card anim-slide-down">
      <view class="hero-top">
        <view>
          <view class="welcome">{{ welcomeText }}</view>
          <view class="sub">发现校园好物，也能快速发布临时任务</view>
        </view>
        <view class="profile-chip btn-bounce" @tap="goProfile">{{ isLogin ? "个人中心" : "去登录" }}</view>
      </view>

      <view class="search anim-scale-in anim-d2" @tap="goProducts">
        <text class="search-icon">⌕</text>
        <text class="search-text">搜索教材、数码、生活用品...</text>
      </view>

      <view class="stats-row anim-slide-up anim-d3">
        <view class="stat-pill">
          <text class="stat-value">{{ recommendList.length || 0 }}</text>
          <text class="stat-label">推荐商品</text>
        </view>
        <view class="stat-pill">
          <text class="stat-value">7*24</text>
          <text class="stat-label">消息可达</text>
        </view>
        <view class="stat-pill">
          <text class="stat-value">校内</text>
          <text class="stat-label">当面交易</text>
        </view>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d3">
      <text class="section-title">快捷入口</text>
    </view>

    <view class="entry-grid">
      <view v-for="(item, idx) in quickEntries" :key="item.key" :class="['entry', 'card', 'card-press', 'anim-scale-in', item.tone, 'anim-d' + (idx + 3)]" @tap="handleQuickEntry(item.key)">
        <view class="entry-icon">{{ item.icon }}</view>
        <view class="entry-title">{{ item.title }}</view>
        <view class="entry-desc">{{ item.desc }}</view>
        <view class="entry-arrow">→</view>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d5">
      <text class="section-title">推荐商品</text>
      <text class="section-link" @tap="goProducts">查看全部</text>
    </view>

    <view v-if="loading" class="loading">
      <view class="skeleton-card skeleton-shimmer"></view>
      <view class="skeleton-card skeleton-shimmer" style="animation-delay: 0.2s"></view>
    </view>

    <view v-else>
      <empty-state
        v-if="recommendList.length === 0"
        title="还没有推荐商品"
        description="等同学们发布后再来看看"
      />
      <product-card
        v-for="item in recommendList"
        :key="item._id"
        :product="item"
        @click="goProductDetail(item._id)"
      />
    </view>

    <view v-if="!isLogin" class="login-tip card anim-slide-up anim-d6">
      <view class="tip-title">登录后可发布商品与任务</view>
      <button class="tip-btn btn-bounce" @tap="goLogin">去登录</button>
    </view>
  </view>
</template>

<script>
import ProductCard from "@/components/product-card/product-card.vue";
import EmptyState from "@/components/empty-state/empty-state.vue";
import { queryProducts } from "@/utils/product-service";
import { useUserStore } from "@/store/user";

export default {
  components: {
    ProductCard,
    EmptyState
  },

  data() {
    return {
      loading: false,
      recommendList: [],
      quickEntries: [
        {
          key: "products",
          icon: "🛒",
          title: "商品市场",
          desc: "浏览在售二手好物",
          tone: "tone-ocean"
        },
        {
          key: "publish",
          icon: "✦",
          title: "发布商品",
          desc: "极简模式快速发布",
          tone: "tone-blue"
        },
        {
          key: "tasks",
          icon: "📌",
          title: "任务大厅",
          desc: "代取、代会、跑腿需求",
          tone: "tone-amber"
        },
        {
          key: "express",
          icon: "📦",
          title: "快递专区",
          desc: "紧急单快速抢单",
          tone: "tone-green"
        },
        {
          key: "chat",
          icon: "💬",
          title: "我的会话",
          desc: "实时查看交易消息",
          tone: "tone-indigo"
        },
        {
          key: "want",
          icon: "🔍",
          title: "求购广场",
          desc: "发布需求让卖家找你",
          tone: "tone-orange"
        },
        {
          key: "feeds",
          icon: "📢",
          title: "校园动态",
          desc: "分享校园生活趣事",
          tone: "tone-violet"
        },
        {
          key: "wiki",
          icon: "📖",
          title: "校园维基",
          desc: "经验攻略知识库",
          tone: "tone-green"
        },
        {
          key: "activity",
          icon: "🎉",
          title: "活动专题",
          desc: "校园精彩活动",
          tone: "tone-red"
        },
        {
          key: "points",
          icon: "⭐",
          title: "积分中心",
          desc: "签到赚积分换好礼",
          tone: "tone-amber"
        },
        {
          key: "profile",
          icon: "🙂",
          title: "我的主页",
          desc: "收藏、任务与订单",
          tone: "tone-ocean"
        }
      ]
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    displayName() {
      return this.userStore.displayName;
    },

    welcomeText() {
      return this.isLogin ? `你好，${this.displayName}` : "你好，未登录";
    },

    isLogin() {
      return this.userStore.isLogin;
    }
  },

  onShow() {
    this.loadRecommendProducts();
  },

  methods: {
    async loadRecommendProducts() {
      this.loading = true;
      try {
        const res = await queryProducts({
          page: 1,
          pageSize: 4,
          sortBy: "views"
        });
        this.recommendList = res.list;
      } catch (error) {
        uni.showToast({
          title: "加载推荐失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },

    goProducts() {
      uni.navigateTo({
        url: "/pages/products/list"
      });
    },

    handleQuickEntry(key) {
      if (key === "products") {
        this.goProducts();
        return;
      }
      if (key === "publish") {
        this.goPublish();
        return;
      }
      if (key === "tasks") {
        this.goTasks();
        return;
      }
      if (key === "express") {
        uni.navigateTo({
          url: "/pages/tasks/express"
        });
        return;
      }
      if (key === "chat") {
        this.goChat();
        return;
      }
      if (key === "want") {
        uni.navigateTo({ url: "/pages/want/list" });
        return;
      }
      if (key === "feeds") {
        uni.navigateTo({ url: "/pages/feeds/list" });
        return;
      }
      if (key === "wiki") {
        uni.navigateTo({ url: "/pages/wiki/index" });
        return;
      }
      if (key === "activity") {
        uni.navigateTo({ url: "/pages/activity/index" });
        return;
      }
      if (key === "points") {
        uni.navigateTo({ url: "/pages/points/index" });
        return;
      }
      this.goProfile();
    },

    goProductDetail(id) {
      uni.navigateTo({
        url: `/pages/products/detail?id=${id}`
      });
    },

    goTasks() {
      uni.switchTab({
        url: "/pages/tasks/list"
      });
    },

    goChat() {
      uni.switchTab({
        url: "/pages/chat/list"
      });
    },

    goProfile() {
      uni.switchTab({
        url: "/pages/profile/index"
      });
    },

    goPublish() {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }

      uni.navigateTo({
        url: "/pages/products/publish"
      });
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.home-page {
  padding: 24rpx;
  background:
    radial-gradient(circle at 10% 6%, rgba(52, 116, 255, 0.13), rgba(52, 116, 255, 0)),
    radial-gradient(circle at 92% 24%, rgba(54, 196, 167, 0.1), rgba(54, 196, 167, 0)),
    #f5f7fc;
}

.hero {
  padding: 30rpx;
  background:
    linear-gradient(140deg, rgba(231, 239, 255, 0.96), rgba(243, 247, 255, 0.98)),
    #ffffff;
  border: 1rpx solid #e4ebfb;
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.welcome {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2a3d;
}

.sub {
  margin-top: 10rpx;
  color: #5f6f8e;
  font-size: 24rpx;
}

.profile-chip {
  flex-shrink: 0;
  height: 54rpx;
  line-height: 54rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #2f6bff;
  color: #ffffff;
  font-size: 22rpx;
}

.search {
  margin-top: 22rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1rpx solid #dce6ff;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 20rpx;
}

.search-icon {
  color: #6f81a8;
  font-size: 26rpx;
}

.search-text {
  color: #8f99af;
  font-size: 24rpx;
}

.stats-row {
  margin-top: 16rpx;
  display: flex;
  gap: 10rpx;
}

.stat-pill {
  flex: 1;
  min-height: 68rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid #e3eaf9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.stat-value {
  color: #2e5fce;
  font-size: 25rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 2rpx;
  color: #7080a0;
  font-size: 20rpx;
}

.section-head {
  margin: 28rpx 4rpx 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 30rpx;
  color: #1f2430;
  font-weight: 700;
}

.section-link {
  color: #5f72a0;
  font-size: 23rpx;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.entry {
  position: relative;
  padding: 22rpx;
  min-height: 150rpx;
  overflow: hidden;
}

.entry-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 31rpx;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.56);
  animation: anim-float 3s ease-in-out infinite;
}

.entry-title {
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2a3c;
}

.entry-desc {
  margin-top: 8rpx;
  color: #657590;
  font-size: 22rpx;
}

.entry-arrow {
  position: absolute;
  right: 18rpx;
  bottom: 16rpx;
  color: #6a7da8;
  font-size: 24rpx;
}

.tone-ocean {
  background: linear-gradient(140deg, rgba(224, 239, 255, 0.95), rgba(236, 246, 255, 0.95));
}

.tone-blue {
  background: linear-gradient(140deg, rgba(231, 236, 255, 0.95), rgba(241, 244, 255, 0.96));
}

.tone-amber {
  background: linear-gradient(140deg, rgba(255, 239, 222, 0.94), rgba(255, 247, 235, 0.96));
}

.tone-green {
  background: linear-gradient(140deg, rgba(227, 247, 240, 0.95), rgba(238, 251, 246, 0.96));
}

.tone-indigo {
  background: linear-gradient(140deg, rgba(232, 236, 255, 0.95), rgba(240, 243, 255, 0.96));
}

.tone-violet {
  background: linear-gradient(140deg, rgba(243, 238, 255, 0.95), rgba(248, 245, 255, 0.96));
}

.tone-orange {
  background: linear-gradient(140deg, rgba(255, 240, 225, 0.95), rgba(255, 248, 238, 0.96));
}

.tone-red {
  background: linear-gradient(140deg, rgba(255, 235, 235, 0.95), rgba(255, 246, 246, 0.96));
}

.loading {
  margin: 20rpx 0;
}

.skeleton-card {
  height: 260rpx;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
}

.login-tip {
  margin-top: 20rpx;
  padding: 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tip-title {
  color: #384258;
  font-size: 25rpx;
}

.tip-btn {
  margin: 0;
  width: 160rpx;
  height: 64rpx;
  line-height: 64rpx;
  background: #2f6bff;
  color: #fff;
  font-size: 24rpx;
  border-radius: 32rpx;
  border: none;
}
</style>
