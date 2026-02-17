<template>
  <view class="profile-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <!-- Hero 头像区 -->
    <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;" v-if="isLogin">
      <view class="hero-bg"></view>
      <view class="hero-content">
        <view :class="['avatar-wrap', 'anim-bounce-in', avatarSpinning ? 'avatar-spin-egg' : '']" @longpress="onAvatarLongPress">
          <view class="avatar-ring-glow"></view>
          <image class="avatar" :src="profile.avatar" mode="aspectFill" />
        </view>
        <view class="hero-info">
          <view class="name">{{ profile.nickName }}</view>
          <view class="meta-row">
            <view class="rating-chip anim-scale-in anim-d2" :style="{ borderColor: trustLevel.color + '33' }" @tap.stop="onRatingTap">
              <text class="rating-icon">{{ trustLevel.icon || '⭐' }}</text>
              <text :style="{ color: trustLevel.color }">{{ trustLevel.level }} {{ trustScore }}分</text>
            </view>
            <view class="id-chip anim-scale-in anim-d3">学号待绑定</view>
          </view>
        </view>
      </view>
      <view class="stats-row anim-slide-up anim-d3">
        <view class="stat-item press-able" @tap="goMyProducts">
          <text class="stat-value num-animate">{{ profile.productCount || 0 }}</text>
          <text class="stat-label">商品</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item press-able" @tap="goMyTasks">
          <text class="stat-value num-animate">{{ profile.taskCount || 0 }}</text>
          <text class="stat-label">任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item press-able" @tap="goFavorites">
          <text class="stat-value num-animate">{{ profile.favoriteCount || 0 }}</text>
          <text class="stat-label">收藏</text>
        </view>
      </view>
    </view>

    <!-- 未登录状态 -->
    <view class="hero glass-strong guest-hero anim-bounce-in" style="border-radius: 28rpx;" v-else>
      <view class="hero-bg"></view>
      <view class="guest-content">
        <view class="guest-avatar anim-float">🙂</view>
        <view class="guest-info">
          <view class="guest-title">还未登录</view>
          <view class="guest-desc">登录后可查看我的商品、订单与消息</view>
        </view>
      </view>
      <button class="login-btn btn-bounce" @tap="goLogin">去登录</button>
    </view>

    <!-- 功能菜单 -->
    <view class="section-head anim-fade-in anim-d3">
      <text class="section-title">我的服务</text>
      <text class="section-badge">{{ menuItems.length }}项</text>
    </view>

    <view class="menu glass-strong anim-slide-up anim-d4" style="border-radius: 24rpx;">
      <view class="menu-item card-press" v-for="item in menuItems" :key="item.key" @tap="handleMenuTap(item)">
        <view class="menu-left">
          <view :class="['menu-icon', item.tone]">{{ item.icon }}</view>
          <view class="menu-text">
            <text class="menu-label">{{ item.label }}</text>
            <text class="menu-desc">{{ item.desc }}</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 其他设置 -->
    <view class="section-head anim-fade-in anim-d5">
      <text class="section-title">其他</text>
    </view>

    <view class="menu glass-strong anim-slide-up anim-d6" style="border-radius: 24rpx;">
      <view class="menu-item card-press" @tap="goPage('/pages/profile/settings')">
        <view class="menu-left">
          <view class="menu-icon tone-gray">⚙</view>
          <view class="menu-text">
            <text class="menu-label">设置</text>
            <text class="menu-desc">账号安全、通知偏好</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <button v-if="isLogin" class="logout-btn btn-bounce anim-fade-in anim-d7" @tap="logout">退出登录</button>

    <!-- 隐藏彩蛋: 底部小圆点 -->
    <view class="hidden-egg-zone" @tap="onHiddenEggTap">
      <view class="hidden-egg-dot"></view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { getTrustScore, getTrustLevel } from "@/utils/trust-service";
import { queryProductsByUser } from "@/utils/product-service";
import { listMyTasks } from "@/utils/task-service";
import { listFavorites } from "@/utils/favorite-service";
import { createTapCounter, getRandomAvatarSecret, getRandomFunFact } from "@/utils/easter-eggs";

let _ratingTapper = null;

