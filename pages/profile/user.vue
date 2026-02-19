<template>
  <view class="user-page">
    <view v-if="loading" class="loading">加载用户信息...</view>

    <template v-else>
      <view class="hero card anim-slide-down">
        <view class="hero-top">
          <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ (userInfo.nickName || '?')[0] }}</view>
          <view class="hero-info">
            <view class="hero-name">{{ userInfo.nickName || '校园用户' }}</view>
            <view class="hero-id">ID: {{ userId.slice(-8) }}</view>
          </view>
        </view>
        <view v-if="trustScore > 0" class="trust-row">
          <text class="trust-icon">{{ trustLevel.icon || '⭐' }}</text>
          <text class="trust-text" :style="{ color: trustLevel.color }">{{ trustLevel.level }} {{ trustScore }}分</text>
          <text v-if="taskStats && taskStats.helperTag" class="helper-tag">{{ taskStats.helperTag }}</text>
        </view>
        <view class="stats-row">
          <view class="stat-block">
            <view class="stat-num">{{ stats.productCount || 0 }}</view>
            <view class="stat-label">商品</view>
          </view>
          <view class="stat-block">
            <view class="stat-num">{{ stats.orderCount || 0 }}</view>
            <view class="stat-label">完成</view>
          </view>
          <view class="stat-block">
            <view class="stat-num">{{ stats.taskCount || 0 }}</view>
            <view class="stat-label">任务</view>
          </view>
          <view class="stat-block">
            <view class="stat-num">{{ stats.feedCount || 0 }}</view>
            <view class="stat-label">动态</view>
          </view>
        </view>
      </view>

      <view class="section card anim-slide-up anim-d1" v-if="products.length > 0">
        <view class="section-title">在售商品</view>
        <view v-for="p in products" :key="p.id" class="item-row" @tap="goProduct(p.id)">
          <text class="item-title">{{ p.title }}</text>
          <text class="item-price">¥{{ p.price }}</text>
        </view>
      </view>

      <view class="section card anim-slide-up anim-d2" v-if="feeds.length > 0">
        <view class="section-title">最近动态</view>
        <view v-for="f in feeds" :key="f.id" class="item-row" @tap="goFeed(f.id)">
          <text class="item-title">{{ f.content.slice(0, 40) }}{{ f.content.length > 40 ? '...' : '' }}</text>
        </view>
      </view>

      <view class="actions anim-slide-up anim-d3" v-if="!isSelf">
        <button class="chat-btn btn-bounce" @tap="goChat">发消息</button>
        <button class="report-btn btn-bounce" @tap="reportUser">举报用户</button>
      </view>
    </template>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { createOrGetConversationByProduct } from "@/utils/chat-service";
import { getCloudDatabase } from "@/utils/cloud";
import { queryProductsByUser } from "@/utils/product-service";
import { listMyTasks, getTaskUserStats } from "@/utils/task-service";
import { getTrustScore, getTrustLevel } from "@/utils/trust-service";
import { submitReport, REPORT_REASONS } from "@/utils/report-service";

