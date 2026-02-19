<template>
  <view class="chat-page">
    <empty-state
      v-if="!isLogin"
      title="登录后查看消息"
      description="交易沟通、任务沟通都在这里"
      action-text="去登录"
      @action="goLogin"
    />

    <template v-else>
      <!-- Banner -->
      <view class="banner card anim-slide-down">
        <view class="banner-top">
          <view>
            <view class="banner-title">消息中心</view>
            <view class="banner-desc">交易沟通、任务协作，实时在线</view>
          </view>
          <view class="banner-badge anim-float" @tap.stop="onBadgeTap">💬</view>
        </view>
        <view class="banner-pills">
          <text class="pill">{{ list.length }} 个会话</text>
          <text class="pill">{{ totalUnread > 0 ? totalUnread + ' 条未读' : '全部已读' }}</text>
        </view>
      </view>

      <!-- 提示 -->
      <view class="tip card anim-slide-up anim-d1">
        <view class="tip-icon">ℹ</view>
        <text :class="['tip-text', syncMode === 'polling' ? 'tip-text-warn' : '']">{{ syncHintText }}</text>
      </view>

      <view class="search-wrap card anim-fade-in anim-d2">
        <input
          v-model.trim="keyword"
          class="search-input"
          placeholder="搜索联系人 / 商品 / 消息"
          confirm-type="search"
        />
      </view>

      <empty-state
        v-if="filteredList.length === 0"
        title="还没有会话"
        :description="keyword ? '没有匹配的会话，换个关键词试试' : '去商品详情页联系卖家后，会话会出现在这里'"
      />

      <template v-else>
        <view class="section-head anim-fade-in anim-d2">
          <text class="section-title">{{ keyword ? '搜索结果' : '全部会话' }}</text>
        </view>

        <view
          v-for="(item, idx) in filteredList"
          :key="item.id"
          :class="[
            'chat-item',
            'card',
            'card-press',
            'anim-slide-up',
            idx < 8 ? ('anim-d' + (idx + 1)) : ''
          ]"
          @tap="openConversation(item)"
        >
            <view class="avatar-wrap">
              <image class="avatar" :src="item.peerAvatar" mode="aspectFill" />
              <view v-if="item.unread > 0" class="online-dot"></view>
            </view>

            <view class="content">
              <view class="row">
                <view class="name-wrap">
                  <text v-if="item.isTop" class="top-tag">置顶</text>
                  <text class="name">{{ item.peerName }}</text>
                </view>
                <text class="time">{{ formatTime(item.updatedAt) }}</text>
              </view>
              <view class="row row-bottom">
                <text class="preview">{{ item.preview }}</text>
                <view class="right-actions">
                  <view v-if="item.unread > 0" class="unread">{{ item.unread > 99 ? '99+' : item.unread }}</view>
                  <text class="action-btn" @tap.stop="handleConversationActions(item)">操作</text>
                </view>
              </view>
            </view>
        </view>
      </template>
    </template>

    <!-- 彩蛋: emoji 雨 -->
    <view v-if="showEmojiRain" class="emoji-rain-layer">
      <text
        v-for="p in emojiRainParticles"
        :key="p.id"
        class="emoji-drop"
        :style="{ left: p.left + '%', animationDelay: p.delay + 's', animationDuration: p.duration + 's', fontSize: p.size + 'rpx' }"
      >{{ p.emoji }}</text>
    </view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { deleteConversation, listConversations, markConversationRead, setConversationTop, watchConversations } from "@/utils/chat-service";
import { createTapCounter, getRandomChatSecret, generateFloatingParticles } from "@/utils/easter-eggs";

