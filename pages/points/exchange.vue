<template>
  <view class="exchange-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-content">
        <view class="banner-label">当前积分</view>
        <view class="banner-total anim-bounce-in">{{ pointsTotal }}</view>
      </view>
    </view>

    <view class="section-head anim-fade-in anim-d2">
      <text class="section-title">积分兑换</text>
    </view>

    <view
      v-for="(item, idx) in items"
      :key="item.id"
      :class="['item-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 6 ? ('anim-d' + (idx + 3)) : '']"
      style="border-radius: 24rpx;"
    >
      <view class="item-icon">{{ item.icon }}</view>
      <view class="item-main">
        <text class="item-name">{{ item.name }}</text>
        <text class="item-desc">{{ item.desc }}</text>
      </view>
      <view class="item-right">
        <text class="item-cost">{{ item.cost }} 积分</text>
        <button
          :class="['item-btn', 'btn-bounce', pointsTotal < item.cost ? 'disabled' : '']"
          size="mini"
          :disabled="pointsTotal < item.cost || exchanging"
          @tap="doExchange(item)"
        >
          兑换
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { getMyPoints, getExchangeItems, exchangePoints } from "@/utils/points-service";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      pointsTotal: 0,
      items: [],
      exchanging: false
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; }
  },

  onShow() {
    if (!this.isLogin) {
      uni.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => uni.navigateTo({ url: "/pages/login/login" }), 300);
      return;
    }
    this.loadData();
  },

  methods: {
    async loadData() {
      const data = await getMyPoints().catch(() => ({ total: 0 }));
      this.pointsTotal = data.total || 0;
      this.items = getExchangeItems();
    },

    async doExchange(item) {
      if (this.pointsTotal < item.cost || this.exchanging) return;
      this.exchanging = true;
      try {
        await exchangePoints(item.id);
        uni.showToast({ title: "兑换成功", icon: "success" });
        this.pointsTotal -= item.cost;
      } catch (error) {
        showError(error, { title: "兑换失败" });
      } finally {
        this.exchanging = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.exchange-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(255, 248, 238, 0.5) 0%, rgba(248, 252, 255, 0.4) 100%);
}
.page-orbs { pointer-events: none; }
.banner {
  padding: 28rpx;
  background: linear-gradient(140deg, rgba(255, 248, 238, 0.98), rgba(255, 252, 248, 0.98)), #fff;
  border: 1rpx solid #f5e3cc;
}
.banner-label { color: #647188; font-size: 24rpx; }
.banner-total { color: #1a2540; font-size: 56rpx; font-weight: 800; margin-top: 8rpx; }
.section-head { margin: 28rpx 0 16rpx; }
.section-title { color: #1a2540; font-size: 30rpx; font-weight: 800; }
.item-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 14rpx;
  gap: 20rpx;
}
.item-icon { font-size: 44rpx; width: 72rpx; text-align: center; }
.item-main { flex: 1; min-width: 0; }
.item-name { display: block; color: #1f2636; font-size: 28rpx; font-weight: 600; }
.item-desc { display: block; color: #8a96a8; font-size: 22rpx; margin-top: 6rpx; }
.item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; }
.item-cost { color: #f5a623; font-size: 24rpx; font-weight: 600; }
.item-btn {
  margin: 0;
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  border: none;
  background: linear-gradient(135deg, #13c2a3, #0d8c5c);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}
.item-btn.disabled { background: #e5ebf8; color: #8a96a8; }
.item-btn::after { border: none; }
</style>
