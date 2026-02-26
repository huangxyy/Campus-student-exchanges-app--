<template>
  <view class="user-page">
    <view v-if="loading" class="loading">加载用户信息...</view>

    <template v-else>
      <view class="hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
        <view class="hero-deco"></view>
        <view class="hero-top">
          <view class="avatar-container">
            <view class="avatar-ring-outer">
              <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar" mode="aspectFill" />
              <view v-else class="avatar-placeholder">{{ (userInfo.nickName || '?')[0] }}</view>
            </view>
          </view>
          <view class="hero-info">
            <view class="hero-name">{{ userInfo.nickName || '校园用户' }}</view>
            <view class="hero-id">ID: {{ userId.slice(-8) }}</view>
          </view>
        </view>
        <view v-if="trustScore > 0" class="trust-row">
          <text class="trust-icon">{{ trustLevel.icon || '⭐' }}</text>
          <view class="trust-detail">
            <view class="trust-top">
              <text class="trust-text" :style="{ color: trustLevel.color }">{{ trustLevel.level }}</text>
              <text class="trust-score">{{ trustScore }}分</text>
            </view>
            <view class="trust-bar">
              <view class="trust-fill" :style="{ width: Math.min(100, trustScore) + '%', background: trustLevel.color }"></view>
            </view>
          </view>
          <text v-if="taskStats && taskStats.helperTag" class="helper-tag">{{ taskStats.helperTag }}</text>
        </view>
        <view class="stats-row">
          <view class="stat-block anim-count" v-for="stat in statItems" :key="stat.label">
            <view class="stat-num num-animate">{{ stat.value }}</view>
            <view class="stat-label">{{ stat.label }}</view>
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
import { showError } from "@/utils/error-handler";

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
    isSelf() { return this.userId === this.myUserId; },
    statItems() {
      return [
        { value: this.stats.productCount || 0, label: "商品" },
        { value: this.stats.orderCount || 0, label: "完成" },
        { value: this.stats.taskCount || 0, label: "任务" },
        { value: this.stats.feedCount || 0, label: "动态" }
      ];
    }
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
        const [userInfo, feedList, productRes, taskStats, trustRecord] = await Promise.all([
          this.fetchUserInfo(),
          this.fetchUserFeeds(),
          queryProductsByUser(this.userId, { page: 1, pageSize: 5 }).catch(() => ({ list: [], total: 0 })),
          getTaskUserStats(this.userId).catch(() => null),
          getTrustScore(this.userId).catch(() => null)
        ]);

        if (userInfo) { this.userInfo = userInfo; }
        this.feeds = feedList;
        this.products = (productRes.list || []).filter((p) => p.status === "available");
        this.taskStats = taskStats;

        this.stats = {
          productCount: productRes.total || 0,
          orderCount: taskStats ? taskStats.publishedCompletedCount + taskStats.acceptedCompletedCount : 0,
          taskCount: taskStats ? taskStats.publishedCount + taskStats.acceptedCount : 0,
          feedCount: feedList.length
        };

        if (trustRecord) {
          this.trustScore = trustRecord.score;
          this.trustLevel = getTrustLevel(trustRecord.score);
        }

        if (this.isSelf && this.userStore.profile && !this.userInfo.nickName) {
          this.userInfo = {
            nickName: this.userStore.profile.nickName || "校园用户",
            avatar: this.userStore.profile.avatar || "",
            userId: this.userId
          };
        }

        if (!this.userInfo.nickName) {
          this.userInfo = { nickName: "校园用户", avatar: "", userId: this.userId };
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchUserInfo() {
      const db = getCloudDatabase();
      if (!db) { return null; }
      const res = await db.collection("users").where({ userId: this.userId }).limit(1).get().catch(() => null);
      return (res && res.data && res.data[0]) || null;
    },

    async fetchUserFeeds() {
      const db = getCloudDatabase();
      if (!db) { return []; }
      const res = await db.collection("feeds")
        .where({ authorId: this.userId, status: "active" })
        .orderBy("createdAt", "desc")
        .limit(5)
        .get()
        .catch(() => null);
      return (res && res.data) || [];
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
        showError(error, { title: "打开会话失败" });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.user-page {
  position: relative;
  padding: 24rpx; padding-bottom: 160rpx;
  min-height: 100vh;
  overflow: hidden;
  background: $page-bg;
}
.loading { margin-top: 100rpx; text-align: center; color: #8b95ab; font-size: 25rpx; }

.hero {
  position: relative;
  padding: 26rpx;
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -60rpx; right: -40rpx;
  width: 200rpx; height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.1), transparent);
  pointer-events: none;
}
.hero-top { position: relative; display: flex; align-items: center; gap: 18rpx; }
.avatar-container { flex-shrink: 0; }
.avatar-ring-outer {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  padding: 3rpx;
  background: linear-gradient(135deg, #2f6bff, #13c2a3);
  box-shadow: 0 4rpx 16rpx rgba(47, 107, 255, 0.2);
}
.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 2rpx solid #fff;
  display: block;
}
.avatar-placeholder {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #dfe6f5, #e8eef8);
  color: #2f6bff;
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; font-weight: 700;
  border: 2rpx solid #fff;
}
.hero-info { flex: 1; }
.hero-name { color: #1f2430; font-size: 32rpx; font-weight: 800; }
.hero-id { color: #8a93a7; font-size: 22rpx; margin-top: 4rpx; }

.stats-row {
  margin-top: 20rpx;
  display: flex;
  justify-content: space-around;
  padding: 16rpx 0 6rpx;
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
}
.stat-block { text-align: center; }
.stat-num { color: #1f2430; font-size: 30rpx; font-weight: 700; }
.stat-label { color: #8a93a7; font-size: 20rpx; margin-top: 4rpx; }

.section { margin-top: 14rpx; padding: 20rpx; }
.section-title { color: #25324a; font-size: 27rpx; font-weight: 600; margin-bottom: 14rpx; }
.item-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid rgba(228, 235, 251, 0.4); }
.item-row:last-child { border-bottom: none; }
.item-title { flex: 1; color: #2b3345; font-size: 25rpx; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-price { color: #e74a62; font-size: 24rpx; font-weight: 700; flex-shrink: 0; margin-left: 12rpx; }

.trust-row {
  margin-top: 14rpx; display: flex; align-items: center; gap: 12rpx;
  padding: 14rpx 18rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.7), rgba(248, 250, 255, 0.5));
  border-radius: 16rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
}
.trust-icon { font-size: 28rpx; flex-shrink: 0; }
.trust-detail { flex: 1; }
.trust-top { display: flex; align-items: baseline; gap: 6rpx; margin-bottom: 6rpx; }
.trust-text { font-size: 24rpx; font-weight: 700; }
.trust-score { font-size: 20rpx; color: #8a95ac; }
.trust-bar {
  height: 6rpx;
  border-radius: 3rpx;
  background: rgba(228, 235, 251, 0.6);
  overflow: hidden;
}
.trust-fill {
  height: 100%;
  border-radius: 3rpx;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.helper-tag {
  font-size: 20rpx; background: #eaf8f2; color: #23885f; border-radius: 999rpx;
  padding: 6rpx 14rpx; font-weight: 500; flex-shrink: 0;
}

.actions { margin-top: 20rpx; display: flex; gap: 12rpx; }
.chat-btn {
  flex: 1; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6); color: #fff; font-size: 30rpx; font-weight: 600;
  box-shadow: 0 6rpx 20rpx rgba(47, 107, 255, 0.3);
}
.chat-btn::after { border: none; }
.report-btn {
  width: 180rpx; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; border: none;
  background: rgba(238, 242, 251, 0.7); color: #8a93a7; font-size: 26rpx;
}
.report-btn::after { border: none; }
</style>
