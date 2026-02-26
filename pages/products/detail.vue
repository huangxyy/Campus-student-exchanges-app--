<template>
  <view class="detail-page">
    <view v-if="loading" class="loading">加载商品详情中...</view>

    <template v-else-if="product">
      <view class="banner-wrap anim-slide-down">
        <swiper class="banner" circular autoplay :indicator-dots="false" :interval="3000" :duration="400" @change="onSwiperChange">
          <swiper-item v-for="(img, index) in imageList" :key="`${product._id}-${index}`">
            <image class="banner-image" :src="img" mode="aspectFill" @tap="previewImage(index)" />
          </swiper-item>
        </swiper>
        <view class="img-counter glass">
          <text class="counter-text">{{ currentImageIndex + 1 }} / {{ imageList.length }}</text>
        </view>
      </view>

      <view class="main card anim-stagger-fade anim-d1">
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

      <view class="seller card anim-stagger-fade anim-d2" @tap="goSellerProfile">
        <view class="seller-avatar-wrap">
          <view class="seller-avatar-ring">
            <image class="avatar" :src="sellerAvatar" mode="aspectFill" />
          </view>
          <view v-if="product.certified" class="seller-verified">✓</view>
        </view>
        <view class="seller-info">
          <view class="name-row">
            <view class="name">{{ product.userName }}</view>
            <text v-if="product.collegeTag" class="badge college">{{ product.collegeTag }}</text>
          </view>
          <view class="meta">
            <text class="meta-stars">{{ ratingStars }}</text>
            <text class="meta-sep">·</text>
            信用分 {{ product.rating || 5.0 }}
            <text class="meta-sep">·</text>
            校内交易
          </view>
          <view class="seller-tags">
            <text class="ui-chip ui-chip-success">🛡️ 当面交易更安全</text>
            <text class="ui-chip ui-chip-muted">查看主页 →</text>
          </view>
        </view>
      </view>

      <view class="actions anim-slide-up anim-d3">
        <button :class="['ui-btn', 'btn-bounce', favorited ? 'ui-btn-secondary active-btn' : 'ui-btn-ghost']" @tap="collect">
          {{ favorited ? "已收藏" : "收藏" }}
        </button>
        <button class="ui-btn ui-btn-ghost btn-bounce" @tap="reportProduct">举报</button>
        <template v-if="product.status === 'available'">
          <button class="ui-btn ui-btn-secondary btn-bounce" @tap="contact">联系卖家</button>
          <button class="ui-btn ui-btn-primary btn-bounce" @tap="buyNow">立即下单</button>
        </template>
        <template v-else>
          <button class="ui-btn ui-btn-muted" disabled>{{ productStatusText }}</button>
        </template>
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
import { createOrder } from "@/utils/order-service";
import { submitReport, REPORT_REASONS } from "@/utils/report-service";
import { addPoints } from "@/utils/points-service";
import { showError } from "@/utils/error-handler";

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
      descExpanded: false,
      currentImageIndex: 0
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
    },

    productStatusText() {
      const statusMap = {
        sold: "已售出",
        reserved: "已预留",
        unavailable: "已下架"
      };
      return statusMap[this.product?.status] || "不可购买";
    },

    ratingStars() {
      const rating = Number(this.product?.rating || 5);
      const full = Math.min(5, Math.round(rating));
      return "★".repeat(full);
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
        showError(error, { title: "商品加载失败" });
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
        showError(error, { title: "打开会话失败" });
      }
    },

    async buyNow() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }

      const profile = this.userStore.profile || {};
      if (!profile.userId) {
        uni.showToast({ title: "登录信息异常，请重新登录", icon: "none" });
        return;
      }

      if (this.product.userId === profile.userId) {
        uni.showToast({ title: "不能购买自己发布的商品", icon: "none" });
        return;
      }

      uni.showLoading({ title: "检查商品状态..." });
      try {
        const latestProduct = await getProductById(this.product._id);
        uni.hideLoading();

        if (!latestProduct) {
          uni.showToast({ title: "商品已不存在", icon: "none" });
          this.product = null;
          return;
        }

        this.product = latestProduct;

        if (latestProduct.status === "reserved") {
          uni.showToast({ title: "该商品已被其他买家预留", icon: "none" });
          return;
        }

        if (latestProduct.status === "sold") {
          uni.showToast({ title: "该商品已售出", icon: "none" });
          return;
        }

        if (latestProduct.status !== "available") {
          uni.showToast({ title: "该商品已下架或不可购买", icon: "none" });
          return;
        }
      } catch (e) {
        uni.hideLoading();
        showError(e, { title: "商品状态检查失败，请重试" });
        return;
      }

      uni.showModal({
        title: "确认下单",
        content: `确认购买「${this.product.title}」？价格 ¥${this.product.price}。\n\n下单后商品将为你预留24小时，请及时与卖家约定面交。`,
        confirmText: "确认下单",
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          try {
            const order = await createOrder({
              productId: this.product._id,
              productTitle: this.product.title,
              productPrice: this.product.price,
              sellerId: this.product.userId,
              sellerName: this.product.userName || "卖家"
            });

            uni.showToast({ title: "下单成功", icon: "success" });
            setTimeout(() => {
              uni.navigateTo({ url: `/pages/orders/detail?id=${order.id}` });
            }, 800);
          } catch (error) {
            showError(error, { title: "下单失败，请重试" });
          }
        }
      });
    },

    reportProduct() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }

      if (!this.product?._id) {
        return;
      }

      const labels = REPORT_REASONS.map((r) => r.label);
      uni.showActionSheet({
        itemList: labels,
        success: async (res) => {
          const selected = REPORT_REASONS[res.tapIndex];
          if (!selected) {
            return;
          }

          try {
            await submitReport({
              targetType: "product",
              targetId: this.product._id,
              reason: selected.value,
              detail: `举报商品: ${this.product.title}`
            });
            uni.showToast({ title: "举报已提交，感谢反馈", icon: "success" });
          } catch (error) {
            showError(error, { title: "举报失败" });
          }
        }
      });
    },

    goSellerProfile() {
      if (!this.product?.userId) {
        return;
      }
      uni.navigateTo({
        url: `/pages/profile/user?id=${this.product.userId}`
      });
    },

    goBackToList() {
      const pages = getCurrentPages();
      if (pages && pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: "/pages/index/index" });
      }
    },

    toggleDescription() {
      this.descExpanded = !this.descExpanded;
    },

    onSwiperChange(e) {
      this.currentImageIndex = e.detail.current || 0;
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
  padding-bottom: 160rpx;
  background:
    radial-gradient(circle at 9% 3%, rgba(59, 124, 255, 0.10), rgba(59, 124, 255, 0) 50%),
    radial-gradient(circle at 94% 16%, rgba(42, 203, 167, 0.08), rgba(42, 203, 167, 0) 45%),
    radial-gradient(circle at 50% 60%, rgba(124, 58, 237, 0.04), rgba(124, 58, 237, 0) 40%),
    #f2f5fc;
}

