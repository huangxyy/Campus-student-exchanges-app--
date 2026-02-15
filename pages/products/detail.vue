<template>
  <view class="detail-page">
    <view v-if="loading" class="loading">加载商品详情中...</view>

    <template v-else-if="product">
      <swiper class="banner" circular autoplay :indicator-dots="true" :interval="3000" :duration="400">
        <swiper-item v-for="(img, index) in imageList" :key="`${product._id}-${index}`">
          <image class="banner-image" :src="img" mode="aspectFill" @tap="previewImage(index)" />
        </swiper-item>
      </swiper>

      <view class="main card">
        <view class="title-row">
          <view class="title">{{ product.title }}</view>
          <text class="meta-views">{{ product.views || 0 }} 浏览</text>
        </view>
        <view class="price-row">
          <text class="price">¥{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original">¥{{ product.originalPrice }}</text>
        </view>

        <view class="chips">
          <text class="ui-chip ui-chip-primary">{{ product.condition }}</text>
          <text class="ui-chip ui-chip-muted">{{ product.location }}</text>
          <text class="ui-chip ui-chip-muted">{{ timeText }}</text>
        </view>

        <view class="block-title ui-section-title">商品描述</view>
        <view class="desc">{{ displayDescription }}</view>
        <view v-if="isDescriptionLong" class="expand-link" @tap="toggleDescription">
          {{ descExpanded ? "收起" : "展开全文" }}
        </view>

        <view v-if="product.tags && product.tags.length > 0" class="tag-row">
          <text v-for="tag in product.tags" :key="tag" class="ui-chip ui-chip-muted">#{{ tag }}</text>
        </view>
      </view>

      <view class="seller card">
        <image class="avatar" :src="sellerAvatar" mode="aspectFill" />
        <view class="seller-info">
          <view class="name-row">
            <view class="name">{{ product.userName }}</view>
            <text v-if="product.certified" class="badge cert">已认证</text>
            <text v-if="product.collegeTag" class="badge college">{{ product.collegeTag }}</text>
          </view>
          <view class="meta">信用分 {{ product.rating || 5.0 }} · 校内交易</view>
          <view class="seller-tags">
            <text class="ui-chip ui-chip-success">当面交易更安全</text>
          </view>
        </view>
      </view>

      <view class="actions">
        <button :class="['ui-btn', favorited ? 'ui-btn-secondary active-btn' : 'ui-btn-ghost']" @tap="collect">
          {{ favorited ? "已收藏" : "收藏" }}
        </button>
        <button class="ui-btn ui-btn-primary" @tap="contact">联系卖家</button>
      </view>
    </template>

    <empty-state
      v-else
      title="商品不存在"
      description="可能已下架或链接失效"
      action-text="返回列表"
      @action="goBackToList"
    />
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { formatRelativeTime } from "@/utils/date";
import { getProductById, increaseProductViews } from "@/utils/product-service";
import { useUserStore } from "@/store/user";
import { createOrGetConversationByProduct } from "@/utils/chat-service";
import { isProductFavorited, toggleFavorite } from "@/utils/favorite-service";

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      id: "",
      loading: false,
      product: null,
      favorited: false,
      descExpanded: false
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    imageList() {
      if (this.product?.images?.length) {
        return this.product.images;
      }
      return ["https://picsum.photos/seed/product-fallback/900/900"];
    },

    sellerAvatar() {
      return this.product?.userAvatar || "https://picsum.photos/seed/seller-fallback/120/120";
    },

    timeText() {
      if (!this.product) {
        return "";
      }
      return formatRelativeTime(this.product.createdAt);
    },

    descriptionText() {
      return String(this.product?.description || "").trim();
    },

    isDescriptionLong() {
      return this.descriptionText.length > 80;
    },

    displayDescription() {
      if (this.descExpanded || !this.isDescriptionLong) {
        return this.descriptionText;
      }
      return `${this.descriptionText.slice(0, 80)}...`;
    }
  },

  onLoad(query) {
    this.id = query.id || "";
    this.loadProduct();
  },

  methods: {
    async loadProduct() {
      this.loading = true;
      try {
        this.product = await getProductById(this.id);
        if (this.product?._id) {
          increaseProductViews(this.product._id);
          this.favorited = await isProductFavorited(this.product._id);
          this.descExpanded = false;
        }
      } catch (error) {
        this.product = null;
        this.favorited = false;
      } finally {
        this.loading = false;
      }
    },

    async collect() {
      if (!this.product?._id) {
        return;
      }

      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }

      const res = await toggleFavorite(this.product);
      this.favorited = !!res.favorited;
      uni.showToast({
        title: this.favorited ? "已收藏" : "已取消收藏",
        icon: "none"
      });
    },

    async contact() {
      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }

      const profile = this.userStore.profile || {};
      if (!profile.userId) {
        uni.showToast({
          title: "登录信息异常，请重新登录",
          icon: "none"
        });
        return;
      }

      if (this.product.userId === profile.userId) {
        uni.showToast({
          title: "这是你自己发布的商品",
          icon: "none"
        });
        return;
      }

      try {
        const conversation = await createOrGetConversationByProduct({
          productId: this.product._id,
          productTitle: this.product.title,
          peerId: this.product.userId,
          peerName: this.product.userName,
          peerAvatar: this.product.userAvatar
        });

        uni.navigateTo({
          url: `/pages/chat/detail?conversationId=${conversation.id}`
        });
      } catch (error) {
        uni.showToast({
          title: "打开会话失败",
          icon: "none"
        });
      }
    },

    goBackToList() {
      // 使用 navigateBack 防止页面栈溢出，如果无法返回则 switchTab 到首页
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({
          url: "/pages/index/index"
        });
      }
    },

    toggleDescription() {
      this.descExpanded = !this.descExpanded;
    },

    previewImage(index) {
      uni.previewImage({
        urls: this.imageList,
        current: this.imageList[index] || this.imageList[0]
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.detail-page {
  padding-bottom: 152rpx;
  background:
    radial-gradient(circle at 9% 3%, rgba(59, 124, 255, 0.12), rgba(59, 124, 255, 0)),
    radial-gradient(circle at 94% 16%, rgba(42, 203, 167, 0.1), rgba(42, 203, 167, 0)),
    #f5f7fc;
}

.loading {
  margin-top: 120rpx;
  text-align: center;
  color: #8c96aa;
  font-size: 26rpx;
}

.banner {
  width: calc(100% - 32rpx);
  margin: 16rpx;
  height: 560rpx;
  border-radius: 24rpx;
  overflow: hidden;
  border: 1rpx solid #e3eaf9;
  box-shadow: 0 10rpx 24rpx rgba(26, 39, 68, 0.09);
}

.banner-image {
  width: 100%;
  height: 100%;
}

.main {
  margin: 16rpx;
  padding: 24rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14rpx;
}

.title {
  color: #1f2430;
  font-size: 33rpx;
  font-weight: 600;
  line-height: 1.45;
  flex: 1;
}

.meta-views {
  color: #77849b;
  font-size: 22rpx;
  margin-top: 6rpx;
}

.price-row {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.price {
  color: #e64961;
  font-size: 44rpx;
  font-weight: 700;
}

.original {
  color: #9aa2b2;
  font-size: 24rpx;
  text-decoration: line-through;
}

.chips {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.block-title {
  margin-top: 20rpx;
  font-size: 25rpx;
}

.desc {
  margin-top: 10rpx;
  color: #4f5c75;
  line-height: 1.7;
  font-size: 26rpx;
}

.expand-link {
  margin-top: 8rpx;
  color: #2f6bff;
  font-size: 23rpx;
}

.tag-row {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.seller {
  margin: 0 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  border: 1rpx solid #e3eaf7;
}

.name {
  color: #243045;
  font-size: 30rpx;
  font-weight: 600;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.badge {
  height: 34rpx;
  line-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
}

.badge.cert {
  background: #eaf4ff;
  color: #2f6bff;
}

.badge.college {
  background: #eef5ec;
  color: #2f8a49;
}

.meta {
  margin-top: 6rpx;
  color: #7e889b;
  font-size: 24rpx;
}

.seller-tags {
  margin-top: 10rpx;
}

.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 14rpx;
  padding: 18rpx 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #e9edf5;
}

.ui-btn {
  flex: 1;
}

.active-btn {
  background: #dfe9ff;
  color: #214aad;
}
</style>
