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
  margin: 80rpx auto;
  text-align: center;
  padding: 20rpx;

  .illust {
    position: relative;
    width: 200rpx;
    height: 200rpx;
    margin: 0 auto 20rpx;
  }

  .illust-circle {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0.02));
    border: 2rpx dashed rgba(47, 107, 255, 0.15);
  }

  .illust-circle-sm {
    position: absolute;
    width: 60rpx; height: 60rpx;
    right: -10rpx; top: 10rpx;
    border-radius: 50%;
    background: rgba(19, 194, 163, 0.1);
    border: 1rpx solid rgba(19, 194, 163, 0.15);
  }

  .illust-icon {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72rpx;
  }

  .illust-dot {
    position: absolute;
    border-radius: 50%;
  }
  .dot-1 {
    width: 12rpx; height: 12rpx;
    left: -6rpx; top: 60rpx;
    background: rgba(47, 107, 255, 0.25);
  }
  .dot-2 {
    width: 8rpx; height: 8rpx;
    right: -4rpx; bottom: 40rpx;
    background: rgba(124, 58, 237, 0.3);
  }
  .dot-3 {
    width: 10rpx; height: 10rpx;
    left: 30rpx; bottom: 10rpx;
    background: rgba(19, 194, 163, 0.25);
  }

  .title {
    margin-top: 8rpx;
    font-size: 30rpx;
    color: #1a2540;
    font-weight: 700;
  }

  .desc {
    margin-top: 10rpx;
    color: #8a95ac;
    font-size: 24rpx;
    line-height: 1.6;
  }

  .action {
    margin-top: 28rpx;
    width: 280rpx;
    height: 76rpx;
    line-height: 76rpx;
    background: linear-gradient(135deg, #2f6bff, #5b8af5);
    color: #fff;
    border: none;
    border-radius: 38rpx;
    font-size: 26rpx;
    font-weight: 600;
    box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.25);
  }
  .action::after { border: none; }
}
</style>
