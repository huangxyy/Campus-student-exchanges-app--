<template>
  <view class="home-page">
    <!-- ========== Splash Screen 开屏加载界面 ========== -->
    <view v-if="showSplash" :class="['splash-screen', splashFadingOut ? 'splash-fade-out' : '']">
      <view class="splash-bg">
        <view class="splash-orb splash-orb-1"></view>
        <view class="splash-orb splash-orb-2"></view>
        <view class="splash-orb splash-orb-3"></view>
      </view>

      <view class="splash-content">
        <view class="splash-logo-group">
          <view class="splash-ring splash-ring-outer"></view>
          <view class="splash-ring splash-ring-inner"></view>
          <view class="splash-icons">
            <view class="splash-icon splash-icon-1">🛒</view>
            <view class="splash-icon splash-icon-2">📌</view>
            <view class="splash-icon splash-icon-3">💬</view>
          </view>
          <view class="splash-logo">🎓</view>
        </view>

        <view class="splash-text-group">
          <view class="splash-title">校园跳蚤市场</view>
          <view class="splash-sub">让闲置流动起来，让任务更高效</view>
        </view>

        <view class="splash-loader">
          <view class="splash-loader-track">
            <view class="splash-loader-fill"></view>
          </view>
          <view class="splash-loader-text">正在加载...</view>
        </view>
      </view>

      <view class="splash-footer">
        <view class="splash-footer-text">校园生活服务平台</view>
      </view>
    </view>

    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
      <view class="orb orb-3 anim-float"></view>
    </view>

    <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="hero-deco"></view>
      <view class="hero-top">
        <view>
          <view class="welcome anim-fade-in">
            <text class="greeting-emoji anim-bounce-in" @tap.stop="onEmojiTap">{{ greetingEmoji }}</text>
            {{ welcomeText }}
          </view>
          <view class="sub anim-fade-in anim-d2">发现校园好物，也能快速发布临时任务</view>
        </view>
        <view class="profile-chip btn-bounce anim-scale-in anim-d2" @tap="goProfile">
          <text class="chip-dot" v-if="isLogin"></text>
          {{ isLogin ? "个人中心" : "去登录" }}
        </view>
      </view>

      <view class="search anim-scale-in anim-d3" @tap="onSearchTap">
        <view class="search-glow"></view>
        <text class="search-icon">⌕</text>
        <text class="search-text">{{ searchPlaceholder }}</text>
        <text class="search-arrow anim-float-x">→</text>
      </view>

      <!-- 彩蛋: 五彩纸屑粒子层 -->
      <view v-if="showConfetti" class="confetti-layer">
        <text
          v-for="p in confettiParticles"
          :key="p.id"
          class="confetti-piece"
          :style="{ left: p.left + '%', animationDelay: p.delay + 's', animationDuration: p.duration + 's', fontSize: p.size + 'rpx' }"
        >{{ p.emoji }}</text>
      </view>

      <view class="stats-row anim-slide-up anim-d4">
        <view class="stat-pill glass">
          <text class="stat-value num-animate">{{ recommendList.length || 0 }}</text>
          <text class="stat-label">推荐</text>
        </view>
        <view class="stat-pill glass">
          <text class="stat-value">7×24</text>
          <text class="stat-label">可达</text>
        </view>
        <view class="stat-pill glass" @tap.stop="onHandshakeTap">
          <text class="stat-value">🤝</text>
          <text class="stat-label">面交</text>
        </view>
      </view>
    </view>

    <view class="section-head anim-stagger-fade anim-d6">
      <text class="section-title">快捷入口</text>
      <text class="section-badge">{{ quickEntries.length }}个模块</text>
    </view>

    <view class="entry-grid">
      <view
        v-for="(item, idx) in quickEntries"
        :key="item.key"
        :class="['entry', 'card-press', 'ripple-wrap', 'anim-stagger-fade', idx < 12 ? ('anim-d' + (idx + 7)) : '']"
        @tap="handleQuickEntry(item.key)"
      >
        <view class="entry-orb" :class="item.tone + '-orb'"></view>
        <view class="entry-icon anim-float">{{ item.icon }}</view>
        <view class="entry-title">{{ item.title }}</view>
        <view class="entry-desc">{{ item.desc }}</view>
        <view class="entry-arrow">›</view>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d6">
      <text class="section-title">推荐商品</text>
      <view class="section-link-wrap" @tap="goProducts">
        <text class="section-link">查看全部</text>
        <text class="section-link-arrow">→</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <view class="skeleton-card skeleton-shimmer"></view>
      <view class="skeleton-card skeleton-shimmer" style="animation-delay: 0.15s"></view>
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

    <view v-if="!isLogin" class="login-tip glass-strong anim-slide-up anim-d8" style="border-radius: 24rpx;">
      <view class="tip-left">
        <text class="tip-emoji anim-wiggle">👋</text>
        <view class="tip-title">登录后可发布商品与任务</view>
      </view>
      <button class="tip-btn btn-bounce" @tap="goLogin">去登录</button>
    </view>
  </view>
