<template>
  <view class="profile-page">
    <!-- Hero 头像区 -->
    <view class="hero card anim-slide-down" v-if="isLogin">
      <view class="hero-bg"></view>
      <view class="hero-content">
        <image class="avatar anim-scale-in anim-d1" :src="profile.avatar" mode="aspectFill" />
        <view class="hero-info">
          <view class="name">{{ profile.nickName }}</view>
          <view class="meta-row">
            <view class="rating-chip" :style="{ borderColor: trustLevel.color + '33' }">
              <text class="rating-icon">{{ trustLevel.icon || '⭐' }}</text>
              <text :style="{ color: trustLevel.color }">{{ trustLevel.level }} {{ trustScore }}分</text>
            </view>
            <view class="id-chip">学号待绑定</view>
          </view>
        </view>
      </view>
      <view class="stats-row anim-slide-up anim-d2">
        <view class="stat-item press-able" @tap="goMyProducts">
          <text class="stat-value">{{ profile.productCount || 0 }}</text>
          <text class="stat-label">商品</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item press-able" @tap="goMyTasks">
          <text class="stat-value">{{ profile.taskCount || 0 }}</text>
          <text class="stat-label">任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item press-able" @tap="goFavorites">
          <text class="stat-value">{{ profile.favoriteCount || 0 }}</text>
          <text class="stat-label">收藏</text>
        </view>
      </view>
    </view>

    <!-- 未登录状态 -->
    <view class="hero card guest-hero anim-scale-in" v-else>
      <view class="hero-bg"></view>
      <view class="guest-content">
        <view class="guest-avatar">🙂</view>
        <view class="guest-info">
          <view class="guest-title">还未登录</view>
          <view class="guest-desc">登录后可查看我的商品、订单与消息</view>
        </view>
      </view>
      <button class="login-btn btn-bounce" @tap="goLogin">去登录</button>
    </view>

    <!-- 功能菜单 -->
    <view class="section-head anim-fade-in anim-d2">
      <text class="section-title">我的服务</text>
    </view>

    <view class="menu card anim-slide-up anim-d3">
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
    <view class="section-head anim-fade-in anim-d4">
      <text class="section-title">其他</text>
    </view>

    <view class="menu card anim-slide-up anim-d5">
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

    <button v-if="isLogin" class="logout-btn btn-bounce anim-fade-in anim-d6" @tap="logout">退出登录</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { getTrustScore, getTrustLevel } from "@/utils/trust-service";

export default {
  data() {
    return {
      trustScore: 0,
      trustLevel: { level: "", color: "#8a93a7", icon: "" },
      menuItems: [
        { key: "products", icon: "🛒", label: "我的商品", desc: "管理在售与已下架商品", tone: "tone-blue" },
        { key: "orders", icon: "📦", label: "我的订单", desc: "交易进度与评价", tone: "tone-ocean" },
        { key: "myWant", icon: "🔍", label: "我的求购", desc: "管理发布的求购信息", tone: "tone-orange" },
        { key: "publishTask", icon: "📌", label: "发布任务", desc: "发布代取、代课等校园任务", tone: "tone-amber" },
        { key: "myTasks", icon: "📋", label: "我的任务", desc: "查看发布与接单记录", tone: "tone-green" },
        { key: "points", icon: "⭐", label: "积分中心", desc: "签到赚积分查明细", tone: "tone-amber" },
        { key: "feeds", icon: "�", label: "校园动态", desc: "分享校园生活趣事", tone: "tone-violet" },
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
      return (
        this.userStore.profile || {
          nickName: "校园用户",
          avatar: "https://picsum.photos/seed/profile-default/120/120",
          rating: 5,
          productCount: 0,
          taskCount: 0,
          favoriteCount: 0
        }
      );
    }
  },

  onShow() {
    this.loadTrustScore();
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

    goPage(url) {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      uni.navigateTo({ url });
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    },

    goMyProducts() {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }

      uni.navigateTo({
        url: "/pages/profile/my-products"
      });
    },

    goPublishTask() {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      uni.navigateTo({
        url: "/pages/tasks/publish"
      });
    },

    goMyTasks() {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      uni.navigateTo({
        url: "/pages/tasks/my"
      });
    },

    goFavorites() {
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      uni.navigateTo({
        url: "/pages/profile/favorites"
      });
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
    }
  }
};
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
  background:
    radial-gradient(circle at 12% 8%, rgba(47, 107, 255, 0.12), rgba(47, 107, 255, 0)),
    radial-gradient(circle at 88% 20%, rgba(38, 201, 159, 0.1), rgba(38, 201, 159, 0)),
    #f5f7fc;
}

