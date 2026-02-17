<template>
  <view class="empty-state anim-fade-in">
    <view class="illust">
      <view class="illust-circle"></view>
      <view class="illust-circle-sm anim-float"></view>
      <view class="illust-icon anim-bounce-in">{{ icon }}</view>
      <view class="illust-dot dot-1 anim-float"></view>
      <view class="illust-dot dot-2 anim-float-x"></view>
      <view class="illust-dot dot-3 anim-breathe"></view>
    </view>
    <view class="title anim-slide-up anim-d2">{{ title }}</view>
    <view class="desc anim-slide-up anim-d3">{{ description }}</view>
    <button v-if="actionText" class="action btn-bounce anim-scale-in anim-d4" @tap="$emit('action')">{{ actionText }}</button>
  </view>
</template>

<script>
export default {
  emits: ["action"],
  props: {
    title: {
      type: String,
      default: "暂无数据"
    },
    description: {
      type: String,
      default: "换个筛选条件试试"
    },
    actionText: {
      type: String,
      default: ""
    },
    icon: {
      type: String,
      default: "📦"
    }
  }
};
</script>

<style lang="scss" scoped>
.empty-state {
  margin: 60rpx auto;
  text-align: center;
  padding: 40rpx 30rpx;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  border-radius: 28rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);

  .illust {
    position: relative;
    width: 220rpx;
    height: 220rpx;
    margin: 0 auto 24rpx;
  }

  .illust-circle {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0.01));
    border: 2rpx dashed rgba(47, 107, 255, 0.12);
  }

  .illust-circle-sm {
    position: absolute;
    width: 64rpx; height: 64rpx;
    right: -12rpx; top: 8rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(19, 194, 163, 0.1), rgba(19, 194, 163, 0.05));
    border: 1rpx solid rgba(19, 194, 163, 0.12);
  }

  .illust-icon {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 78rpx;
    filter: drop-shadow(0 4rpx 8rpx rgba(47, 107, 255, 0.08));
  }

  .illust-dot {
    position: absolute;
    border-radius: 50%;
  }
  .dot-1 {
    width: 14rpx; height: 14rpx;
    left: -8rpx; top: 60rpx;
    background: rgba(47, 107, 255, 0.2);
  }
  .dot-2 {
    width: 10rpx; height: 10rpx;
    right: -6rpx; bottom: 40rpx;
    background: rgba(124, 58, 237, 0.25);
  }
  .dot-3 {
    width: 12rpx; height: 12rpx;
    left: 28rpx; bottom: 8rpx;
    background: rgba(19, 194, 163, 0.2);
  }

  .title {
    margin-top: 10rpx;
    font-size: 32rpx;
    color: #1a2540;
    font-weight: 800;
    letter-spacing: 0.5rpx;
  }

  .desc {
    margin-top: 12rpx;
    color: #8a95ac;
    font-size: 25rpx;
    line-height: 1.7;
    max-width: 480rpx;
    margin-left: auto;
    margin-right: auto;
  }

  .action {
    margin-top: 32rpx;
    width: 300rpx;
    height: 80rpx;
    line-height: 80rpx;
    background: linear-gradient(135deg, #2f6bff, #5b8af5);
    color: #fff;
    border: none;
    border-radius: 40rpx;
    font-size: 27rpx;
    font-weight: 600;
    box-shadow: 0 8rpx 28rpx rgba(47, 107, 255, 0.28);
    letter-spacing: 1rpx;
  }
  .action::after { border: none; }
}
</style>