</template>

<script>
import ProductCard from "@/components/product-card/product-card.vue";
import EmptyState from "@/components/empty-state/empty-state.vue";
import { queryProducts } from "@/utils/product-service";
import { useUserStore } from "@/store/user";
import { createTapCounter, getRandomSearchPlaceholder, getRandomFunFact, generateFloatingParticles } from "@/utils/easter-eggs";

// 模块级变量 — 小程序中 this._xxx 不可靠，放在组件外部
let _emojiTapper = null;
let _gameTapper = null;
let _searchTapCount = 0;
let _searchTimer = null;

export default {
  components: {
    ProductCard,
    EmptyState
  },

  data() {
    return {
      showSplash: false,
      splashFadingOut: false,
      loading: false,
      recommendList: [],
      showConfetti: false,
      confettiParticles: [],
      searchPlaceholder: "搜索教材、数码、生活用品...",
      searchTapCount: 0,
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

    greetingEmoji() {
      const h = new Date().getHours();
      if (h < 6) return "🌙";
      if (h < 9) return "🌅";
      if (h < 12) return "☀️";
      if (h < 14) return "🍱";
      if (h < 18) return "🌤️";
      if (h < 21) return "🌇";
      return "🌙";
    },

    welcomeText() {
      const h = new Date().getHours();
      let greeting = "晚上好";
      if (h < 6) greeting = "夜深了";
      else if (h < 9) greeting = "早上好";
      else if (h < 12) greeting = "上午好";
      else if (h < 14) greeting = "中午好";
      else if (h < 18) greeting = "下午好";
      else if (h < 21) greeting = "傍晚好";
      const name = this.isLogin ? this.displayName : "同学";
      return `${greeting}，${name}`;
    },

    isLogin() {
      return this.userStore.isLogin;
    }
  },

  onLoad() {
    const app = getApp();
    if (app && !app.globalData.hasShownSplash) {
      this.showSplash = true;
      app.globalData.hasShownSplash = true;

      setTimeout(() => {
        this.splashFadingOut = true;
      }, 2400);

      setTimeout(() => {
        this.showSplash = false;
      }, 2900);
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
      const routeMap = {
        products: () => this.goProducts(),
        publish: () => this.goPublish(),
        tasks: () => this.goTasks(),
        express: () => uni.navigateTo({ url: "/pages/tasks/express" }),
        chat: () => this.goChat(),
        want: () => uni.navigateTo({ url: "/pages/want/list" }),
        feeds: () => uni.navigateTo({ url: "/pages/feeds/list" }),
        wiki: () => uni.navigateTo({ url: "/pages/wiki/index" }),
        activity: () => uni.navigateTo({ url: "/pages/activity/index" }),
        points: () => uni.navigateTo({ url: "/pages/points/index" }),
        profile: () => this.goProfile()
      };
      (routeMap[key] || routeMap.profile)();
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
    },

    // ---- 彩蛋: 连击 greeting emoji ----
    onEmojiTap() {
      if (!_emojiTapper) {
        _emojiTapper = createTapCounter(5, 500, () => this.triggerConfetti());
      }
      _emojiTapper.tap();
    },

    triggerConfetti() {
      this.confettiParticles = generateFloatingParticles(12);
      this.showConfetti = true;
      uni.showToast({ title: getRandomFunFact(), icon: "none", duration: 3000 });
      setTimeout(() => { this.showConfetti = false; }, 3500);
    },

    // ---- 彩蛋: 连击🤝进入小游戏 ----
    onHandshakeTap() {
      if (!_gameTapper) {
        _gameTapper = createTapCounter(3, 3000, () => {
          uni.vibrateShort && uni.vibrateShort({ type: "medium" });
          uni.navigateTo({ url: "/pages/easter-egg/game" });
        });
      }
      _gameTapper.tap();
    },

    // ---- 彩蛋: 连击搜索栏 ----
    onSearchTap() {
      _searchTapCount += 1;
      if (_searchTapCount >= 3) {
        this.searchPlaceholder = getRandomSearchPlaceholder();
        _searchTapCount = 0;
        uni.vibrateShort && uni.vibrateShort({ type: "light" });
        return;
      }
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        _searchTapCount = 0;
        this.goProducts();
      }, 350);
    }
  }
};
</script>

