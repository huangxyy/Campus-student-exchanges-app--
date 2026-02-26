<template>
  <view class="settings-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-top">
        <view>
          <view class="banner-title">⚙️ 设置</view>
          <view class="banner-desc">管理你的账户与偏好</view>
        </view>
        <view v-if="profile.avatar" class="banner-avatar">
          <image :src="profile.avatar" class="banner-avatar-img" mode="aspectFill" />
        </view>
      </view>
    </view>

    <view class="section glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
      <view class="section-title">账户</view>
      <view class="setting-item" @tap="editNickname">
        <text class="setting-label">昵称</text>
        <text class="setting-value">{{ profile.nickName || '未设置' }}</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="editAvatar">
        <text class="setting-label">头像</text>
        <image v-if="profile.avatar" :src="profile.avatar" class="avatar-mini" mode="aspectFill" />
        <text v-else class="setting-value">未设置</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="editStudentId">
        <text class="setting-label">学号</text>
        <text class="setting-value">{{ profile.studentId || '未绑定' }}</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="editPhone">
        <text class="setting-label">联系方式</text>
        <text class="setting-value">{{ profile.phone || '未填写' }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="section glass-strong anim-slide-up anim-d2" style="border-radius: 24rpx;">
      <view class="section-title">快捷入口</view>
      <view class="setting-item" @tap="goTo('/pages/profile/my-products')">
        <text class="setting-label">我的商品</text><text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/profile/my-orders')">
        <text class="setting-label">我的订单</text><text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/profile/my-want')">
        <text class="setting-label">我的求购</text><text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/tasks/my')">
        <text class="setting-label">我的任务</text><text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/points/index')">
        <text class="setting-label">积分中心</text><text class="arrow">›</text>
      </view>
    </view>

    <view class="section glass-strong anim-slide-up anim-d3" style="border-radius: 24rpx;">
      <view class="section-title">通知与隐私</view>
      <view class="setting-item">
        <text class="setting-label">到货提醒</text>
        <switch :checked="notifyEnabled" color="#2f6bff" @change="notifyEnabled = $event.detail.value" />
      </view>
      <view class="setting-item">
        <text class="setting-label">显示在线状态</text>
        <switch :checked="showOnline" color="#2f6bff" @change="showOnline = $event.detail.value" />
      </view>
    </view>

    <view class="section glass-strong anim-slide-up anim-d4" style="border-radius: 24rpx;">
      <view class="section-title">关于</view>
      <view class="setting-item">
        <text class="setting-label">版本号</text>
        <text class="setting-value">1.0.0</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/legal/privacy')">
        <text class="setting-label">隐私政策</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="goTo('/pages/legal/agreement')">
        <text class="setting-label">用户协议</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="clearCache">
        <text class="setting-label">清除缓存</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @tap="openAuditPage">
        <text class="setting-label">风控审计台（调试）</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <button class="logout-btn btn-bounce anim-slide-up anim-d5" @tap="handleLogout">
      <text class="logout-icon">⏻</text>
      退出登录
    </button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";

export default {
  data() {
    return {
      notifyEnabled: true,
      showOnline: true
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    profile() { return this.userStore.profile || {}; }
  },

  onShow() {
    this.loadSwitchStates();
  },

  watch: {
    notifyEnabled(val) { this.saveSwitchState("cm_notify_enabled", val); },
    showOnline(val) { this.saveSwitchState("cm_show_online", val); }
  },

  methods: {
    goTo(url) {
      if (!this.userStore.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url });
    },

    editNickname() {
      uni.showModal({
        title: "修改昵称",
        editable: true,
        placeholderText: this.profile.nickName || "输入新昵称",
        success: (res) => {
          if (res.confirm && res.content) {
            this.userStore.updateProfile({ nickName: res.content.trim() });
            uni.showToast({ title: "昵称已更新", icon: "success" });
          }
        }
      });
    },

    editAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        success: (res) => {
          const path = res.tempFilePaths && res.tempFilePaths[0];
          if (path) {
            this.userStore.updateProfile({ avatar: path });
            uni.showToast({ title: "头像已更新", icon: "success" });
          }
        }
      });
    },

    editStudentId() {
      uni.showModal({
        title: "绑定学号",
        editable: true,
        placeholderText: this.profile.studentId || "输入你的学号",
        success: (res) => {
          if (res.confirm && res.content) {
            const studentId = res.content.trim();
            if (!/^[A-Za-z0-9]{4,20}$/.test(studentId)) {
              uni.showToast({ title: "学号格式不正确（4-20位字母数字）", icon: "none" });
              return;
            }
            this.userStore.updateProfile({ studentId });
            uni.showToast({ title: "学号已绑定", icon: "success" });
          }
        }
      });
    },

    editPhone() {
      uni.showModal({
        title: "填写联系方式",
        editable: true,
        placeholderText: this.profile.phone || "手机号或微信号",
        success: (res) => {
          if (res.confirm && res.content) {
            const phone = res.content.trim();
            if (phone.length < 3 || phone.length > 30) {
              uni.showToast({ title: "联系方式长度不正确", icon: "none" });
              return;
            }
            this.userStore.updateProfile({ phone });
            uni.showToast({ title: "联系方式已更新", icon: "success" });
          }
        }
      });
    },

    loadSwitchStates() {
      try {
        const n = uni.getStorageSync("cm_notify_enabled");
        const o = uni.getStorageSync("cm_show_online");
        if (n !== "") { this.notifyEnabled = n !== false; }
        if (o !== "") { this.showOnline = o !== false; }
      } catch { /* use defaults */ }
    },

    saveSwitchState(key, val) {
      try { uni.setStorageSync(key, val); }
      catch { /* noop */ }
    },

    clearCache() {
      uni.showModal({
        title: "清除缓存",
        content: "清除商品、任务、聊天等缓存数据，登录信息将保留。是否继续？",
        success: (res) => {
          if (!res.confirm) { return; }
          try {
            const preserveKeys = ["cm_user", "cm_token", "cm_notify_enabled", "cm_show_online"];
            const preserved = {};
            preserveKeys.forEach((k) => {
              try { const v = uni.getStorageSync(k); if (v !== "") { preserved[k] = v; } }
              catch { /* skip */ }
            });
            uni.clearStorageSync();
            Object.entries(preserved).forEach(([k, v]) => {
              try { uni.setStorageSync(k, v); }
              catch { /* skip */ }
            });
          } catch {
            /* fallback: do nothing to avoid losing auth */
          }
          uni.showToast({ title: "缓存已清除", icon: "success" });
        }
      });
    },

    openAuditPage() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: "请先登录", icon: "none" });
        return;
      }
      uni.navigateTo({ url: "/pages/admin/audit" });
    },

    handleLogout() {
      uni.showModal({
        title: "退出登录",
        content: "退出后需重新登录",
        success: (res) => {
          if (!res.confirm) { return; }
          this.userStore.logout();
          uni.reLaunch({ url: "/pages/index/index" });
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.settings-page {
  position: relative;
  padding: 24rpx; padding-bottom: 160rpx;
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
  opacity: 0.4;
}
.orb-1 {
  width: 180rpx; height: 180rpx;
  top: -30rpx; right: -40rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.25), transparent 70%);
}

.banner {
  position: relative;
  padding: 24rpx;
  margin-bottom: 4rpx;
  overflow: hidden;
}
.banner-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 800; }
.banner-desc { margin-top: 6rpx; color: #5a6a88; font-size: 24rpx; }
.banner-avatar {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid rgba(47, 107, 255, 0.15);
  box-shadow: 0 4rpx 12rpx rgba(47, 107, 255, 0.12);
  flex-shrink: 0;
}
.banner-avatar-img { width: 100%; height: 100%; }

.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 25rpx; font-weight: 600; margin-bottom: 10rpx; }
.setting-item {
  display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0;
  border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: background 0.15s ease;
}
.setting-item:active { background: rgba(47, 107, 255, 0.03); }
.setting-item:last-child { border-bottom: none; }
.setting-label { color: #2b3345; font-size: 26rpx; flex: 1; }
.setting-value { color: #8a93a7; font-size: 24rpx; }
.arrow { color: #c0c8d8; font-size: 32rpx; margin-left: 10rpx; transition: transform 0.2s ease; }
.setting-item:active .arrow { transform: translateX(4rpx); }
.avatar-mini { width: 52rpx; height: 52rpx; border-radius: 50%; border: 2rpx solid rgba(47, 107, 255, 0.1); }

.logout-btn {
  margin-top: 30rpx; width: 100%; height: 88rpx;
  border-radius: 44rpx; border: none;
  background: linear-gradient(135deg, #ffeef1, #ffe8ec);
  color: #e74a62;
  font-size: 28rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(231, 74, 98, 0.1);
}
.logout-btn::after { border: none; }
.logout-icon { font-size: 26rpx; }
</style>