export default {
  data() {
    return {
      trustScore: 0,
      trustLevel: { level: "", color: "#8a93a7", icon: "" },
      productCount: 0,
      taskCount: 0,
      favoriteCount: 0,
      avatarSpinning: false,
      menuItems: [
        { key: "products", icon: "🛒", label: "我的商品", desc: "管理在售与已下架商品", tone: "tone-blue" },
        { key: "orders", icon: "📦", label: "我的订单", desc: "交易进度与评价", tone: "tone-ocean" },
        { key: "myWant", icon: "🔍", label: "我的求购", desc: "管理发布的求购信息", tone: "tone-orange" },
        { key: "publishTask", icon: "📌", label: "发布任务", desc: "发布代取、代课等校园任务", tone: "tone-amber" },
        { key: "myTasks", icon: "📋", label: "我的任务", desc: "查看发布与接单记录", tone: "tone-green" },
        { key: "points", icon: "⭐", label: "积分中心", desc: "签到赚积分查明细", tone: "tone-amber" },
        { key: "feeds", icon: "📢", label: "校园动态", desc: "分享校园生活趣事", tone: "tone-violet" },
        { key: "wiki", icon: "📖", label: "校园维基", desc: "经验攻略知识库", tone: "tone-green" },
        { key: "favorites", icon: "❤", label: "我的收藏", desc: "收藏的商品与任务", tone: "tone-pink" }
      ]
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    profile() {
      const base = this.userStore.profile || {
        nickName: "校园用户",
        avatar: "https://picsum.photos/seed/profile-default/120/120",
        rating: 5
      };
      return {
        ...base,
        productCount: this.productCount,
        taskCount: this.taskCount,
        favoriteCount: this.favoriteCount
      };
    }
  },

  onShow() {
    this.loadTrustScore();
    this.loadCounts();
  },

  methods: {
    async loadTrustScore() {
      if (!this.isLogin) { return; }
      try {
        const record = await getTrustScore();
        this.trustScore = record.score;
        this.trustLevel = getTrustLevel(record.score);
      } catch (e) {
        // fallback
      }
    },

    async loadCounts() {
      if (!this.isLogin) { return; }
      const userId = this.userStore.profile?.userId || "";
      if (!userId) { return; }

      const [productsRes, tasksRes, favoritesRes] = await Promise.all([
        queryProductsByUser(userId, { page: 1, pageSize: 1 }).catch(() => null),
        listMyTasks(userId).catch(() => null),
        listFavorites().catch(() => null)
      ]);

      if (productsRes) {
        this.productCount = productsRes.total || 0;
      }
      if (tasksRes) {
        this.taskCount = (tasksRes.published?.length || 0) + (tasksRes.accepted?.length || 0);
      }
      if (favoritesRes) {
        this.favoriteCount = favoritesRes.length || 0;
      }
    },

    handleMenuTap(item) {
      const actions = {
        products: () => this.goMyProducts(),
        orders: () => this.goPage("/pages/profile/my-orders"),
        myWant: () => this.goPage("/pages/profile/my-want"),
        publishTask: () => this.goPublishTask(),
        myTasks: () => this.goMyTasks(),
        points: () => this.goPage("/pages/points/index"),
        feeds: () => this.goPage("/pages/feeds/list"),
        wiki: () => this.goPage("/pages/wiki/index"),
        favorites: () => this.goFavorites()
      };
      (actions[item.key] || (() => {}))();
    },

    /** 登录守卫：未登录时跳转登录页，已登录则执行回调 */
    requireLogin(callback) {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      callback();
    },

    goPage(url) {
      this.requireLogin(() => uni.navigateTo({ url }));
    },

    goLogin() {
      uni.navigateTo({ url: "/pages/login/login" });
    },

    goMyProducts() {
      this.requireLogin(() => uni.navigateTo({ url: "/pages/profile/my-products" }));
    },

    goPublishTask() {
      this.requireLogin(() => uni.navigateTo({ url: "/pages/tasks/publish" }));
    },

    goMyTasks() {
      this.requireLogin(() => uni.navigateTo({ url: "/pages/tasks/my" }));
    },

    goFavorites() {
      this.requireLogin(() => uni.navigateTo({ url: "/pages/profile/favorites" }));
    },

    logout() {
      this.userStore.logout();
      uni.showToast({
        title: "已退出登录",
        icon: "none"
      });
    },

    comingSoon(name) {
      uni.showToast({
        title: `${name}将在后续阶段完成`,
        icon: "none"
      });
    },

    // ---- 彩蛋: 隐藏链接 ----
    onHiddenEggTap() {
      uni.setClipboardData({
        data: "https://www.bilibili.com/video/BV1UT42167xb/?spm_id_from=333.337.search-card.all.click&vd_source=84624019b0e0f24bc4d2b987ff70dd39",
        success() {
          uni.showToast({ title: "🎁 神秘链接已复制\n去浏览器打开看看吧~", icon: "none", duration: 3000 });
        }
      });
    },

    // ---- 彩蛋: 长按头像 ----
    onAvatarLongPress() {
      if (this.avatarSpinning) return;
      this.avatarSpinning = true;
      uni.vibrateShort && uni.vibrateShort({ type: "medium" });
      uni.showToast({ title: getRandomAvatarSecret(), icon: "none", duration: 2500 });
      setTimeout(() => { this.avatarSpinning = false; }, 1200);
    },

    // ---- 彩蛋: 连击信用分 ----
    onRatingTap() {
      if (!_ratingTapper) {
        _ratingTapper = createTapCounter(5, 500, () => {
          uni.vibrateShort && uni.vibrateShort({ type: "light" });
          uni.showToast({ title: getRandomFunFact(), icon: "none", duration: 3000 });
        });
      }
      _ratingTapper.tap();
    }
  }
};
</script>

<style lang="scss" scoped>
.profile-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 10% 6%, rgba(47, 107, 255, 0.14), rgba(47, 107, 255, 0) 45%),
    radial-gradient(circle at 90% 18%, rgba(19, 194, 163, 0.1), rgba(19, 194, 163, 0) 40%),
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
  opacity: 0.45;
}
.orb-1 {
  width: 200rpx; height: 200rpx;
  top: -30rpx; right: -40rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.28), transparent 70%);
}
.orb-2 {
  width: 150rpx; height: 150rpx;
  top: 350rpx; left: -30rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.22), transparent 70%);
}

