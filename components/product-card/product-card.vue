<template>
  <view class="product-card card-press anim-slide-up" @tap="handleTap">
    <view class="cover-wrap">
      <image class="cover" :src="cover" mode="aspectFill" lazy-load />
      <view class="cover-mask"></view>

      <view class="top-badges">
        <text class="chip condition">{{ product.condition || "成色未知" }}</text>
        <text v-if="product.certified" class="chip cert">已认证</text>
      </view>

      <view v-if="product.aiGenerated" class="ai-tag">AI 推荐</view>
    </view>

    <view class="content">
      <view class="title">{{ product.title }}</view>
      <view class="desc">{{ product.description }}</view>

      <view class="meta-row">
        <view class="price-wrap">
          <text class="price">¥{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
        </view>
        <text class="views">{{ metricText }}</text>
      </view>

      <view class="bottom-row">
        <view class="seller">
          <image class="avatar" :src="sellerAvatar" mode="aspectFill" />
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
  border-radius: 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
  border: 1rpx solid #e9edf7;
  box-shadow: 0 12rpx 24rpx rgba(26, 38, 66, 0.08);

  .cover-wrap {
    position: relative;
  }

  .cover {
    width: 100%;
    height: 334rpx;
    display: block;
  }

  .cover-mask {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 90rpx;
    background: linear-gradient(to top, rgba(15, 25, 45, 0.35), rgba(15, 25, 45, 0));
  }

  .top-badges {
    position: absolute;
    left: 14rpx;
    top: 14rpx;
    display: flex;
    gap: 8rpx;
  }

  .chip {
    height: 38rpx;
    line-height: 38rpx;
    padding: 0 12rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    background: rgba(255, 255, 255, 0.88);
  }

  .chip.condition {
    color: #3d4f73;
  }

  .chip.cert {
    background: rgba(54, 117, 255, 0.9);
    color: #fff;
  }

  .content {
    padding: 22rpx;
  }

  .title {
    font-size: 29rpx;
    color: #1f2430;
    font-weight: 600;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .desc {
    margin-top: 10rpx;
    color: #697790;
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
    gap: 10rpx;
  }

  .price {
    color: #ea3f57;
    font-size: 34rpx;
    font-weight: 700;
  }

  .original-price {
    color: #a2a9b8;
    text-decoration: line-through;
    font-size: 22rpx;
  }

  .views {
    color: #78839b;
    font-size: 22rpx;
  }

  .bottom-row {
    margin-top: 14rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .seller {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  .avatar {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    border: 1rpx solid #e7ebf5;
  }

  .name,
  .time {
    font-size: 22rpx;
    color: #6f7890;
  }

  .ai-tag {
    position: absolute;
    right: 14rpx;
    bottom: 14rpx;
    height: 38rpx;
    line-height: 38rpx;
    padding: 0 14rpx;
    border-radius: 20rpx;
    background: rgba(36, 210, 173, 0.9);
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 600;
  }
}
</style>
