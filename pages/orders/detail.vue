<template>
  <view class="order-detail-page">
    <view v-if="loading" class="loading">加载订单详情中...</view>

    <empty-state
      v-else-if="!order"
      title="订单不存在"
      description="可能已被删除或链接失效"
      action-text="返回我的订单"
      @action="goBack"
    />

    <template v-else>
      <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
        <view class="head">
          <view class="title">{{ order.productTitle || '商品交易' }}</view>
          <view class="price">¥{{ order.productPrice }}</view>
        </view>
        <view class="status-row">
          <text :class="['status-chip', order.status]">{{ statusText }}</text>
          <text class="time">创建于 {{ formatTime(order.createdAt) }}</text>
        </view>
      </view>

      <view v-if="guideText" class="guide-bar glass anim-slide-up anim-d1" style="border-radius: 18rpx;">
        <text class="guide-icon">💡</text>
        <text class="guide-text">{{ guideText }}</text>
      </view>

      <view v-if="countdownText" class="countdown-bar glass anim-fade-in anim-d1" style="border-radius: 18rpx;">
        <text class="countdown-icon">⏱</text>
        <text class="countdown-text">{{ countdownText }}</text>
      </view>

      <view class="section glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
        <view class="section-title">交易双方</view>
        <view class="line"><text class="k">买家</text><text class="v">{{ order.buyerName }}</text></view>
        <view class="line"><text class="k">卖家</text><text class="v">{{ order.sellerName }}</text></view>
      </view>

      <view class="section glass-strong anim-slide-up anim-d2" style="border-radius: 24rpx;">
        <view class="section-title">交易进度</view>
        <view class="timeline">
          <view :class="['step', order.createdAt ? 'done' : '']">
            <view class="dot"></view>
            <view class="step-text">下单</view>
            <view class="step-time" v-if="order.createdAt">{{ formatTime(order.createdAt) }}</view>
          </view>
          <view :class="['step', order.meetConfirmedAt ? 'done' : '']">
            <view class="dot"></view>
            <view class="step-text">约见确认</view>
            <view class="step-time" v-if="order.meetConfirmedAt">{{ formatTime(order.meetConfirmedAt) }}</view>
          </view>
          <view :class="['step', order.paidConfirmedAt ? 'done' : '']">
            <view class="dot"></view>
            <view class="step-text">卖家确认收款</view>
            <view class="step-time" v-if="order.paidConfirmedAt">{{ formatTime(order.paidConfirmedAt) }}</view>
          </view>
          <view :class="['step', order.receivedConfirmedAt ? 'done' : '']">
            <view class="dot"></view>
            <view class="step-text">买家确认收货</view>
            <view class="step-time" v-if="order.receivedConfirmedAt">{{ formatTime(order.receivedConfirmedAt) }}</view>
          </view>
          <view :class="['step', order.completedAt ? 'done' : '']">
            <view class="dot"></view>
            <view class="step-text">交易完成</view>
            <view class="step-time" v-if="order.completedAt">{{ formatTime(order.completedAt) }}</view>
          </view>
        </view>
      </view>

      <view class="section glass-strong anim-slide-up anim-d3" style="border-radius: 24rpx;" v-if="reviews.length > 0">
        <view class="section-title">评价</view>
        <view v-for="r in reviews" :key="r.id" class="review-item">
          <view class="review-head">
            <text class="review-name">{{ r.anonymous ? '匿名用户' : r.fromUserName }}</text>
            <text class="review-score">{{ '★'.repeat(r.score) }}</text>
          </view>
          <view class="review-content">{{ r.content || '该用户未填写评价内容' }}</view>
        </view>
      </view>

      <view class="actions" v-if="showAnyAction">
        <button v-if="showMeetConfirmAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('meet_confirmed')">
          确认约见
        </button>
        <button v-if="showPaidConfirmAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('paid_confirmed')">
          确认收款
        </button>
        <button v-if="showReceivedConfirmAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('received_confirmed')">
          确认收货
        </button>
        <button v-if="showCompleteAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('completed')">
          完成交易
        </button>
        <button v-if="showReviewAction" class="ui-btn ui-btn-secondary action-btn" @tap="showReviewDialog = true">
          去评价
        </button>
        <button v-if="showCancelAction" class="ui-btn ui-btn-danger action-btn" :loading="submitting" @tap="handleCancel">
          取消订单
        </button>
      </view>

      <!-- 评价弹窗 -->
      <view v-if="showReviewDialog" class="review-mask" @tap="showReviewDialog = false">
        <view class="review-dialog glass-strong anim-scale-in" style="border-radius: 28rpx;" @tap.stop>
          <view class="dialog-title">评价本次交易</view>
          <view class="score-row">
            <text
              v-for="s in 5"
              :key="s"
              :class="['star', s <= reviewForm.score ? 'active' : '']"
              @tap="reviewForm.score = s"
            >★</text>
          </view>
          <textarea v-model.trim="reviewForm.content" class="review-textarea" maxlength="200" placeholder="写点评价吧（可选）" />
          <view class="anon-row">
            <switch :checked="reviewForm.anonymous" @change="reviewForm.anonymous = $event.detail.value" color="#2f6bff" />
            <text class="anon-label">匿名评价</text>
          </view>
          <button class="dialog-btn" :loading="reviewSubmitting" @tap="submitOrderReview">提交评价</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { getOrder, updateOrderStatus, getOrderStatusText, submitReview, getOrderReviews, CANCEL_REASONS } from "@/utils/order-service";