/* --- Hero 头像区 --- */
.hero {
  position: relative;
  overflow: hidden;
  padding: 30rpx;
}

.hero-bg {
  position: absolute;
  top: -60rpx; right: -40rpx;
  width: 260rpx; height: 260rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.12), transparent);
  pointer-events: none;
}
.hero::after {
  content: "";
  position: absolute;
  bottom: -30rpx; left: -20rpx;
  width: 160rpx; height: 160rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.08), transparent);
  pointer-events: none;
}

.hero-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar-wrap {
  position: relative;
  width: 120rpx; height: 120rpx;
  flex-shrink: 0;
}
.avatar-ring-glow {
  position: absolute;
  top: -6rpx; right: -6rpx; bottom: -6rpx; left: -6rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f6bff, #13c2a3, #7c3aed);
  opacity: 0.5;
  filter: blur(8rpx);
  animation: anim-gradient-shift 4s ease infinite;
  background-size: 200% 200%;
}
.avatar {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 6rpx 20rpx rgba(47, 107, 255, 0.18);
}

.hero-info {
  flex: 1;
}

.name {
  color: #1a2540;
  font-size: 36rpx;
  font-weight: 800;
}

.meta-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.rating-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 42rpx;
  line-height: 42rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid #e3eaf9;
  color: #4b62a8;
  font-size: 21rpx;
}

.rating-icon {
  font-size: 22rpx;
}

.id-chip {
  height: 42rpx;
  line-height: 42rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid #e3eaf9;
  color: #7a8ba8;
  font-size: 21rpx;
}

.stats-row {
  position: relative;
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  padding: 18rpx 0 6rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s ease;
}
.stat-item:active { transform: scale(0.95); }

.stat-value {
  color: #2356c0;
  font-size: 34rpx;
  font-weight: 800;
}

.stat-label {
  margin-top: 4rpx;
  color: #7a8ba8;
  font-size: 22rpx;
}