<style lang="scss" scoped>
.home-page {
  position: relative;
  padding: 24rpx;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 4%, rgba(47, 107, 255, 0.14), rgba(47, 107, 255, 0) 45%),
    radial-gradient(circle at 90% 18%, rgba(19, 194, 163, 0.12), rgba(19, 194, 163, 0) 40%),
    radial-gradient(circle at 50% 70%, rgba(124, 58, 237, 0.06), rgba(124, 58, 237, 0) 40%),
    #f2f5fc;
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
  opacity: 0.5;
}
.orb-1 {
  width: 240rpx; height: 240rpx;
  top: -40rpx; left: -50rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.3), transparent 70%);
}
.orb-2 {
  width: 180rpx; height: 180rpx;
  top: 300rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.25), transparent 70%);
}
.orb-3 {
  width: 140rpx; height: 140rpx;
  top: 600rpx; left: 40rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 70%);
}

.hero {
  position: relative;
  padding: 30rpx;
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -60rpx; right: -40rpx;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.1), transparent);
  pointer-events: none;
}

.hero-top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.welcome {
  font-size: 38rpx;
  font-weight: 800;
  color: #1a2540;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.greeting-emoji {
  display: inline-block;
  font-size: 38rpx;
}

.sub {
  margin-top: 10rpx;
  color: #5a6a88;
  font-size: 24rpx;
  letter-spacing: 0.5rpx;
}

.profile-chip {
  position: relative;
  flex-shrink: 0;
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.3);
}
.chip-dot {
  position: absolute;
  top: -2rpx;
  right: -2rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #13c2a3;
  border: 2rpx solid #fff;
  animation: anim-pulse 2s ease-in-out infinite;
}

.search {
  position: relative;
  margin-top: 22rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid rgba(47, 107, 255, 0.12);
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 20rpx;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}
.search:active {
  box-shadow: 0 0 0 4rpx rgba(47, 107, 255, 0.1), 0 4rpx 16rpx rgba(47, 107, 255, 0.12);
}
.search-glow {
  position: absolute;
  left: 14rpx; top: 50%;
  width: 8rpx; height: 8rpx;
  border-radius: 50%;
  background: #2f6bff;
  transform: translateY(-50%);
  animation: anim-ring-pulse 2s ease infinite;
}
.search-icon {
  color: #5a7ec2;
  font-size: 28rpx;
  margin-left: 18rpx;
}
.search-text {
  flex: 1;
  color: #8a9ab8;
  font-size: 24rpx;
}
.search-arrow {
  color: #7a8eb5;
  font-size: 24rpx;
}

.stats-row {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}
.stat-pill {
  flex: 1;
  min-height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  transition: transform 0.2s ease;
}
.stat-pill:active { transform: scale(0.96); }
.stat-value {
  color: #2356c0;
  font-size: 26rpx;
  font-weight: 700;
}
.stat-label {
  margin-top: 2rpx;
  color: #7a8ba8;
  font-size: 20rpx;
}