/* --- Hero 头像区 --- */
.hero {
  position: relative;
  overflow: hidden;
  padding: 28rpx;
  background:
    linear-gradient(140deg, rgba(231, 239, 255, 0.96), rgba(243, 247, 255, 0.98)),
    #ffffff;
  border: 1rpx solid #e4ebfb;
}

.hero-bg {
  position: absolute;
  top: -40rpx;
  right: -30rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0));
  pointer-events: none;
}

.hero-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.15);
}

.hero-info {
  flex: 1;
}

.name {
  color: #1f2a3d;
  font-size: 36rpx;
  font-weight: 700;
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
  background: rgba(255, 255, 255, 0.8);
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
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid #e3eaf9;
  color: #7080a0;
  font-size: 21rpx;
}

.stats-row {
  position: relative;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  padding: 16rpx 0 4rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  color: #2e5fce;
  font-size: 32rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 4rpx;
  color: #7080a0;
  font-size: 22rpx;
}

.stat-divider {
  width: 1rpx;
  height: 44rpx;
  background: #dde6f8;
}

/* --- 未登录 --- */
.guest-hero {
  padding: 36rpx 28rpx;
}

.guest-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.guest-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid #e3eaf9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}

.guest-info {
  flex: 1;
}

.guest-title {
  color: #1f2a3d;
  font-size: 34rpx;
  font-weight: 700;
}

.guest-desc {
  margin-top: 8rpx;
  color: #6e7b92;
  font-size: 24rpx;
}

.login-btn {
  position: relative;
  margin: 20rpx 0 0;
  width: 200rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}

/* --- 段落标题 --- */
.section-head {
  margin: 24rpx 4rpx 12rpx;
  display: flex;
  align-items: center;
}

.section-title {
  color: #1f2430;
  font-size: 29rpx;
  font-weight: 700;
}

/* --- 菜单 --- */
.menu {
  padding: 4rpx 0;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid #eef2fb;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.menu-icon.tone-blue {
  background: linear-gradient(140deg, rgba(231, 236, 255, 0.95), rgba(241, 244, 255, 0.96));
}

.menu-icon.tone-amber {
  background: linear-gradient(140deg, rgba(255, 239, 222, 0.94), rgba(255, 247, 235, 0.96));
}

.menu-icon.tone-green {
  background: linear-gradient(140deg, rgba(227, 247, 240, 0.95), rgba(238, 251, 246, 0.96));
}

.menu-icon.tone-ocean {
  background: linear-gradient(140deg, rgba(224, 239, 255, 0.95), rgba(236, 246, 255, 0.95));
}

.menu-icon.tone-pink {
  background: linear-gradient(140deg, rgba(255, 230, 235, 0.95), rgba(255, 241, 243, 0.96));
}

.menu-icon.tone-orange {
  background: linear-gradient(140deg, rgba(255, 240, 225, 0.95), rgba(255, 248, 238, 0.96));
}

.menu-icon.tone-violet {
  background: linear-gradient(140deg, rgba(243, 238, 255, 0.95), rgba(248, 245, 255, 0.96));
}

.menu-icon.tone-gray {
  background: linear-gradient(140deg, rgba(237, 241, 251, 0.95), rgba(244, 246, 252, 0.96));
}

.menu-text {
  display: flex;
  flex-direction: column;
}

.menu-label {
  color: #1f2a3c;
  font-size: 28rpx;
  font-weight: 600;
}

.menu-desc {
  margin-top: 4rpx;
  color: #8a93a8;
  font-size: 22rpx;
}

.menu-arrow {
  color: #b0b8cc;
  font-size: 36rpx;
  flex-shrink: 0;
}

/* --- 退出登录 --- */
.logout-btn {
  margin-top: 30rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  border: none;
  background: #fceff1;
  color: $danger-color;
  font-size: 28rpx;
  font-weight: 600;
}

.logout-btn::after {
  border: none;
}
</style>