.stat-divider {
  width: 1rpx;
  height: 44rpx;
  background: linear-gradient(180deg, transparent, #d8e2f8, transparent);
}

/* --- 未登录 --- */
.guest-hero { padding: 36rpx 28rpx; }

.guest-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.guest-avatar {
  width: 100rpx; height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid #e3eaf9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}

.guest-info { flex: 1; }
.guest-title {
  color: #1a2540;
  font-size: 34rpx;
  font-weight: 800;
}
.guest-desc {
  margin-top: 8rpx;
  color: #6a7e9a;
  font-size: 24rpx;
}

.login-btn {
  position: relative;
  margin: 20rpx 0 0;
  width: 200rpx;
  height: 70rpx;
  line-height: 70rpx;
  border-radius: 35rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.3);
}
.login-btn::after { border: none; }

/* --- 段落标题 --- */
.section-head {
  margin: 26rpx 4rpx 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #1a2540;
  font-size: 29rpx;
  font-weight: 800;
  letter-spacing: 0.5rpx;
}

.section-badge {
  height: 34rpx;
  line-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: rgba(47, 107, 255, 0.08);
  color: #4a78d4;
  font-size: 20rpx;
  font-weight: 600;
}

/* --- 菜单 --- */
.menu { padding: 4rpx 0; }

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid rgba(238, 242, 251, 0.6);
}
.menu-item:last-child { border-bottom: none; }

.menu-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  width: 64rpx; height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
  box-shadow: 0 4rpx 10rpx rgba(31, 38, 66, 0.04);
}

.menu-icon.tone-blue   { background: linear-gradient(145deg, rgba(224, 236, 255, 0.95), rgba(240, 246, 255, 0.96)); }
.menu-icon.tone-amber  { background: linear-gradient(145deg, rgba(255, 242, 224, 0.95), rgba(255, 250, 240, 0.96)); }
.menu-icon.tone-green  { background: linear-gradient(145deg, rgba(224, 248, 240, 0.95), rgba(240, 252, 248, 0.96)); }
.menu-icon.tone-ocean  { background: linear-gradient(145deg, rgba(224, 239, 255, 0.95), rgba(240, 248, 255, 0.96)); }
.menu-icon.tone-pink   { background: linear-gradient(145deg, rgba(255, 230, 238, 0.95), rgba(255, 244, 246, 0.96)); }
.menu-icon.tone-orange { background: linear-gradient(145deg, rgba(255, 242, 228, 0.95), rgba(255, 250, 242, 0.96)); }
.menu-icon.tone-violet { background: linear-gradient(145deg, rgba(242, 236, 255, 0.95), rgba(250, 248, 255, 0.96)); }
.menu-icon.tone-gray   { background: linear-gradient(145deg, rgba(237, 241, 251, 0.95), rgba(246, 248, 253, 0.96)); }

.menu-text {
  display: flex;
  flex-direction: column;
}

.menu-label {
  color: #1a2540;
  font-size: 28rpx;
  font-weight: 700;
}

.menu-desc {
  margin-top: 4rpx;
  color: #8a95ac;
  font-size: 22rpx;
}

.menu-arrow {
  color: #b0b8cc;
  font-size: 36rpx;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.menu-item:active .menu-arrow {
  transform: translateX(6rpx);
  color: #8a9cc0;
}

/* --- 退出登录 --- */
.logout-btn {
  margin-top: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  border: none;
  background: linear-gradient(135deg, rgba(252, 239, 241, 0.9), rgba(255, 232, 236, 0.85));
  color: $danger-color;
  font-size: 28rpx;
  font-weight: 600;
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border: 1rpx solid rgba(226, 82, 105, 0.08);
  box-shadow: 0 4rpx 14rpx rgba(226, 82, 105, 0.06);
}
.logout-btn::after { border: none; }

/* ---- 隐藏彩蛋按钮 ---- */
.hidden-egg-zone {
  display: flex;
  justify-content: flex-end;
  padding: 30rpx 20rpx 60rpx;
}
.hidden-egg-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(200, 208, 224, 0.25);
}

/* ---- 彩蛋: 头像旋转 ---- */
.avatar-spin-egg {
  animation: egg-avatar-spin 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}
.avatar-spin-egg .avatar-ring-glow {
  opacity: 0.9 !important;
  filter: blur(14rpx) !important;
}
@keyframes egg-avatar-spin {
  0%   { transform: rotate(0deg) scale(1); }
  40%  { transform: rotate(380deg) scale(1.12); }
  70%  { transform: rotate(355deg) scale(1.05); }
  100% { transform: rotate(360deg) scale(1); }
}
</style>
