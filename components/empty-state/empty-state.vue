<template>
  <view class="empty-state">
    <view class="icon">📦</view>
    <view class="title">{{ title }}</view>
    <view class="desc">{{ description }}</view>
    <button v-if="actionText" class="action" @tap="$emit('action')">{{ actionText }}</button>
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
    }
  }
};
</script>

<style lang="scss" scoped>
.empty-state {
  margin: 100rpx auto;
  text-align: center;

  .icon {
    font-size: 72rpx;
  }

  .title {
    margin-top: 16rpx;
    font-size: 30rpx;
    color: #273042;
    font-weight: 600;
  }

  .desc {
    margin-top: 8rpx;
    color: #8b94a8;
    font-size: 24rpx;
  }

  .action {
    margin-top: 24rpx;
    width: 260rpx;
    background: #2f6bff;
    color: #fff;
    border: none;
    border-radius: 40rpx;
    font-size: 26rpx;
  }
}
</style>
