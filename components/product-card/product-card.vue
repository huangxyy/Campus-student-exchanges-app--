<template>
  <view class="product-card card-press" @tap="handleTap">
    <view class="cover-wrap img-zoom-wrap">
      <image class="cover" :src="cover" mode="aspectFill" lazy-load />
      <view class="cover-mask"></view>
      <view class="cover-shine"></view>

      <view class="top-badges">
        <text class="chip condition glass">{{ product.condition || "成色未知" }}</text>
        <text v-if="product.certified" class="chip cert">✓ 已认证</text>
      </view>

      <view v-if="product.status === 'sold'" class="sold-overlay">
        <text class="sold-text">已售出</text>
      </view>
      <view v-else-if="product.status === 'reserved'" class="sold-overlay reserved-overlay">
        <text class="sold-text">已预留</text>
      </view>
      <view v-else-if="product.status === 'unavailable'" class="sold-overlay unavailable-overlay">
        <text class="sold-text">已下架</text>
      </view>
      <view v-if="product.aiGenerated && product.status === 'available'" class="ai-tag anim-pulse">AI 推荐</view>
      <view v-if="discountPercent > 0" class="discount-tag">{{ discountPercent }}折</view>
    </view>

    <view class="content">
      <view class="title">{{ product.title }}</view>
      <view class="desc">{{ product.description }}</view>

      <view class="meta-row">
        <view class="price-wrap">
          <text class="price-symbol">¥</text>
          <text class="price">{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
          <text v-if="savingsText" class="savings-tag">省{{ savingsText }}</text>
        </view>
        <text class="views">{{ metricText }}</text>
      </view>

      <view class="location-row" v-if="product.location">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ product.location }}</text>
      </view>

      <view class="bottom-row">
        <view class="seller">
          <view class="avatar-ring">
            <image class="avatar" :src="sellerAvatar" mode="aspectFill" />
          </view>
          <text class="name">{{ product.userName || "校园用户" }}</text>
          <text v-if="product.certified" class="seller-cert">✓</text>
        </view>
        <view class="bottom-right">
          <text class="time">{{ timeText }}</text>
        </view>
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
    },

    discountPercent() {
      const price = Number(this.product.price);
      const original = Number(this.product.originalPrice);
      if (!original || !price || original <= price) return 0;
      return Math.round((price / original) * 10);
    },

    savingsText() {
      const price = Number(this.product.price);
      const original = Number(this.product.originalPrice);
      if (!original || !price || original <= price) return "";
      const saved = original - price;
      return saved >= 1 ? `¥${saved}` : "";
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
  border-radius: 28rpx;
  background: #fff;
  margin-bottom: 20rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  box-shadow:
    0 4rpx 12rpx rgba(26, 38, 66, 0.03),
    0 16rpx 40rpx rgba(26, 38, 66, 0.06);
  transition: box-shadow 0.3s ease, transform 0.3s ease;

  .cover-wrap {
    position: relative;
  }

  .cover {
    width: 100%;
    height: 360rpx;
    display: block;
  }

  .cover-mask {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 120rpx;
    background: linear-gradient(to top, rgba(10, 18, 38, 0.35), rgba(10, 18, 38, 0));
    pointer-events: none;
  }

  .cover-shine {
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
    animation: anim-img-shine 2.5s ease-in-out 1;
    pointer-events: none;
  }
  @keyframes anim-img-shine {
    0%   { left: -100%; }
    40%  { left: 150%; }
    100% { left: 150%; }
  }

  .top-badges {
    position: absolute;
    left: 18rpx; top: 18rpx;
    display: flex;
    gap: 8rpx;
  }

  .chip {
    height: 42rpx;
    line-height: 42rpx;
    padding: 0 16rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
  }

  .chip.condition {
    color: #2b3a5e;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12rpx);
    -webkit-backdrop-filter: blur(12rpx);
    border: 1rpx solid rgba(255, 255, 255, 0.55);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }

  .chip.cert {
    background: linear-gradient(135deg, rgba(47, 107, 255, 0.92), rgba(36, 89, 214, 0.95));
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(47, 107, 255, 0.3);
  }

  .content {
    padding: 22rpx 24rpx 24rpx;
  }

  .title {
    font-size: 30rpx;
    color: #1a2540;
    font-weight: 700;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    letter-spacing: 0.3rpx;
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
    padding: 6rpx 14rpx;
    background: linear-gradient(135deg, #fff5f6, #fff0f2);
    border-radius: 12rpx;
    border: 1rpx solid rgba(230, 57, 80, 0.06);
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
    color: #b8b8c0;
    text-decoration: line-through;
    font-size: 22rpx;
  }

  .views {
    color: #8a95ac;
    font-size: 22rpx;
  }

  .location-row {
    margin-top: 10rpx;
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  .location-icon {
    font-size: 18rpx;
  }

  .location-text {
    color: #8a95ac;
    font-size: 21rpx;
  }

  .bottom-row {
    margin-top: 12rpx;
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
    width: 42rpx; height: 42rpx;
    border-radius: 50%;
    padding: 2rpx;
    background: linear-gradient(135deg, #2f6bff, #13c2a3);
    flex-shrink: 0;
    box-shadow: 0 2rpx 6rpx rgba(47, 107, 255, 0.15);
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
    color: #a0a8b8;
  }

  .sold-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }
  .reserved-overlay {
    background: rgba(47, 107, 255, 0.45);
  }
  .unavailable-overlay {
    background: rgba(100, 110, 130, 0.45);
  }

  .sold-text {
    padding: 12rpx 32rpx;
    border-radius: 12rpx;
    background: rgba(255, 255, 255, 0.92);
    color: #8a93a7;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }

  .ai-tag {
    position: absolute;
    right: 18rpx; bottom: 18rpx;
    height: 42rpx;
    line-height: 42rpx;
    padding: 0 18rpx;
    border-radius: 21rpx;
    background: linear-gradient(135deg, rgba(19, 194, 163, 0.92), rgba(36, 185, 135, 0.95));
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 600;
    box-shadow: 0 4rpx 14rpx rgba(19, 194, 163, 0.35);
    backdrop-filter: blur(4rpx);
    -webkit-backdrop-filter: blur(4rpx);
  }

  .discount-tag {
    position: absolute;
    left: 18rpx; bottom: 18rpx;
    height: 38rpx;
    line-height: 38rpx;
    padding: 0 14rpx;
    border-radius: 10rpx;
    background: linear-gradient(135deg, rgba(230, 57, 80, 0.92), rgba(220, 40, 60, 0.95));
    color: #fff;
    font-size: 20rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 12rpx rgba(230, 57, 80, 0.3);
    backdrop-filter: blur(4rpx);
    -webkit-backdrop-filter: blur(4rpx);
  }

  .savings-tag {
    margin-left: 6rpx;
    font-size: 18rpx;
    color: #e63950;
    background: rgba(230, 57, 80, 0.06);
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    font-weight: 600;
  }

  .seller-cert {
    width: 26rpx;
    height: 26rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #2f6bff, #2459d6);
    color: #fff;
    font-size: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .bottom-right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
}
</style>
