<template>
  <view class="want-page">
    <view class="banner card anim-slide-down">
      <view class="banner-top">
        <view>
          <view class="banner-title">求购广场</view>
          <view class="banner-desc">发布你想要的商品，让卖家找到你</view>
        </view>
        <view class="banner-badge anim-float">🔍</view>
      </view>
      <view class="banner-pills">
        <text class="pill">{{ filteredList.length }} 条求购</text>
        <text class="pill">实时匹配</text>
      </view>
      <view class="banner-actions">
        <button class="publish-btn btn-bounce" size="mini" @tap="goPublish">发布求购</button>
        <button class="my-btn btn-bounce" size="mini" @tap="goMyWants">我的求购</button>
        <button class="sub-btn btn-bounce" size="mini" @tap="goSubscribe">到货提醒</button>
      </view>
    </view>

    <view class="filter-row anim-fade-in anim-d1">
      <text
        v-for="cat in categories"
        :key="cat"
        :class="['filter-tag', currentCategory === cat ? 'active' : '']"
        @tap="currentCategory = cat"
      >{{ cat }}</text>
    </view>

    <view class="search-wrap card anim-fade-in anim-d2">
      <input v-model.trim="keyword" class="search-input" placeholder="搜索求购信息" confirm-type="search" />
    </view>

    <empty-state
      v-if="filteredList.length === 0"
      title="暂无求购信息"
      :description="keyword ? '没有匹配的求购，换个关键词试试' : '快去发布你想要的商品吧'"
      action-text="发布求购"
      @action="goPublish"
    />

    <view
      v-for="(item, idx) in pagedList"
      :key="item.id"
      :class="['want-card', 'card', 'card-press', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 1)) : '']"
      @tap="goChat(item)"
    >
      <view class="want-head">
        <view class="want-title">{{ item.title }}</view>
        <view class="want-price" v-if="item.priceMax">¥{{ item.priceMin || 0 }}~{{ item.priceMax }}</view>
      </view>
      <view class="want-desc" v-if="item.description">{{ item.description }}</view>
      <view class="want-meta">
        <text class="want-category">{{ item.category }}</text>
        <text class="want-time">{{ formatTime(item.createdAt) }}</text>
        <text class="want-publisher">{{ item.publisherName }}</text>
      </view>
      <view class="want-foot">
        <text v-if="isExpired(item)" class="expired-tag">已过期</text>
        <text v-else class="valid-tag">有效</text>
        <button class="chat-btn btn-bounce" size="mini" @tap.stop="goChat(item)">我有货</button>
      </view>
    </view>

    <view v-if="pagedList.length > 0 && hasMore" class="load-more">上拉加载更多</view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { listWants } from "@/utils/want-service";
import { createOrGetConversationByProduct } from "@/utils/chat-service";

export default {
  components: { EmptyState },

  data() {
    return {
      list: [],
      keyword: "",
      currentCategory: "全部",
      categories: ["全部", "数码", "书籍", "生活", "服饰", "其他"],
      pageSize: 12,
      visibleCount: 12
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; },

    filteredList() {
      let result = [...this.list];
      if (this.currentCategory !== "全部") {
        result = result.filter((item) => item.category === this.currentCategory);
      }
      const key = this.keyword.toLowerCase();
      if (key) {
        result = result.filter((item) =>
          String(item.title || "").toLowerCase().includes(key) ||
          String(item.description || "").toLowerCase().includes(key)
        );
      }
      return result;
    },

    pagedList() { return this.filteredList.slice(0, this.visibleCount); },
    hasMore() { return this.filteredList.length > this.visibleCount; }
  },

  onShow() { this.loadList(); },

  onPullDownRefresh() {
    this.loadList().finally(() => uni.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.hasMore) {
      this.visibleCount += this.pageSize;
    }
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    isExpired(item) {
      return item.validUntil && Date.now() > Number(item.validUntil);
    },

    async loadList() {
      this.list = await listWants().catch(() => []);
      this.visibleCount = this.pageSize;
    },

    goPublish() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url: "/pages/want/publish" });
    },

    goMyWants() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url: "/pages/profile/my-want" });
    },

    goSubscribe() {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      uni.navigateTo({ url: "/pages/want/subscribe" });
    },

    async goChat(item) {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      const userId = this.userStore.profile?.userId;
      if (item.publisherId === userId) {
        uni.showToast({ title: "这是你自己的求购", icon: "none" });
        return;
      }
      try {
        const conversation = await createOrGetConversationByProduct({
          productId: `want:${item.id}`,
          productTitle: item.title,
          peerId: item.publisherId,
          peerName: item.publisherName,
          peerAvatar: "",
          topicType: "product"
        });
        const prefill = encodeURIComponent(`你好，我看到你的求购「${item.title}」，我有货可以聊聊。`);
        uni.navigateTo({ url: `/pages/chat/detail?conversationId=${conversation.id}&prefill=${prefill}` });
      } catch (error) {
        uni.showToast({ title: "打开会话失败", icon: "none" });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.want-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
  background:
    radial-gradient(circle at 10% 6%, rgba(255, 139, 62, 0.1), rgba(255, 139, 62, 0)),
    radial-gradient(circle at 90% 18%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0)),
    #f5f7fc;
}

