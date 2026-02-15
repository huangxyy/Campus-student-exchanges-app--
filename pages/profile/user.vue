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
        <view class="stats-row">
          <view class="stat-block">
            <view class="stat-num">{{ stats.productCount || 0 }}</view>
            <view class="stat-label">商品</view>
          </view>
          <view class="stat-block">
            <view class="stat-num">{{ stats.orderCount || 0 }}</view>
            <view class="stat-label">交易</view>
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
      </view>
    </template>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { createOrGetConversationByProduct } from "@/utils/chat-service";
import { getCloudDatabase } from "@/utils/cloud";

export default {
  data() {
    return {
      userId: "",
      userInfo: {},
      stats: {},
      products: [],
      feeds: [],
      loading: false
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
        const db = getCloudDatabase();
        if (db) {
          const userRes = await db.collection("users").where({ userId: this.userId }).limit(1).get().catch(() => null);
          if (userRes && userRes.data && userRes.data[0]) {
            this.userInfo = userRes.data[0];
          }

          const productRes = await db.collection("products").where({ userId: this.userId, status: "active" }).orderBy("createdAt", "desc").limit(5).get().catch(() => null);
          this.products = (productRes && productRes.data) || [];

          const feedRes = await db.collection("feeds").where({ authorId: this.userId, status: "active" }).orderBy("createdAt", "desc").limit(5).get().catch(() => null);
          this.feeds = (feedRes && feedRes.data) || [];

          const orderRes = await db.collection("orders").where({ buyerId: this.userId }).limit(100).get().catch(() => null);
          const taskRes = await db.collection("tasks").where({ publisherId: this.userId }).limit(100).get().catch(() => null);

          this.stats = {
            productCount: this.products.length,
            orderCount: (orderRes && orderRes.data && orderRes.data.length) || 0,
            taskCount: (taskRes && taskRes.data && taskRes.data.length) || 0,
            feedCount: this.feeds.length
          };
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
.actions { margin-top: 20rpx; }
.chat-btn {
  width: 100%; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6); color: #fff; font-size: 30rpx; font-weight: 600;
}
.chat-btn::after { border: none; }
</style>