.section-head {
  margin: 30rpx 4rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  font-size: 30rpx;
  color: #1a2540;
  font-weight: 800;
  letter-spacing: 0.5rpx;
}
.section-badge {
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(47, 107, 255, 0.08);
  color: #4a78d4;
  font-size: 20rpx;
  font-weight: 600;
}
.section-link-wrap {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.section-link {
  color: #5a72a0;
  font-size: 23rpx;
}
.section-link-arrow {
  color: #5a72a0;
  font-size: 22rpx;
  transition: transform 0.3s ease;
}
.section-link-wrap:active .section-link-arrow {
  transform: translateX(6rpx);
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.entry {
  position: relative;
  padding: 22rpx;
  min-height: 156rpx;
  overflow: hidden;
  border-radius: 22rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 6rpx 20rpx rgba(31, 38, 66, 0.06);
}
.entry-orb {
  position: absolute;
  width: 100rpx; height: 100rpx;
  border-radius: 50%;
  right: -20rpx; bottom: -20rpx;
  opacity: 0.4;
  pointer-events: none;
}
.tone-ocean-orb { background: radial-gradient(circle, rgba(47, 107, 255, 0.35), transparent); }
.tone-blue-orb  { background: radial-gradient(circle, rgba(70, 100, 220, 0.3), transparent); }
.tone-amber-orb { background: radial-gradient(circle, rgba(250, 170, 50, 0.35), transparent); }
.tone-green-orb { background: radial-gradient(circle, rgba(36, 185, 135, 0.35), transparent); }
.tone-indigo-orb { background: radial-gradient(circle, rgba(100, 80, 220, 0.3), transparent); }
.tone-violet-orb { background: radial-gradient(circle, rgba(140, 80, 230, 0.3), transparent); }
.tone-orange-orb { background: radial-gradient(circle, rgba(240, 140, 40, 0.35), transparent); }
.tone-red-orb   { background: radial-gradient(circle, rgba(226, 82, 105, 0.3), transparent); }

.entry-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4rpx 12rpx rgba(31, 38, 66, 0.06);
}

.entry-title {
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2540;
}

.entry-desc {
  margin-top: 6rpx;
  color: #6a7e9a;
  font-size: 21rpx;
}

.entry-arrow {
  position: absolute;
  right: 18rpx;
  bottom: 16rpx;
  color: #8a9cc0;
  font-size: 32rpx;
  font-weight: 300;
  transition: transform 0.2s ease;
}
.entry:active .entry-arrow {
  transform: translateX(6rpx);
}

.tone-ocean  { background: linear-gradient(145deg, rgba(224, 239, 255, 0.92), rgba(240, 248, 255, 0.96)); }
.tone-blue   { background: linear-gradient(145deg, rgba(231, 236, 255, 0.92), rgba(244, 246, 255, 0.96)); }
.tone-amber  { background: linear-gradient(145deg, rgba(255, 242, 224, 0.92), rgba(255, 250, 240, 0.96)); }
.tone-green  { background: linear-gradient(145deg, rgba(224, 248, 240, 0.92), rgba(240, 252, 248, 0.96)); }
.tone-indigo { background: linear-gradient(145deg, rgba(232, 236, 255, 0.92), rgba(244, 246, 255, 0.96)); }
.tone-violet { background: linear-gradient(145deg, rgba(242, 236, 255, 0.92), rgba(250, 248, 255, 0.96)); }
.tone-orange { background: linear-gradient(145deg, rgba(255, 242, 228, 0.92), rgba(255, 250, 242, 0.96)); }
.tone-red    { background: linear-gradient(145deg, rgba(255, 236, 238, 0.92), rgba(255, 248, 248, 0.96)); }

.loading { margin: 20rpx 0; }

.skeleton-card {
  height: 260rpx;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
}

.login-tip {
  margin-top: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tip-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}
.tip-emoji {
  font-size: 36rpx;
  display: inline-block;
}
.tip-title {
  color: #384258;
  font-size: 25rpx;
  font-weight: 600;
}

.tip-btn {
  margin: 0;
  width: 160rpx;
  height: 66rpx;
  line-height: 66rpx;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  border-radius: 33rpx;
  border: none;
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.25);
}
.tip-btn::after { border: none; }

/* ---- 彩蛋: 五彩纸屑 ---- */
.confetti-layer {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 99;
}
.confetti-piece {
  position: absolute;
  top: -40rpx;
  animation: confetti-fall linear forwards;
  opacity: 0;
}
@keyframes confetti-fall {
  0%   { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
  60%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(600rpx) rotate(360deg) scale(0.5); }
}

