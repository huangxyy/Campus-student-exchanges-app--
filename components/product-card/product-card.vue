<template>
  <view class="product-card card-press anim-slide-up" @tap="handleTap">
    <view class="cover-wrap img-zoom-wrap">
      <image class="cover" :src="cover" mode="aspectFill" lazy-load />
      <view class="cover-mask"></view>
      <view class="cover-shine"></view>

      <view class="top-badges">
        <text class="chip condition glass">{{ product.condition || "成色未知" }}</text>
        <text v-if="product.certified" class="chip cert">✓ 已认证</text>
      </view>

      <view v-if="product.aiGenerated" class="ai-tag anim-pulse">AI 推荐</view>
    </view>

    <view class="content">
      <view class="title">{{ product.title }}</view>
      <view class="desc">{{ product.description }}</view>

      <view class="meta-row">
        <view class="price-wrap">
          <text class="price-symbol">¥</text>
          <text class="price">{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
        </view>
        <text class="views">{{ metricText }}</text>
      </view>

      <view class="bottom-row">
        <view class="seller">
          <view class="avatar-ring">
            <image class="avatar" :src="sellerAvatar" mode="aspectFill" />
          </view>
          <text class="name">{{ product.userName || "校园用户" }}</text>
        </view>
        <text class="time">{{ timeText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { formatRelativeTime } from "@/utils/date";

export default {
  emits: ["click"],

  props: {
    product: {
      type: Object,
      required: true
    }
  },

  computed: {
    cover() {
      if (this.product.images && this.product.images.length > 0) {
        return this.product.images[0];
      }
      return "https://picsum.photos/seed/fallback-cover/900/900";
    },

    sellerAvatar() {
      return this.product.userAvatar || "https://picsum.photos/seed/fallback-avatar/120/120";
    },

    timeText() {
      return formatRelativeTime(this.product.createdAt);
    },

    distanceText() {
      const distance = Number(this.product._distanceKm);
      if (!Number.isFinite(distance)) {
        return "";
      }
      if (distance < 1) {
        return `${Math.max(1, Math.round(distance * 1000))}m`;
      }
      return `${distance.toFixed(1)}km`;
    },

    metricText() {
      if (this.distanceText) {
        return `${this.distanceText} · ${this.product.views} 浏览`;
      }
      return `${this.product.views} 浏览`;
    }
  },

  methods: {
    handleTap() {
      this.$emit("click", this.product);
    }
  }
};
</script>

<style lang="scss" scoped>
.product-card {
  position: relative;
  overflow: hidden;
  border-radius: 26rpx;
  background: #fff;
  margin-bottom: 20rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  box-shadow:
    0 4rpx 12rpx rgba(26, 38, 66, 0.04),
    0 12rpx 32rpx rgba(26, 38, 66, 0.07);
  transition: box-shadow 0.3s ease;

  .cover-wrap {
    position: relative;
  }

  .cover {
    width: 100%;
    height: 340rpx;
    display: block;
  }

  .cover-mask {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 100rpx;
    background: linear-gradient(to top, rgba(10, 18, 38, 0.4), rgba(10, 18, 38, 0));
    pointer-events: none;
  }

  .cover-shine {
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: anim-img-shine 2s ease-in-out 1;
    pointer-events: none;
  }
  @keyframes anim-img-shine {
    0%   { left: -100%; }
    40%  { left: 150%; }
    100% { left: 150%; }
  }

  .top-badges {
    position: absolute;
    left: 16rpx; top: 16rpx;
    display: flex;
    gap: 8rpx;
  }

  .chip {
    height: 40rpx;
    line-height: 40rpx;
    padding: 0 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
  }

  .chip.condition {
    color: #2b3a5e;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(10rpx);
    -webkit-backdrop-filter: blur(10rpx);
    border: 1rpx solid rgba(255, 255, 255, 0.5);
  }

  .chip.cert {
    background: linear-gradient(135deg, rgba(47, 107, 255, 0.9), rgba(36, 89, 214, 0.95));
    color: #fff;
    box-shadow: 0 4rpx 10rpx rgba(47, 107, 255, 0.3);
  }

  .content {
    padding: 22rpx 24rpx;
  }

  .title {
    font-size: 29rpx;
    color: #1a2540;
    font-weight: 700;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .desc {
    margin-top: 10rpx;
    color: #6a7e9a;
    font-size: 23rpx;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta-row {
    margin-top: 16rpx;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .price-wrap {
    display: flex;
    align-items: baseline;
    gap: 4rpx;
  }

  .price-symbol {
    color: #e63950;
    font-size: 22rpx;
    font-weight: 700;
  }

  .price {
    color: #e63950;
    font-size: 36rpx;
    font-weight: 800;
    letter-spacing: -1rpx;
  }

  .original-price {
    margin-left: 8rpx;
    color: #a8b0c0;
    text-decoration: line-through;
    font-size: 22rpx;
  }

  .views {
    color: #8a95ac;
    font-size: 22rpx;
  }

  .bottom-row {
    margin-top: 14rpx;
    padding-top: 14rpx;
    border-top: 1rpx solid #f0f3f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .seller {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  .avatar-ring {
    width: 40rpx; height: 40rpx;
    border-radius: 50%;
    padding: 2rpx;
    background: linear-gradient(135deg, #2f6bff, #13c2a3);
    flex-shrink: 0;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2rpx solid #fff;
    display: block;
  }

  .name {
    font-size: 22rpx;
    color: #5a6a88;
    font-weight: 500;
  }

  .time {
    font-size: 22rpx;
    color: #8a95ac;
  }

  .ai-tag {
    position: absolute;
    right: 16rpx; bottom: 16rpx;
    height: 40rpx;
    line-height: 40rpx;
    padding: 0 16rpx;
    border-radius: 20rpx;
    background: linear-gradient(135deg, rgba(19, 194, 163, 0.92), rgba(36, 185, 135, 0.95));
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 600;
    box-shadow: 0 4rpx 12rpx rgba(19, 194, 163, 0.35);
  }
}
</style>
