<template>
  <view class="settings-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">设置</view>
    </view>

    <view class="section card anim-slide-up anim-d1">
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
    </view>

    <view class="section card anim-slide-up anim-d2">
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

    <view class="section card anim-slide-up anim-d3">
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

    <view class="section card anim-slide-up anim-d4">
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
    </view>

    <button class="logout-btn anim-slide-up anim-d5" @tap="handleLogout">退出登录</button>
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

  methods: {
    goTo(url) {
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

    clearCache() {
      uni.showModal({
        title: "清除缓存",
        content: "清除后需重新加载数据，是否继续？",
        success: (res) => {
          if (!res.confirm) { return; }
          try {
            uni.clearStorageSync();
          } catch (error) {
            // ignore
          }
          uni.showToast({ title: "缓存已清除", icon: "success" });
        }
      });
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
  padding: 24rpx; padding-bottom: 160rpx;
  background: #f2f5fb;
}
.banner { padding: 22rpx; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 25rpx; font-weight: 600; margin-bottom: 10rpx; }
.setting-item {
  display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f2f8;
}
.setting-item:last-child { border-bottom: none; }
.setting-label { color: #2b3345; font-size: 26rpx; flex: 1; }
.setting-value { color: #8a93a7; font-size: 24rpx; }
.arrow { color: #c0c8d8; font-size: 32rpx; margin-left: 10rpx; }
.avatar-mini { width: 52rpx; height: 52rpx; border-radius: 50%; }
.logout-btn {
  margin-top: 30rpx; width: 100%; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: #ffeef1; color: #e74a62;
  font-size: 28rpx; font-weight: 600;
}
.logout-btn::after { border: none; }
</style>