export default {
  components: { EmptyState },

  data() {
    return {
      orderId: "",
      order: null,
      reviews: [],
      loading: false,
      submitting: false,
      showReviewDialog: false,
      reviewSubmitting: false,
      now: Date.now(),
      countdownTimer: null,
      reviewForm: {
        score: 5,
        content: "",
        anonymous: false
      }
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    myUserId() { return this.userStore.profile?.userId || ""; },
    isBuyer() { return this.order && this.order.buyerId === this.myUserId; },
    isSeller() { return this.order && this.order.sellerId === this.myUserId; },
    statusText() { return getOrderStatusText(this.order?.status); },

    hasReviewed() {
      return this.reviews.some((r) => r.fromUserId === this.myUserId);
    },

    guideText() {
      if (!this.order) { return ""; }
      const s = this.order.status;
      if (s === "pending" && this.isBuyer) {
        return "请与卖家约定面交时间和地点，确认后点击「确认约见」";
      }
      if (s === "pending" && this.isSeller) {
        return "买家已下单，请与买家沟通面交安排，双方均可确认约见";
      }
      if (s === "meet_confirmed" && this.isSeller) {
        return "见面交易时，请当面收款后点击「确认收款」";
      }
      if (s === "meet_confirmed" && this.isBuyer) {
        return "等待卖家确认收款，请准备好付款";
      }
      if (s === "paid_confirmed" && this.isBuyer) {
        return "卖家已确认收款，请验收商品后点击「确认收货」";
      }
      if (s === "paid_confirmed" && this.isSeller) {
        return "你已确认收款，等待买家确认收货";
      }
      if (s === "received_confirmed") {
        return "买家已确认收货，任一方点击「完成交易」即可结单";
      }
      if (s === "completed" && !this.hasReviewed) {
        return "交易已完成，别忘了给对方一个评价";
      }
      if (s === "cancelled" && this.order.cancelReason) {
        const by = this.order.cancelledBy === this.myUserId ? "你" : (this.order.cancelledBy === "system" ? "系统" : "对方");
        return `订单已取消（${by}：${this.order.cancelReason}）`;
      }
      return "";
    },

    countdownText() {
      if (!this.order || !this.order.expireAt) { return ""; }
      if (!["pending", "meet_confirmed"].includes(this.order.status)) { return ""; }
      const diff = Number(this.order.expireAt) - this.now;
      if (diff <= 0) { return "订单已超时"; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      return `剩余 ${hours} 小时 ${minutes} 分钟自动取消`;
    },

    showMeetConfirmAction() {
      return this.order && this.order.status === "pending" && (this.isBuyer || this.isSeller);
    },
    showPaidConfirmAction() {
      return this.order && this.order.status === "meet_confirmed" && this.isSeller;
    },
    showReceivedConfirmAction() {
      return this.order && this.order.status === "paid_confirmed" && this.isBuyer;
    },
    showCompleteAction() {
      return this.order && this.order.status === "received_confirmed" && (this.isBuyer || this.isSeller);
    },
    showReviewAction() {
      return this.order && this.order.status === "completed" && !this.hasReviewed;
    },
    showCancelAction() {
      return this.order && ["pending", "meet_confirmed", "paid_confirmed"].includes(this.order.status) && (this.isBuyer || this.isSeller);
    },
    showAnyAction() {
      return this.showMeetConfirmAction || this.showPaidConfirmAction || this.showReceivedConfirmAction ||
        this.showCompleteAction || this.showReviewAction || this.showCancelAction;
    }
  },

  onLoad(query) {
    this.orderId = query.id || "";
    this.loadOrder();
  },

  onShow() {
    this.startCountdown();
  },

  onHide() {
    this.stopCountdown();
  },

  onUnload() {
    this.stopCountdown();
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    startCountdown() {
      this.now = Date.now();
      this.countdownTimer = setInterval(() => { this.now = Date.now(); }, 30000);
    },

    stopCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    },

    async loadOrder() {
      if (!this.orderId) {
        return;
      }
      this.loading = true;
      try {
        this.order = await getOrder(this.orderId);
        this.reviews = await getOrderReviews(this.orderId).catch(() => []);
      } finally {
        this.loading = false;
      }
    },

    async changeStatus(status) {
      if (this.submitting) {
        return;
      }
      this.submitting = true;
      try {
        const ok = await updateOrderStatus(this.orderId, status);
        if (!ok) {
          uni.showToast({ title: "操作失败，请刷新", icon: "none" });
          return;
        }
        uni.showToast({ title: "操作成功", icon: "success" });
        this.loadOrder();
      } finally {
        this.submitting = false;
      }
    },

    handleCancel() {
      const isPaid = this.order && this.order.status === "paid_confirmed";
      const labels = CANCEL_REASONS.map((r) => r.label);
      uni.showActionSheet({
        itemList: labels,
        success: (res) => {
          const reason = CANCEL_REASONS[res.tapIndex];
          if (!reason) { return; }

          const confirmContent = isPaid
            ? `付款后取消将影响你的信用分。\n取消原因：${reason.label}\n确定取消吗？`
            : `取消原因：${reason.label}\n确定取消订单吗？`;

          uni.showModal({
            title: "确认取消订单",
            content: confirmContent,
            confirmText: "确认取消",
            confirmColor: "#e74a62",
            success: async (modalRes) => {
              if (!modalRes.confirm) { return; }
              this.submitting = true;
              try {
                const ok = await updateOrderStatus(this.orderId, "cancelled", { cancelReason: reason.label });
                if (!ok) {
                  uni.showToast({ title: "取消失败，请刷新", icon: "none" });
                  return;
                }
                uni.showToast({ title: "订单已取消", icon: "none" });
                this.loadOrder();
              } finally {
                this.submitting = false;
              }
            }
          });
        }
      });
    },

    async submitOrderReview() {
      if (this.reviewSubmitting) {
        return;
      }
      const toUserId = this.isBuyer ? this.order.sellerId : this.order.buyerId;
      const toUserName = this.isBuyer ? this.order.sellerName : this.order.buyerName;

      this.reviewSubmitting = true;
      try {
        await submitReview({
          orderId: this.orderId,
          toUserId,
          toUserName,
          score: this.reviewForm.score,
          content: this.reviewForm.content,
          anonymous: this.reviewForm.anonymous
        });
        uni.showToast({ title: "评价成功", icon: "success" });
        this.showReviewDialog = false;
        this.loadOrder();
      } catch (error) {
        const msg = error?.message === "Already reviewed" ? "你已经评价过了" : "评价失败";
        uni.showToast({ title: msg, icon: "none" });
      } finally {
        this.reviewSubmitting = false;
      }
    },

    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.order-detail-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 182rpx;
  min-height: 100vh;
  background: $page-bg;
}

.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }

.guide-bar {
  margin-bottom: 14rpx;
  padding: 18rpx 22rpx;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.guide-icon { font-size: 24rpx; flex-shrink: 0; margin-top: 2rpx; }
.guide-text { color: #3a5080; font-size: 24rpx; line-height: 1.6; flex: 1; }

.countdown-bar {
  margin-bottom: 14rpx;
  padding: 14rpx 22rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: rgba(245, 166, 35, 0.06) !important;
  border-color: rgba(245, 166, 35, 0.15) !important;
}
.countdown-icon { font-size: 22rpx; }
.countdown-text { color: #b07c1a; font-size: 24rpx; font-weight: 600; }

.hero { position: relative; padding: 28rpx; overflow: hidden; }
.head { display: flex; justify-content: space-between; gap: 18rpx; }
.title { flex: 1; color: #1a2540; font-size: 34rpx; font-weight: 800; line-height: 1.5; }
.price {
  color: #e74a62; font-size: 32rpx; font-weight: 800;
  background: linear-gradient(135deg, #fff0f2, #ffedf1);
  padding: 6rpx 18rpx; border-radius: 999rpx; flex-shrink: 0;
}
.status-row { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.time { color: #7f8a9f; font-size: 22rpx; }
.status-chip { font-size: 20rpx; border-radius: 999rpx; padding: 6rpx 16rpx; }
.status-chip.pending { background: #eaf2ff; color: #2f6bff; }
.status-chip.meet_confirmed, .status-chip.paid_confirmed, .status-chip.received_confirmed { background: #fff4df; color: #bd7b16; }
.status-chip.completed { background: #e8f7ef; color: #238a57; }
.status-chip.cancelled { background: #f4f5f8; color: #7d879b; }

.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 27rpx; font-weight: 600; }
.line { margin-top: 14rpx; display: flex; align-items: center; justify-content: space-between; }
.k { color: #76839a; font-size: 23rpx; }
.v { color: #273246; font-size: 23rpx; }

.timeline { margin-top: 16rpx; padding-left: 6rpx; }
.step { display: flex; align-items: flex-start; gap: 14rpx; padding-bottom: 20rpx; position: relative; padding-left: 28rpx; }
.step::before {
  content: ""; position: absolute; left: 8rpx; top: 22rpx; bottom: 0; width: 2rpx; background: #e0e6f0;
}
.step:last-child::before { display: none; }
.dot {
  position: absolute; left: 0; top: 6rpx; width: 20rpx; height: 20rpx; border-radius: 50%;
  background: #d0d7e5; border: 3rpx solid #fff;
  transition: all 0.3s ease;
}
.step.done .dot { background: linear-gradient(135deg, #2f6bff, #5b8af5); box-shadow: 0 2rpx 8rpx rgba(47, 107, 255, 0.3); }
.step-text { color: #6a7e9a; font-size: 24rpx; }
.step.done .step-text { color: #1a2540; font-weight: 600; }
.step-time { margin-left: auto; color: #8a93a7; font-size: 20rpx; flex-shrink: 0; }

.review-item { margin-top: 14rpx; padding: 14rpx; background: #f8f9fc; border-radius: 12rpx; }
.review-head { display: flex; align-items: center; justify-content: space-between; }
.review-name { color: #4f5d75; font-size: 23rpx; }
.review-score { color: #f5a623; font-size: 22rpx; }
.review-content { margin-top: 8rpx; color: #6e7b92; font-size: 23rpx; line-height: 1.5; }

.actions {
  position: fixed; left: 0; right: 0; bottom: 0;
  padding: 16rpx 20rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex; flex-wrap: wrap; gap: 10rpx;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24rpx); -webkit-backdrop-filter: blur(24rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow: 0 -4rpx 20rpx rgba(31, 38, 66, 0.05);
  z-index: 100;
}
.action-btn { flex: 1; }

.review-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(10, 18, 38, 0.5);
  backdrop-filter: blur(8rpx); -webkit-backdrop-filter: blur(8rpx);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.review-dialog { width: 620rpx; padding: 36rpx; }
.dialog-title { color: #1a2540; font-size: 32rpx; font-weight: 800; text-align: center; }
.score-row { margin-top: 24rpx; display: flex; justify-content: center; gap: 16rpx; }
.star { font-size: 48rpx; color: #d0d7e5; transition: color 0.2s ease, transform 0.2s ease; }
.star.active { color: #f5a623; transform: scale(1.1); }
.review-textarea {
  margin-top: 20rpx; width: 100%; min-height: 160rpx; padding: 18rpx;
  border-radius: 16rpx;
  background: rgba(238, 242, 251, 0.6); border: 1rpx solid rgba(228, 235, 251, 0.5);
  font-size: 26rpx; color: #2b3448; box-sizing: border-box; line-height: 1.7;
}
.anon-row { margin-top: 18rpx; display: flex; align-items: center; gap: 10rpx; }
.anon-label { color: #5a6a88; font-size: 24rpx; }
.dialog-btn {
  margin-top: 24rpx; width: 100%; height: 84rpx; line-height: 84rpx; border-radius: 42rpx; border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6); color: #fff; font-size: 28rpx; font-weight: 700;
  box-shadow: 0 6rpx 20rpx rgba(47, 107, 255, 0.3);
}
.dialog-btn::after { border: none; }
</style>