let _badgeTapper = null;

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      list: [],
      keyword: "",
      listPollingTimer: null,
      listWatcher: null,
      watchRetryTimer: null,
      watchRetryCount: 0,
      syncing: false,
      syncMode: "idle",
      showEmojiRain: false,
      emojiRainParticles: []
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    totalUnread() {
      return this.list.reduce((sum, item) => sum + (item.unread || 0), 0);
    },

    filteredList() {
      const key = String(this.keyword || "").trim().toLowerCase();
      if (!key) {
        return this.list;
      }
      return this.list.filter((item) => {
        const peerName = String(item.peerName || "").toLowerCase();
        const preview = String(item.preview || "").toLowerCase();
        const productTitle = String(item.productTitle || "").toLowerCase();
        return peerName.includes(key) || preview.includes(key) || productTitle.includes(key);
      });
    },

    syncHintText() {
      if (this.syncMode === "watch") {
        return "会话实时连接已启用（云 watch）";
      }
      if (this.syncMode === "polling") {
        return "实时连接波动，已切换轮询同步（自动重连中）";
      }
      return "会话优先读取云数据库，云不可用时自动回退本地缓存。";
    }
  },

  onShow() {
    this.loadConversations();
    this.startListRealtimeSync();
  },

  onHide() {
    this.stopListRealtimeSync();
    this.stopListAutoRefresh();
    this.stopWatchReconnect();
  },

  onUnload() {
    this.stopListRealtimeSync();
    this.stopListAutoRefresh();
    this.stopWatchReconnect();
  },

  methods: {
    formatTime(timestamp) {
      return formatRelativeTime(timestamp);
    },

    async loadConversations(options = {}) {
      const { silent = false } = options;
      if (!this.isLogin) {
        this.list = [];
        this.updateTabBarBadge(0);
        return;
      }

      if (this.syncing) {
        return;
      }

      this.syncing = true;
      try {
        const latest = await listConversations().catch(() => []);
        if (!silent) {
          this.list = latest;
          this.updateTabBarBadge(this.totalUnread);
          return;
        }

        const currentHead = this.list[0]?.id || "";
        const latestHead = latest[0]?.id || "";
        const currentUnread = this.list.reduce((sum, item) => sum + Number(item.unread || 0), 0);
        const latestUnread = latest.reduce((sum, item) => sum + Number(item.unread || 0), 0);
        const hasChanged = currentHead !== latestHead || this.list.length !== latest.length || currentUnread !== latestUnread;
        if (hasChanged) {
          this.list = latest;
        }
        this.updateTabBarBadge(latestUnread);
      } finally {
        this.syncing = false;
      }
    },

    updateTabBarBadge(count) {
      try {
        if (count > 0) {
          uni.setTabBarBadge({ index: 2, text: count > 99 ? "99+" : String(count) });
        } else {
          uni.removeTabBarBadge({ index: 2 });
        }
      } catch (e) {
        // ignore
      }
    },

    startListRealtimeSync() {
      if (!this.isLogin) {
        this.syncMode = "idle";
        this.stopListRealtimeSync();
        this.stopListAutoRefresh();
        this.stopWatchReconnect();
        return;
      }

      this.stopListRealtimeSync();
      this.stopWatchReconnect();
      const watcher = watchConversations({
        onChange: (list) => {
          this.list = list;
          this.syncMode = "watch";
          this.watchRetryCount = 0;
          this.stopListAutoRefresh();
          const unread = list.reduce((sum, item) => sum + (item.unread || 0), 0);
          this.updateTabBarBadge(unread);
        },
        onError: () => {
          this.stopListRealtimeSync();
          this.switchToPollingMode();
          this.scheduleWatchReconnect();
        }
      });

      if (watcher) {
        this.listWatcher = watcher;
        this.syncMode = "watch";
        this.watchRetryCount = 0;
        this.stopListAutoRefresh();
        return;
      }

      this.switchToPollingMode();
      this.scheduleWatchReconnect();
    },

    stopListRealtimeSync() {
      if (this.listWatcher && typeof this.listWatcher.close === "function") {
        this.listWatcher.close();
      }
      this.listWatcher = null;
    },

    switchToPollingMode() {
      if (!this.isLogin) {
        this.syncMode = "idle";
        this.stopListAutoRefresh();
        return;
      }

      this.syncMode = "polling";
      this.startListAutoRefresh();
      this.loadConversations({ silent: true });
    },

    scheduleWatchReconnect() {
      if (!this.isLogin || this.listWatcher || this.watchRetryTimer) {
        return;
      }

      const baseRetryMs = Math.min(30000, 5000 + this.watchRetryCount * 4000);
      const jitterMs = Math.floor(Math.random() * 2000);
      const retryMs = baseRetryMs + jitterMs;
      this.watchRetryTimer = setTimeout(() => {
        this.watchRetryTimer = null;
        this.watchRetryCount += 1;
        this.startListRealtimeSync();
      }, retryMs);
    },

    stopWatchReconnect() {
      if (this.watchRetryTimer) {
        clearTimeout(this.watchRetryTimer);
      }
      this.watchRetryTimer = null;
    },

    startListAutoRefresh() {
      if (this.listPollingTimer) {
        return;
      }

      this.listPollingTimer = setInterval(() => {
        if (this.syncMode !== "polling") {
          return;
        }
        this.loadConversations({ silent: true });
      }, 4000);
    },

    stopListAutoRefresh() {
      if (this.listPollingTimer) {
        clearInterval(this.listPollingTimer);
      }
      this.listPollingTimer = null;
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    },

    async openConversation(item) {
      await markConversationRead(item.id);
      uni.navigateTo({
        url: `/pages/chat/detail?conversationId=${item.id}`
      });
    },

    async handleQuickTop(item) {
      const ok = await setConversationTop(item.id, !item.isTop);
      if (ok) {
        uni.showToast({ title: item.isTop ? "已取消置顶" : "已置顶", icon: "none" });
        this.loadConversations();
      }
    },

    async handleQuickRead(item) {
      await markConversationRead(item.id);
      uni.showToast({ title: "已标为已读", icon: "none" });
      this.loadConversations();
    },

    async handleQuickDelete(item) {
      uni.showModal({
        title: "删除会话",
        content: "删除后会同时清空本会话消息，是否继续？",
        success: async (modalRes) => {
          if (!modalRes.confirm) {
            return;
          }
          const ok = await deleteConversation(item.id);
          if (ok) {
            uni.showToast({ title: "会话已删除", icon: "none" });
            this.loadConversations();
          }
        }
      });
    },

    // ---- 彩蛋: 连击 banner badge ----
    onBadgeTap() {
      if (!_badgeTapper) {
        _badgeTapper = createTapCounter(7, 500, () => this.triggerEmojiRain());
      }
      _badgeTapper.tap();
    },

    triggerEmojiRain() {
      this.emojiRainParticles = generateFloatingParticles(15);
      this.showEmojiRain = true;
      uni.vibrateShort && uni.vibrateShort({ type: "light" });
      uni.showToast({ title: getRandomChatSecret(), icon: "none", duration: 3000 });
      setTimeout(() => { this.showEmojiRain = false; }, 4000);
    },

    async handleConversationActions(item) {
      const actions = [
        { label: item.isTop ? "取消置顶" : "置顶会话", handler: () => this.handleQuickTop(item) },
        { label: "标为已读", handler: () => this.handleQuickRead(item) },
        { label: "删除会话", handler: () => this.handleQuickDelete(item) }
      ];
      uni.showActionSheet({
        itemList: actions.map((a) => a.label),
        success: (res) => {
          const selected = actions[Number(res.tapIndex)];
          if (selected) {
            selected.handler();
          }
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
  background:
    radial-gradient(circle at 10% 6%, rgba(47, 107, 255, 0.12), rgba(47, 107, 255, 0)),
    radial-gradient(circle at 90% 18%, rgba(120, 80, 255, 0.08), rgba(120, 80, 255, 0)),
    #f5f7fc;
}

/* --- Banner --- */
.banner {
  padding: 26rpx;
  background:
    linear-gradient(140deg, rgba(235, 240, 255, 0.96), rgba(245, 248, 255, 0.98)),
    #ffffff;
  border: 1rpx solid #e4ebfb;
}

.banner-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.banner-title {
  color: #1f2636;
  font-size: 34rpx;
  font-weight: 700;
}

.banner-desc {
  margin-top: 8rpx;
  color: #647188;
  font-size: 24rpx;
}

.banner-badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid #e3eaf9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}

.banner-pills {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.pill {
  height: 40rpx;
  line-height: 40rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid #deecf8;
  color: #56749f;
  font-size: 20rpx;
}

/* --- 提示条 --- */
.tip {
  margin-top: 14rpx;
  padding: 16rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  border-left: 6rpx solid $primary-color;
}

.tip-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #eaf0ff;
  color: #2f6bff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  flex-shrink: 0;
}

.tip-text {
  color: #4f5d77;
  font-size: 23rpx;
  flex: 1;
}

.tip-text-warn {
  color: #b15e10;
}

.search-wrap {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  border: 1rpx solid #e4ebfb;
}

.search-input {
  height: 60rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #f3f6fc;
  color: #2b3345;
  font-size: 24rpx;
}

/* --- 段落标题 --- */
.section-head {
  margin: 20rpx 4rpx 12rpx;
  display: flex;
  align-items: center;
}

.section-title {
  color: #1f2430;
  font-size: 29rpx;
  font-weight: 700;
}

/* --- 会话卡片 --- */
.chat-item {
  margin-bottom: 12rpx;
  padding: 22rpx;
  display: flex;
  gap: 16rpx;
  border-radius: 22rpx;
  background: #ffffff;
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow: 0 4rpx 14rpx rgba(31, 38, 66, 0.03);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 2rpx solid #eef2fb;
  box-shadow: 0 2rpx 8rpx rgba(31, 38, 66, 0.06);
}

.online-dot {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  border: 3rpx solid #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(47, 107, 255, 0.3);
}

.content {
  flex: 1;
  min-width: 0;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.row-bottom {
  margin-top: 8rpx;
}

.name {
  color: #1f2430;
  font-size: 29rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.top-tag {
  height: 30rpx;
  line-height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #2f6bff;
  background: #e9f0ff;
  flex-shrink: 0;
}

.time {
  color: #8c95a7;
  font-size: 22rpx;
  flex-shrink: 0;
}

.preview {
  color: #6e7b92;
  font-size: 24rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  padding: 0 10rpx;
  background: linear-gradient(135deg, #f2576b, #e04058);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(242, 87, 107, 0.3);
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-shrink: 0;
}

.action-btn {
  color: #5f6f8e;
  font-size: 22rpx;
  padding: 2rpx 8rpx;
}

/* ---- 彩蛋: emoji 雨 ---- */
.emoji-rain-layer {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 999;
}
.emoji-drop {
  position: absolute;
  top: -50rpx;
  animation: emoji-rain-fall linear forwards;
  opacity: 0;
}
@keyframes emoji-rain-fall {
  0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
  70%  { opacity: 0.9; }
  100% { opacity: 0; transform: translateY(1200rpx) rotate(360deg); }
}
</style>
