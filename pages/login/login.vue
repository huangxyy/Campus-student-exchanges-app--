<template>
  <view class="login-page">
    <view class="page-bubbles">
      <view class="bubble bubble-1 anim-float"></view>
      <view class="bubble bubble-2 anim-float-x"></view>
      <view class="bubble bubble-3 anim-float"></view>
      <view class="bubble bubble-4 anim-float-x"></view>
      <view class="bubble bubble-5 anim-breathe"></view>
    </view>

    <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="brand-icon anim-bounce-in">
        <view class="brand-ring anim-ring"></view>
        <text class="brand-emoji">🎓</text>
      </view>
      <view class="title anim-fade-in anim-d1">校园跳蚤市场</view>
      <view class="subtitle anim-fade-in anim-d2">让闲置流动起来，让任务更高效</view>
    </view>

    <view class="features anim-slide-up anim-d3">
      <view
        v-for="(item, idx) in features"
        :key="item.icon"
        :class="['feature-item', 'glass', 'card-press', 'anim-slide-up', 'anim-d' + (idx + 3)]"
        style="border-radius: 20rpx;"
      >
        <view class="feature-icon" :class="item.tone">{{ item.icon }}</view>
        <view class="feature-text">
          <view class="feature-title">{{ item.title }}</view>
          <view class="feature-desc">{{ item.desc }}</view>
        </view>
        <view class="feature-dot" :class="item.tone + '-dot'"></view>
      </view>
    </view>

    <button class="login-btn btn-bounce anim-scale-in anim-d6" :loading="loading" @tap="handleLogin">
      <text v-if="!loading" class="btn-icon">✦</text>
      {{ loading ? "登录中..." : "微信一键登录" }}
    </button>

    <view class="tips anim-fade-in anim-d7">首次登录后可在「我的」页面补充学号与联系方式</view>

    <view class="policy anim-fade-in anim-d8">
      登录代表你同意
      <text class="policy-link" @tap="goAgreement">《用户协议》</text>
      与
      <text class="policy-link" @tap="goPrivacy">《隐私政策》</text>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { loginWithProfile } from "@/utils/auth";

export default {
  data() {
    return {
      loading: false,
      features: [
        { icon: "🛒", title: "二手好物", desc: "校内面交更安心", tone: "ft-blue" },
        { icon: "📌", title: "任务互助", desc: "代取代课快速抢单", tone: "ft-amber" },
        { icon: "💬", title: "实时沟通", desc: "消息秒达不错过", tone: "ft-green" }
      ]
    };
  },

  onShow() {
    const userStore = useUserStore();
    if (userStore.isLogin) {
      uni.switchTab({
        url: "/pages/index/index"
      });
    }
  },

  methods: {
    goAgreement() {
      uni.navigateTo({ url: "/pages/legal/agreement" });
    },
    goPrivacy() {
      uni.navigateTo({ url: "/pages/legal/privacy" });
    },
    async handleLogin() {
      if (this.loading) {
        return;
      }

      this.loading = true;
      try {
        // wx.getUserProfile 已于2022年11月废弃，直接使用默认信息
        // 后续可改用 <button open-type="chooseAvatar"> + <input type="nickname"> 方案
        const profile = {
          nickName: "校园用户",
          avatarUrl: "https://picsum.photos/seed/default-user/120/120"
        };

        const auth = await loginWithProfile(profile);
        const userStore = useUserStore();
        userStore.setAuth(auth);

        uni.showToast({
          title: auth.from === "cloud" ? "云端登录成功" : "登录成功（本地模式）",
          icon: "success",
          duration: 1500
        });

        setTimeout(() => {
          uni.switchTab({
            url: "/pages/index/index"
          });
        }, 1500);
      } catch (error) {
        uni.showToast({
          title: "登录失败，请重试",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  padding: 80rpx 36rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 12%, rgba(47, 107, 255, 0.18), rgba(47, 107, 255, 0) 50%),
    radial-gradient(circle at 82% 28%, rgba(19, 194, 163, 0.16), rgba(19, 194, 163, 0) 45%),
    radial-gradient(circle at 50% 75%, rgba(124, 58, 237, 0.10), rgba(124, 58, 237, 0) 40%),
    #f0f4fc;
}

.page-bubbles {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.bubble {
  position: absolute;
  border-radius: 50%;
  opacity: 0.35;
}
.bubble-1 {
  width: 180rpx; height: 180rpx;
  top: -30rpx; right: -40rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.3), transparent 70%);
  filter: blur(30rpx);
}
.bubble-2 {
  width: 120rpx; height: 120rpx;
  top: 260rpx; left: -20rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.3), transparent 70%);
  filter: blur(25rpx);
}
.bubble-3 {
  width: 90rpx; height: 90rpx;
  bottom: 300rpx; right: 40rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.25), transparent 70%);
  filter: blur(20rpx);
}
.bubble-4 {
  width: 60rpx; height: 60rpx;
  top: 500rpx; left: 80rpx;
  background: radial-gradient(circle, rgba(250, 170, 50, 0.3), transparent 70%);
  filter: blur(16rpx);
}
.bubble-5 {
  width: 100rpx; height: 100rpx;
  bottom: 150rpx; left: 50%;
  margin-left: -50rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.15), transparent 70%);
  filter: blur(20rpx);
}