/* ========== Splash Screen 开屏加载界面 ========== */
.splash-screen {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f2f5fc;
  overflow: hidden;
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.splash-fade-out {
  opacity: 0;
  transform: scale(1.06) translateY(-40rpx);
  pointer-events: none;
}

.splash-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  pointer-events: none;
}
.splash-orb {
  position: absolute;
  border-radius: 50%;
}
.splash-orb-1 {
  width: 500rpx; height: 500rpx;
  top: -120rpx; left: -100rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.18), transparent 70%);
  filter: blur(60rpx);
  animation: splash-drift 3s ease-in-out infinite alternate;
}
.splash-orb-2 {
  width: 400rpx; height: 400rpx;
  bottom: -80rpx; right: -60rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.16), transparent 70%);
  filter: blur(50rpx);
  animation: splash-drift 3.5s ease-in-out infinite alternate-reverse;
}
.splash-orb-3 {
  width: 300rpx; height: 300rpx;
  top: 40%; left: 50%;
  margin-left: -150rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.1), transparent 70%);
  filter: blur(40rpx);
  animation: splash-drift 4s ease-in-out infinite alternate;
}

@keyframes splash-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(20rpx, -20rpx); }
}

.splash-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48rpx;
}

.splash-logo-group {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.splash-ring {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid transparent;
}
.splash-ring-outer {
  top: -12rpx; left: -12rpx; right: -12rpx; bottom: -12rpx;
  border-color: rgba(47, 107, 255, 0.12);
  animation: splash-spin 8s linear infinite;
}
.splash-ring-inner {
  top: -4rpx; left: -4rpx; right: -4rpx; bottom: -4rpx;
  border: 2rpx dashed rgba(19, 194, 163, 0.15);
  animation: splash-spin 12s linear infinite reverse;
}
@keyframes splash-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.splash-icons {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}
.splash-icon {
  position: absolute;
  width: 56rpx; height: 56rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  box-shadow: 0 6rpx 16rpx rgba(31, 38, 66, 0.08);
}
.splash-icon-1 {
  top: -16rpx; left: 50%; margin-left: -28rpx;
  animation: splash-orbit-icon 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}
.splash-icon-2 {
  bottom: 0; left: -20rpx;
  animation: splash-orbit-icon 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
}
.splash-icon-3 {
  bottom: 0; right: -20rpx;
  animation: splash-orbit-icon 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both;
}
@keyframes splash-orbit-icon {
  from { opacity: 0; transform: scale(0.3) translateY(30rpx); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.splash-logo {
  position: relative;
  width: 140rpx; height: 140rpx;
  border-radius: 40rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 255, 0.9));
  border: 2rpx solid rgba(228, 235, 251, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72rpx;
  box-shadow:
    0 12rpx 36rpx rgba(47, 107, 255, 0.12),
    0 4rpx 12rpx rgba(31, 38, 66, 0.06);
  animation: splash-logo-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}
@keyframes splash-logo-in {
  0%   { opacity: 0; transform: scale(0.2) rotate(-10deg); }
  60%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
  100% { transform: scale(1) rotate(0); }
}

.splash-text-group {
  text-align: center;
  animation: splash-text-in 0.6s ease 0.5s both;
}
@keyframes splash-text-in {
  from { opacity: 0; transform: translateY(30rpx); }
  to   { opacity: 1; transform: translateY(0); }
}
.splash-title {
  font-size: 48rpx;
  font-weight: 800;
  color: #1a2540;
  letter-spacing: 3rpx;
}
.splash-sub {
  margin-top: 14rpx;
  font-size: 26rpx;
  color: #6a7e9a;
  letter-spacing: 1rpx;
}

.splash-loader {
  width: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  animation: splash-text-in 0.5s ease 0.8s both;
}
.splash-loader-track {
  width: 100%;
  height: 6rpx;
  border-radius: 3rpx;
  background: rgba(47, 107, 255, 0.08);
  overflow: hidden;
}
.splash-loader-fill {
  width: 0%;
  height: 100%;
  border-radius: 3rpx;
  background: linear-gradient(90deg, #2f6bff, #13c2a3);
  animation: splash-progress 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.9s forwards;
}
@keyframes splash-progress {
  0%   { width: 0%; }
  30%  { width: 45%; }
  60%  { width: 72%; }
  85%  { width: 90%; }
  100% { width: 100%; }
}
.splash-loader-text {
  color: #8a95ac;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.splash-footer {
  position: absolute;
  bottom: calc(60rpx + env(safe-area-inset-bottom));
  left: 0; right: 0;
  text-align: center;
  z-index: 2;
  animation: splash-text-in 0.5s ease 1s both;
}
.splash-footer-text {
  color: #b0b8cc;
  font-size: 22rpx;
  letter-spacing: 2rpx;
}
</style>