.loading {
  margin-top: 120rpx;
  text-align: center;
  color: #8c96aa;
  font-size: 26rpx;
}

.banner-wrap {
  position: relative;
  width: calc(100% - 32rpx);
  margin: 16rpx;
  border-radius: 28rpx;
  overflow: hidden;
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow:
    0 8rpx 20rpx rgba(26, 39, 68, 0.06),
    0 20rpx 48rpx rgba(26, 39, 68, 0.08);
}

.banner {
  width: 100%;
  height: 580rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.img-counter {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  height: 44rpx;
  line-height: 44rpx;
  padding: 0 18rpx;
  border-radius: 22rpx;
  z-index: 10;
}
.counter-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #2b3a5e;
}

.main {
  margin: 16rpx;
  padding: 28rpx;
  border-radius: 26rpx;
  background: #ffffff;
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  box-shadow: 0 6rpx 20rpx rgba(31, 38, 66, 0.05);
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14rpx;
}

.title {
  color: #1a2540;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.45;
  flex: 1;
  letter-spacing: 0.5rpx;
}

.meta-views {
  color: #8a95ac;
  font-size: 22rpx;
  margin-top: 8rpx;
  background: #f3f6fd;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.price-row {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #fff5f6, #fff0f2);
  border-radius: 18rpx;
  border: 1rpx solid rgba(230, 73, 97, 0.08);
}

.price {
  color: #e64961;
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: -1rpx;
}

.original {
  color: #b8b8c0;
  font-size: 24rpx;
  text-decoration: line-through;
}

.chips {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.block-title {
  margin-top: 24rpx;
  font-size: 26rpx;
  position: relative;
  padding-left: 18rpx;
}
.block-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4rpx;
  bottom: 4rpx;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #2f6bff, #13c2a3);
}

.desc {
  margin-top: 12rpx;
  color: #4f5c75;
  line-height: 1.8;
  font-size: 26rpx;
  padding: 16rpx 20rpx;
  background: #f9fafd;
  border-radius: 16rpx;
  border: 1rpx solid #eef2fb;
}

.expand-link {
  margin-top: 10rpx;
  color: #2f6bff;
  font-size: 23rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.tag-row {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.seller {
  margin: 14rpx 16rpx 0;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-radius: 26rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 255, 0.95));
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  box-shadow: 0 6rpx 20rpx rgba(31, 38, 66, 0.05);
}

.seller-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.seller-avatar-ring {
  width: 94rpx;
  height: 94rpx;
  border-radius: 50%;
  padding: 3rpx;
  background: linear-gradient(135deg, #2f6bff, #13c2a3);
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.15);
}
.seller-verified {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  font-size: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 6rpx rgba(47, 107, 255, 0.3);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2rpx solid #fff;
  display: block;
}

.name {
  color: #1a2540;
  font-size: 30rpx;
  font-weight: 700;
}

.meta-stars {
  color: #f5a623;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}
.meta-sep {
  margin: 0 4rpx;
  color: #c8d0e0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.badge {
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.badge.cert {
  background: linear-gradient(135deg, #eaf4ff, #e0edff);
  color: #2f6bff;
}

.badge.college {
  background: linear-gradient(135deg, #eef8ec, #e4f5e1);
  color: #2f8a49;
}

.meta {
  margin-top: 8rpx;
  color: #7e889b;
  font-size: 24rpx;
}

.seller-tags {
  margin-top: 12rpx;
}

.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 14rpx;
  padding: 18rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow: 0 -4rpx 20rpx rgba(31, 38, 66, 0.05);
  z-index: 100;
}

.ui-btn {
  flex: 1;
}

.active-btn {
  background: linear-gradient(135deg, #dfe9ff, #e8f0ff);
  color: #214aad;
}
</style>
