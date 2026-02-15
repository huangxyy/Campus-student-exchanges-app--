<template>
  <view class="login-page">
    <view class="hero-bg"></view>

    <view class="hero card anim-slide-down">
      <view class="brand-icon anim-float">🎓</view>
      <view class="title">校园跳蚤市场</view>
      <view class="subtitle">让闲置流动起来，让任务更高效</view>
    </view>

    <view class="features anim-slide-up anim-d2">
      <view class="feature-item" v-for="item in features" :key="item.icon">
        <view class="feature-icon">{{ item.icon }}</view>
        <view class="feature-text">
          <view class="feature-title">{{ item.title }}</view>
          <view class="feature-desc">{{ item.desc }}</view>
        </view>
      </view>
    </view>

    <button class="login-btn btn-bounce anim-scale-in anim-d4" :loading="loading" @tap="handleLogin">
      {{ loading ? "登录中..." : "微信一键登录" }}
    </button>

    <view class="tips anim-fade-in anim-d5">首次登录后可在「我的」页面补充学号与联系方式</view>

    <view class="policy anim-fade-in anim-d6">登录代表你同意《用户协议》与《隐私政策》</view>
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
        { icon: "🛒", title: "二手好物", desc: "校内面交更安心" },
        { icon: "📌", title: "任务互助", desc: "代取代课快速抢单" },
        { icon: "💬", title: "实时沟通", desc: "消息秒达不错过" }
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
    radial-gradient(circle at 20% 15%, rgba(47, 107, 255, 0.18), rgba(47, 107, 255, 0) 55%),
    radial-gradient(circle at 85% 30%, rgba(19, 194, 163, 0.16), rgba(19, 194, 163, 0) 50%),
    radial-gradient(circle at 50% 80%, rgba(120, 80, 255, 0.08), rgba(120, 80, 255, 0) 40%),
    #f5f7fc;
}

.hero-bg {
  position: absolute;
  top: -100rpx;
  right: -60rpx;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.1), rgba(47, 107, 255, 0));
  pointer-events: none;
}

.hero {
  position: relative;
  padding: 44rpx 36rpx;
  text-align: center;
  background:
    linear-gradient(140deg, rgba(231, 239, 255, 0.96), rgba(243, 247, 255, 0.98)),
    #ffffff;
  border: 1rpx solid #e4ebfb;
}

.brand-icon {
  width: 100rpx;
  height: 100rpx;
  margin: 0 auto 20rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid #e3eaf9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50rpx;
  box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.12);
}

.title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1d2433;
  letter-spacing: 2rpx;
}

.subtitle {
  margin-top: 14rpx;
  color: #5a677f;
  font-size: 27rpx;
  line-height: 1.6;
}

/* --- 特性亮点 --- */
.features {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: $radius-card;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid #e9eef8;
  box-shadow: 0 4rpx 12rpx rgba(24, 37, 66, 0.04);
}

.feature-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  background: linear-gradient(140deg, rgba(231, 239, 255, 0.95), rgba(243, 247, 255, 0.96));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.feature-text {
  flex: 1;
}

.feature-title {
  color: #1f2a3c;
  font-size: 27rpx;
  font-weight: 600;
}

.feature-desc {
  margin-top: 4rpx;
  color: #7a869f;
  font-size: 22rpx;
}

/* --- 登录按钮 --- */
.login-btn {
  margin-top: 44rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.3);
}

.login-btn::after {
  border: none;
}

.tips {
  margin-top: 28rpx;
  text-align: center;
  color: #8b95aa;
  font-size: 23rpx;
}

.policy {
  margin-top: 20rpx;
  text-align: center;
  color: #a0a8b8;
  font-size: 21rpx;
}
</style>
