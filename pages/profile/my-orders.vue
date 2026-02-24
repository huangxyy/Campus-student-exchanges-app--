<template>
  <view class="my-orders-page">
    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-title">📋 我的订单</view>
      <view class="banner-desc">查看交易进度，确认收货与评价</view>
    </view>

    <view class="tab-row anim-fade-in anim-d1">
      <text
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', currentTab === tab.value ? 'active' : '']"
        @tap="currentTab = tab.value"
      >{{ tab.label }}</text>
    </view>

    <empty-state
      v-if="filteredList.length === 0 && !loading"
      title="暂无订单"
      description="交易后订单会出现在这里"
    />

    <view
      v-for="(item, idx) in filteredList"
      :key="item.id"
      :class="['order-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 1)) : '']"
      style="border-radius: 22rpx;"
      @tap="goOrderDetail(item.id)"
    >
      <view class="order-head">
        <view class="order-title">{{ item.productTitle || '商品交易' }}</view>
        <text :class="['status-chip', item.status]">{{ getStatusText(item.status) }}</text>
      </view>
      <view class="order-meta">
        <text>¥{{ item.productPrice }}</text>
        <text>{{ isBuyer(item) ? '卖家：' + item.sellerName : '买家：' + item.buyerName }}</text>
        <text>{{ formatTime(item.createdAt) }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-text">加载中...</view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { listMyOrders, getOrderStatusText } from "@/utils/order-service";

export default {
  components: { EmptyState },

  data() {
    return {
      list: [],
      loading: false,
      currentTab: "all",
      tabs: [
        { label: "全部", value: "all" },
        { label: "进行中", value: "active" },
        { label: "已完成", value: "completed" },
        { label: "已取消", value: "cancelled" }
      ]
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    myUserId() { return this.userStore.profile?.userId || ""; },

    filteredList() {
      if (this.currentTab === "all") {
        return this.list;
      }
      if (this.currentTab === "active") {
        return this.list.filter((item) => !["completed", "cancelled"].includes(item.status));
      }
      return this.list.filter((item) => item.status === this.currentTab);
    }
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().finally(() => uni.stopPullDownRefresh());
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },
    getStatusText(status) { return getOrderStatusText(status); },
    isBuyer(item) { return item.buyerId === this.myUserId; },

    async loadList() {
      this.loading = true;
      try {
        this.list = await listMyOrders().catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    goOrderDetail(orderId) {
      uni.navigateTo({ url: `/pages/orders/detail?id=${orderId}` });
    }
  }
};
</script>

<style lang="scss" scoped>
.my-orders-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  background: $page-bg;
}
.banner {
  position: relative;
  padding: 24rpx;
  margin-bottom: 4rpx;
  overflow: hidden;
}
.banner-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.08), transparent);
  pointer-events: none;
}
.banner-title { position: relative; color: #1a2540; font-size: 34rpx; font-weight: 800; }
.banner-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; }
.tab-row { margin: 16rpx 4rpx 10rpx; display: flex; gap: 10rpx; }
.tab {
  padding: 12rpx 22rpx; border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7); color: #5f708e; font-size: 23rpx; font-weight: 600;
  border: 1rpx solid rgba(228, 235, 251, 0.5); transition: all 0.25s ease;
}
.tab.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5); color: #fff;
  border-color: transparent; box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.25);
}
.order-card { margin-bottom: 14rpx; padding: 22rpx; }
.order-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.order-title { color: #1f2430; font-size: 29rpx; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-chip { font-size: 20rpx; border-radius: 999rpx; padding: 6rpx 16rpx; flex-shrink: 0; }
.status-chip.pending { background: #eaf2ff; color: #2f6bff; }
.status-chip.meet_confirmed, .status-chip.paid_confirmed, .status-chip.received_confirmed { background: #fff4df; color: #bd7b16; }
.status-chip.completed { background: #e8f7ef; color: #238a57; }
.status-chip.cancelled { background: #f4f5f8; color: #7d879b; }
.order-meta { margin-top: 10rpx; display: flex; align-items: center; gap: 16rpx; color: #8a93a7; font-size: 22rpx; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