export default {
  data() {
    return {
      userId: "",
      userInfo: {},
      stats: {},
      products: [],
      feeds: [],
      loading: false,
      trustScore: 0,
      trustLevel: { level: "", color: "#8a93a7", icon: "" },
      taskStats: null
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    myUserId() { return this.userStore.profile?.userId || ""; },
    isSelf() { return this.userId === this.myUserId; }
  },

  onLoad(query) {
    this.userId = query.id || "";
    this.loadUser();
  },

  methods: {
    async loadUser() {
      if (!this.userId) { return; }
      this.loading = true;
      try {
        // 尝试云端加载用户信息
        const db = getCloudDatabase();
        if (db) {
          const userRes = await db.collection("users").where({ userId: this.userId }).limit(1).get().catch(() => null);
          if (userRes && userRes.data && userRes.data[0]) {
            this.userInfo = userRes.data[0];
          }

          const feedRes = await db.collection("feeds").where({ authorId: this.userId, status: "active" }).orderBy("createdAt", "desc").limit(5).get().catch(() => null);
          this.feeds = (feedRes && feedRes.data) || [];
        }

        // 使用标准 service 加载商品和任务（自动支持本地回退）
        const [productRes, taskStats] = await Promise.all([
          queryProductsByUser(this.userId, { page: 1, pageSize: 5 }).catch(() => ({ list: [], total: 0 })),
          getTaskUserStats(this.userId).catch(() => null)
        ]);

        this.products = (productRes.list || []).filter((p) => p.status === "available");
        this.taskStats = taskStats;

        this.stats = {
          productCount: productRes.total || 0,
          orderCount: taskStats ? taskStats.publishedCompletedCount + taskStats.acceptedCompletedCount : 0,
          taskCount: taskStats ? taskStats.publishedCount + taskStats.acceptedCount : 0,
          feedCount: this.feeds.length
        };

        // 加载信用分
        const trustRecord = await getTrustScore(this.userId).catch(() => null);
        if (trustRecord) {
          this.trustScore = trustRecord.score;
          this.trustLevel = getTrustLevel(trustRecord.score);
        }

        // 如果自己的页面，用本地 profile 填充
        if (this.isSelf && this.userStore.profile) {
          if (!this.userInfo.nickName) {
            this.userInfo = {
              nickName: this.userStore.profile.nickName || "校园用户",
              avatar: this.userStore.profile.avatar || "",
              userId: this.userId
            };
          }
        }

        if (!this.userInfo.nickName) {
          this.userInfo = { nickName: "校园用户", avatar: "", userId: this.userId };
        }
      } finally {
        this.loading = false;
      }
    },

    goProduct(id) {
      uni.navigateTo({ url: `/pages/products/detail?id=${id}` });
    },

    goFeed(id) {
      uni.navigateTo({ url: `/pages/feeds/detail?id=${id}` });
    },

    reportUser() {
      if (!this.myUserId) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.showActionSheet({
        itemList: REPORT_REASONS.map((r) => r.label),
        success: async (res) => {
          const reason = REPORT_REASONS[res.tapIndex];
          if (!reason) { return; }
          await submitReport({
            targetType: "user",
            targetId: this.userId,
            reason: reason.value,
            detail: `举报用户: ${this.userInfo.nickName || this.userId}`
          }).catch(() => null);
          uni.showToast({ title: "举报已提交", icon: "none" });
        }
      });
    },

    async goChat() {
      if (!this.myUserId) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      try {
        const conversation = await createOrGetConversationByProduct({
          productId: `user:${this.userId}`,
          productTitle: `与${this.userInfo.nickName || '用户'}的会话`,
          peerId: this.userId,
          peerName: this.userInfo.nickName || "校园用户",
          peerAvatar: this.userInfo.avatar || "",
          topicType: "private"
        });
        uni.navigateTo({ url: `/pages/chat/detail?conversationId=${conversation.id}` });
      } catch (error) {
        uni.showToast({ title: "打开会话失败", icon: "none" });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.user-page {
  padding: 24rpx; padding-bottom: 160rpx;
  background: radial-gradient(circle at 50% 0%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 60%), #f2f5fb;
}
.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }
.hero { padding: 26rpx; }
.hero-top { display: flex; align-items: center; gap: 18rpx; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0; }
.avatar-placeholder {
  width: 100rpx; height: 100rpx; border-radius: 50%; background: #dfe6f5; color: #2f6bff;
  display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; flex-shrink: 0;
}
.hero-info { flex: 1; }
.hero-name { color: #1f2430; font-size: 32rpx; font-weight: 700; }
.hero-id { color: #8a93a7; font-size: 22rpx; margin-top: 4rpx; }
.stats-row { margin-top: 20rpx; display: flex; justify-content: space-around; }
.stat-block { text-align: center; }
.stat-num { color: #1f2430; font-size: 30rpx; font-weight: 700; }
.stat-label { color: #8a93a7; font-size: 20rpx; margin-top: 4rpx; }
.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 27rpx; font-weight: 600; margin-bottom: 14rpx; }
.item-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f0f2f8; }
.item-row:last-child { border-bottom: none; }
.item-title { flex: 1; color: #2b3345; font-size: 25rpx; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-price { color: #e74a62; font-size: 24rpx; font-weight: 700; flex-shrink: 0; margin-left: 12rpx; }
.trust-row {
  margin-top: 14rpx; display: flex; align-items: center; gap: 10rpx;
  padding: 10rpx 16rpx; background: rgba(255, 255, 255, 0.7); border-radius: 12rpx;
}
.trust-icon { font-size: 24rpx; }
.trust-text { font-size: 23rpx; font-weight: 600; }
.helper-tag {
  font-size: 20rpx; background: #eaf8f2; color: #23885f; border-radius: 999rpx;
  padding: 4rpx 12rpx;
}
.actions { margin-top: 20rpx; display: flex; gap: 12rpx; }
.chat-btn {
  flex: 1; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6); color: #fff; font-size: 30rpx; font-weight: 600;
}
.chat-btn::after { border: none; }
.report-btn {
  width: 180rpx; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; border: none;
  background: #f4f5f8; color: #8a93a7; font-size: 26rpx;
}
.report-btn::after { border: none; }
</style>