.hero {
  position: relative;
  padding: 48rpx 36rpx 40rpx;
  text-align: center;
  overflow: hidden;
}

.brand-icon {
  position: relative;
  width: 110rpx;
  height: 110rpx;
  margin: 0 auto 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-ring {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  border-radius: 32rpx;
  border: 2rpx solid rgba(47, 107, 255, 0.2);
}
.brand-emoji {
  position: relative;
  font-size: 54rpx;
  width: 90rpx; height: 90rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid rgba(228, 235, 251, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(47, 107, 255, 0.15);
}

.title {
  font-size: 46rpx;
  font-weight: 800;
  color: #1a2540;
  letter-spacing: 2rpx;
}

.subtitle {
  margin-top: 14rpx;
  color: #5a6a88;
  font-size: 26rpx;
  line-height: 1.6;
}

.features {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.feature-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  overflow: hidden;
}

.feature-icon {
  width: 62rpx;
  height: 62rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}
.feature-icon.ft-blue  { background: linear-gradient(140deg, rgba(224, 236, 255, 0.95), rgba(240, 246, 255, 0.96)); }
.feature-icon.ft-amber { background: linear-gradient(140deg, rgba(255, 242, 224, 0.95), rgba(255, 250, 240, 0.96)); }
.feature-icon.ft-green { background: linear-gradient(140deg, rgba(224, 248, 240, 0.95), rgba(240, 252, 248, 0.96)); }

.feature-dot {
  position: absolute;
  width: 80rpx; height: 80rpx;
  border-radius: 50%;
  right: -16rpx; bottom: -16rpx;
  opacity: 0.2;
  pointer-events: none;
}
.ft-blue-dot  { background: radial-gradient(circle, rgba(47, 107, 255, 0.5), transparent); }
.ft-amber-dot { background: radial-gradient(circle, rgba(250, 170, 50, 0.5), transparent); }
.ft-green-dot { background: radial-gradient(circle, rgba(19, 194, 163, 0.5), transparent); }

.feature-text {
  flex: 1;
}

.feature-title {
  color: #1a2540;
  font-size: 27rpx;
  font-weight: 700;
}

.feature-desc {
  margin-top: 4rpx;
  color: #7a8ba4;
  font-size: 22rpx;
}

.login-btn {
  margin-top: 44rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  box-shadow: 0 8rpx 28rpx rgba(47, 107, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.login-btn::after { border: none; }
.btn-icon {
  font-size: 28rpx;
  display: inline-block;
  animation: anim-pulse 2s ease-in-out infinite;
}

.tips {
  margin-top: 30rpx;
  text-align: center;
  color: #8a95ac;
  font-size: 23rpx;
}

.policy {
  margin-top: 20rpx;
  text-align: center;
  color: #a0a8b8;
  font-size: 21rpx;
}
.policy-link {
  color: #5a82cc;
  font-weight: 500;
}
</style>
