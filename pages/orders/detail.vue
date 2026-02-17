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
      <view class="hero card anim-slide-down">
        <view class="head">
          <view class="title">{{ order.productTitle || '商品交易' }}</view>
          <view class="price">¥{{ order.productPrice }}</view>
        </view>
        <view class="status-row">
          <text :class="['status-chip', order.status]">{{ statusText }}</text>
          <text class="time">创建于 {{ formatTime(order.createdAt) }}</text>
        </view>
      </view>

      <view class="section card anim-slide-up anim-d1">
        <view class="section-title">交易双方</view>
        <view class="line"><text class="k">买家</text><text class="v">{{ order.buyerName }}</text></view>
        <view class="line"><text class="k">卖家</text><text class="v">{{ order.sellerName }}</text></view>
      </view>

      <view class="section card anim-slide-up anim-d2">
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

      <view class="section card anim-slide-up anim-d3" v-if="reviews.length > 0">
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
        <button v-if="showCancelAction" class="ui-btn ui-btn-danger action-btn" :loading="submitting" @tap="changeStatus('cancelled')">
          取消订单
        </button>
      </view>

      <!-- 评价弹窗 -->
      <view v-if="showReviewDialog" class="review-mask" @tap="showReviewDialog = false">
        <view class="review-dialog card" @tap.stop>
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
import { getOrder, updateOrderStatus, getOrderStatusText, submitReview, getOrderReviews } from "@/utils/order-service";

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

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

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
  padding: 22rpx;
  padding-bottom: 182rpx;
  background: radial-gradient(circle at 8% 4%, rgba(47, 107, 255, 0.1), rgba(47, 107, 255, 0)), #f5f7fc;
}

.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }

.hero { padding: 22rpx; background: linear-gradient(140deg, rgba(237, 242, 255, 0.96), rgba(248, 250, 255, 0.98)), #ffffff; border: 1rpx solid #e1ebff; }
.head { display: flex; justify-content: space-between; gap: 18rpx; }
.title { flex: 1; color: #1f2430; font-size: 32rpx; font-weight: 700; line-height: 1.5; }
.price { color: #e74a62; font-size: 30rpx; font-weight: 700; }
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
  position: absolute; left: 0; top: 6rpx; width: 18rpx; height: 18rpx; border-radius: 50%;
  background: #d0d7e5; border: 3rpx solid #fff;
}
.step.done .dot { background: #2f6bff; }
.step-text { color: #4f5d75; font-size: 24rpx; }
.step.done .step-text { color: #1f2430; font-weight: 600; }
.step-time { margin-left: auto; color: #8a93a7; font-size: 20rpx; flex-shrink: 0; }

.review-item { margin-top: 14rpx; padding: 14rpx; background: #f8f9fc; border-radius: 12rpx; }
.review-head { display: flex; align-items: center; justify-content: space-between; }
.review-name { color: #4f5d75; font-size: 23rpx; }
.review-score { color: #f5a623; font-size: 22rpx; }
.review-content { margin-top: 8rpx; color: #6e7b92; font-size: 23rpx; line-height: 1.5; }

.actions {
  position: fixed; left: 0; right: 0; bottom: 0; padding: 16rpx 20rpx 24rpx;
  display: flex; flex-wrap: wrap; gap: 10rpx; background: rgba(255, 255, 255, 0.96); border-top: 1rpx solid #e8edf5;
}
.action-btn { flex: 1; }

.review-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.review-dialog { width: 600rpx; padding: 30rpx; }
.dialog-title { color: #1f2430; font-size: 30rpx; font-weight: 700; text-align: center; }
.score-row { margin-top: 20rpx; display: flex; justify-content: center; gap: 12rpx; }
.star { font-size: 44rpx; color: #d0d7e5; }
.star.active { color: #f5a623; }
.review-textarea {
  margin-top: 16rpx; width: 100%; min-height: 140rpx; padding: 14rpx; border-radius: 12rpx;
  background: #f6f8fc; border: 1rpx solid #e5ebf8; font-size: 26rpx; color: #2b3345; box-sizing: border-box;
}
.anon-row { margin-top: 14rpx; display: flex; align-items: center; gap: 10rpx; }
.anon-label { color: #6e7b92; font-size: 24rpx; }
.dialog-btn {
  margin-top: 20rpx; width: 100%; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6); color: #fff; font-size: 28rpx; font-weight: 600;
}
.dialog-btn::after { border: none; }
</style>