.banner {
  padding: 26rpx;
  background: linear-gradient(140deg, rgba(255, 248, 238, 0.96), rgba(255, 252, 248, 0.98)), #ffffff;
  border: 1rpx solid #f5e3cc;
}

.banner-top { display: flex; align-items: flex-start; justify-content: space-between; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.banner-badge {
  width: 72rpx; height: 72rpx; border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.7); border: 1rpx solid #f5e3cc;
  display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0;
}

.banner-pills { margin-top: 14rpx; display: flex; flex-wrap: wrap; gap: 8rpx; }
.pill {
  height: 40rpx; line-height: 40rpx; padding: 0 14rpx; border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8); border: 1rpx solid #f0dfc8; color: #9f7640; font-size: 20rpx;
}

.banner-actions { margin-top: 16rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.publish-btn {
  margin: 0; height: 58rpx; line-height: 58rpx; border-radius: 32rpx; border: none;
  background: linear-gradient(135deg, #ff8b3e, #f1712d); color: #fff; font-size: 22rpx; padding: 0 24rpx;
}
.my-btn, .sub-btn {
  margin: 0; height: 58rpx; line-height: 58rpx; border-radius: 32rpx; border: none;
  background: #edf1fb; color: #3a4b6f; font-size: 22rpx; padding: 0 24rpx;
}

.filter-row { margin: 16rpx 4rpx 10rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.filter-tag {
  padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx;
}
.filter-tag.active { background: #ff8b3e; color: #fff; }

.search-wrap { margin-bottom: 12rpx; padding: 14rpx 18rpx; border: 1rpx solid #f0e4d4; }
.search-input {
  height: 60rpx; padding: 0 18rpx; border-radius: 999rpx; background: #faf6f1; color: #2b3345; font-size: 24rpx;
}

.want-card { margin-bottom: 12rpx; padding: 20rpx; border: 1rpx solid #f0e4d4; }
.want-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.want-title { color: #1f2430; font-size: 29rpx; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.want-price { color: #e74a62; font-size: 24rpx; font-weight: 700; background: #ffeef1; border-radius: 999rpx; padding: 6rpx 14rpx; flex-shrink: 0; }
.want-desc { margin-top: 10rpx; color: #5f6d85; font-size: 24rpx; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.want-meta { margin-top: 10rpx; display: flex; align-items: center; gap: 12rpx; color: #8a93a7; font-size: 22rpx; }
.want-category { background: #f0e8ff; color: #7b5ec6; border-radius: 999rpx; padding: 4rpx 12rpx; font-size: 20rpx; }
.want-foot { margin-top: 12rpx; display: flex; align-items: center; justify-content: space-between; }
.expired-tag { color: #9ba6bc; font-size: 20rpx; }
.valid-tag { color: #2ea269; font-size: 20rpx; }
.chat-btn {
  margin: 0; height: 52rpx; line-height: 52rpx; border-radius: 26rpx; border: none;
  background: #2f6bff; color: #fff; font-size: 22rpx; padding: 0 24rpx;
}
.chat-btn::after { border: none; }
.load-more { margin: 8rpx 0 16rpx; text-align: center; color: #8b95ab; font-size: 22rpx; }
</style>
