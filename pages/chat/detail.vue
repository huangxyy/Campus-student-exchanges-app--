<template>
  <view class="chat-detail-page">
    <!-- 对话头部 -->
    <view v-if="conversation" class="conversation-head card anim-slide-down">
      <view class="head-left">
        <view class="avatar-wrap">
          <image class="avatar" :src="conversation.peerAvatar" mode="aspectFill" />
          <view class="status-dot anim-pulse"></view>
        </view>
        <view class="head-info">
          <view class="name">{{ conversation.peerName }}</view>
          <view class="product-row">
            <text class="product-icon">🏷</text>
            <text class="product">{{ conversation.productTitle }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      :scroll-top="scrollTop"
      @scroll="onMessageScroll"
      @scrolltolower="onMessageScrollToLower"
    >
      <template v-for="(item, idx) in messages" :key="item.id">
        <!-- 日期分隔线 -->
        <view v-if="shouldShowDateDivider(idx)" class="date-divider">
          <text class="date-text">{{ getDateLabel(item.createdAt) }}</text>
        </view>

        <view
          :class="['message-row', item.sender === 'me' ? 'me' : item.sender === 'system' ? 'system' : 'peer', 'anim-stagger-fade', 'anim-d' + (idx % 10 + 1)]"
        >
          <image
            v-if="item.type === 'image'"
            class="image-bubble"
            :src="item.imageUrl"
            mode="aspectFill"
            @tap="previewMessageImage(item)"
          />
          <view
            v-else-if="item.type === 'product_card' || item.type === 'task_card'"
            class="card-bubble"
            @tap="openCardPayload(item)"
          >
            <view class="card-type">{{ item.type === 'product_card' ? '商品卡片' : '任务卡片' }}</view>
            <view class="card-title">{{ item.cardPayload?.title || '未命名卡片' }}</view>
            <view class="card-subtitle">{{ item.cardPayload?.subtitle || '点击查看详情' }}</view>
            <view v-if="item.cardPayload?.priceText" class="card-price">{{ item.cardPayload.priceText }}</view>
          </view>
          <view v-else class="bubble">{{ item.content }}</view>

          <view class="time-row">
            <view class="time">{{ formatTime(item.createdAt) }}</view>
            <view v-if="item.sender === 'me' && item.type !== 'system'" class="status-text">{{ getMessageStatusText(item) }}</view>
          </view>
        </view>
      </template>
    </scroll-view>

    <view v-if="hasNewMessageTip" class="new-message-tip card" @tap="jumpToLatest">
      <text class="tip-badge">新消息</text>
      <text class="tip-text">{{ newMessageTipText }}</text>
    </view>

    <!-- 发送栏 -->
    <view class="send-box anim-slide-up anim-d2">
      <button class="pick-image-btn" :loading="sendingImage" @tap="chooseAndSendImage">＋</button>
      <button class="pick-card-btn" @tap="showCardActionSheet">卡</button>
      <view class="input-wrap">
        <input
          v-model="draft"
          class="input"
          maxlength="200"
          placeholder="输入消息..."
          confirm-type="send"
          @confirm="send"
        />
      </view>
      <button class="send-btn btn-bounce" :class="{ active: draft.trim().length > 0 }" @tap="send">发送</button>
    </view>
  </view>
</template>

<script>
import { formatRelativeTime, isSameDay, isToday } from "@/utils/date";
import {
  getConversation,
  getConversationMessages,
  markConversationRead,
  sendImageMessage,
  sendProductCardMessage,
  sendTaskCardMessage,
  sendTextMessage,
  watchConversationMessages
} from "@/utils/chat-service";
import { useUserStore } from "@/store/user";

export default {
  data() {
    return {
      conversationId: "",
      conversation: null,
      messages: [],
      draft: "",
      scrollTop: 0,
      sendingImage: false,
      sendingText: false,
      sendingCard: false,
      messageWatcher: null,
      fallbackTimer: null,
      isAtBottom: true,
      maxSeenScrollTop: 0,
      hasNewMessageTip: false,
      pendingIncomingCount: 0
    };
  },

  computed: {
    newMessageTipText() {
      if (this.pendingIncomingCount > 1) {
        return `${this.pendingIncomingCount} 条新消息，点击查看`;
      }
      return "收到新消息，点击回到底部";
    }
  },

  onLoad(query) {
    // 检查登录状态，未登录则跳转登录页
    const userStore = useUserStore();
    if (!userStore.isLogin) {
      uni.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        uni.navigateTo({ url: "/pages/login/login" });
      }, 300);
      return;
    }

    this.conversationId = query.conversationId || "";
    this.applyPresetDraft(query.prefill || "");
    this.loadConversation();
  },

  onShow() {
    this.startRealtimeSync();
  },

  onHide() {
    this.stopRealtimeSync();
  },

  onUnload() {
    this.stopRealtimeSync();
  },

  methods: {
    applyPresetDraft(rawText) {
      if (!rawText) {
        return;
      }

      let text = rawText;
      try {
        text = rawText.includes("%") ? decodeURIComponent(rawText) : rawText;
      } catch (error) {
        text = rawText;
      }

      this.draft = String(text).slice(0, 200);
      if (this.draft) {
        uni.showToast({
          title: "已预置首条消息",
          icon: "none"
        });
      }
    },

    async loadConversation() {
      if (!this.conversationId) {
        return;
      }
      try {
        this.conversation = await getConversation(this.conversationId);
        if (!this.conversation) {
          uni.showToast({
            title: "会话不存在",
            icon: "none"
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 350);
          return;
        }
        this.messages = await getConversationMessages(this.conversationId, { limit: 120 });
        await markConversationRead(this.conversationId).catch(() => false);
        this.resetBottomState();
        this.maxSeenScrollTop = 0;
        this.scrollToBottom();
        this.startRealtimeSync();
      } catch (error) {
        console.warn("[ChatDetail] loadConversation failed:", error);
        uni.showToast({ title: "加载会话失败", icon: "none" });
      }
    },

    startRealtimeSync() {
      if (!this.conversationId) {
        return;
      }

      this.stopRealtimeSync();
      const watcher = watchConversationMessages(this.conversationId, {
        onChange: async (list) => {
          try { await this.applyRealtimeMessages(list); } catch (e) { /* ignore */ }
        },
        onError: () => {
          this.startFallbackPolling();
        }
      });

      if (watcher) {
        this.messageWatcher = watcher;
        return;
      }

      this.startFallbackPolling();
    },

    stopRealtimeSync() {
      if (this.messageWatcher && typeof this.messageWatcher.close === "function") {
        this.messageWatcher.close();
      }
      this.messageWatcher = null;

      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
      }
      this.fallbackTimer = null;
    },

    startFallbackPolling() {
      if (this.fallbackTimer) {
        return;
      }

      this.fallbackTimer = setInterval(async () => {
        if (!this.conversationId) {
          return;
        }
        const latestCreatedAt = Number(this.messages[this.messages.length - 1]?.createdAt || 0);
        const incremental = await getConversationMessages(this.conversationId, {
          afterCreatedAt: latestCreatedAt,
          limit: 80
        }).catch(() => null);
        if (!incremental || incremental.length === 0) {
          return;
        }

        const merged = this.mergeMessages(this.messages, incremental);
        try { await this.applyRealtimeMessages(merged); } catch (e) { /* ignore */ }
      }, 3000);
    },

    mergeMessages(baseList = [], incomingList = []) {
      const map = new Map();
      [...baseList, ...incomingList].forEach((item) => {
        if (!item || !item.id) {
          return;
        }
        map.set(item.id, item);
      });
      return Array.from(map.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    },

    async applyRealtimeMessages(latest) {
      const previous = this.messages || [];
      const previousIds = new Set(previous.map((item) => item.id));
      const incomingAdded = (latest || []).filter((item) => !previousIds.has(item.id) && item.sender !== "me").length;

      this.messages = latest || [];

      if (this.isAtBottom) {
        this.resetBottomState();
        await markConversationRead(this.conversationId).catch(() => false);
        this.scrollToBottom();
        return;
      }

      if (incomingAdded > 0) {
        this.pendingIncomingCount += incomingAdded;
        this.hasNewMessageTip = true;
      }
    },

    pushOptimisticMessage(tempId, { type, content, imageUrl, cardPayload }) {
      this.messages.push({
        id: tempId,
        sender: "me",
        type,
        content,
        imageUrl: imageUrl || "",
        cardPayload: cardPayload || null,
        createdAt: Date.now(),
        status: "sending",
        isRead: false
      });
      this.scrollToBottom();
    },

    markMessageFailed(tempId) {
      this.messages = this.messages.map((item) =>
        item.id === tempId ? { ...item, status: "failed" } : item
      );
    },

    shouldShowDateDivider(idx) {
      if (idx === 0) {
        return true;
      }
      const current = this.messages[idx];
      const prev = this.messages[idx - 1];
      if (!current || !prev) {
        return false;
      }
      return !isSameDay(current.createdAt, prev.createdAt);
    },

    getDateLabel(timestamp) {
      if (!timestamp) {
        return "";
      }
      if (isToday(timestamp)) {
        return "今天";
      }
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (isSameDay(timestamp, yesterday.getTime())) {
        return "昨天";
      }
      const d = new Date(timestamp);
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    },

    formatTime(timestamp) {
      return formatRelativeTime(timestamp);
    },

    getMessageStatusText(item) {
      if (!item) {
        return "";
      }

      if (item.status === "failed") {
        return "发送失败";
      }

      if (item.status === "sending") {
        return "发送中";
      }

      return item.isRead ? "已读" : "已发送";
    },

    resetBottomState() {
      this.isAtBottom = true;
      this.hasNewMessageTip = false;
      this.pendingIncomingCount = 0;
    },

    scrollToBottom() {
      this.resetBottomState();
      this.scrollTop = 0;
      this.$nextTick(() => {
        this.scrollTop = 99999999;
      });
    },

    onMessageScroll(event) {
      const top = Number(event?.detail?.scrollTop || 0);
      if (top > this.maxSeenScrollTop) {
        this.maxSeenScrollTop = top;
      }

      const nearBottom = this.maxSeenScrollTop - top <= 100;
      if (nearBottom && !this.isAtBottom) {
        this.resetBottomState();
        markConversationRead(this.conversationId).catch(() => false);
      }
      this.isAtBottom = nearBottom;
    },

    onMessageScrollToLower() {
      this.resetBottomState();
      markConversationRead(this.conversationId).catch(() => false);
    },

    jumpToLatest() {
      this.scrollToBottom();
      markConversationRead(this.conversationId).catch(() => false);
    },

    async send() {
      const text = this.draft.trim();
      if (!text || !this.conversationId || this.sendingText) {
        return;
      }

      const tempId = `temp-text-${Date.now()}`;
      this.sendingText = true;
      this.pushOptimisticMessage(tempId, { type: "text", content: text });

      try {
        await sendTextMessage(this.conversationId, text);
        this.draft = "";
        this.messages = await getConversationMessages(this.conversationId, { limit: 120 });
      } catch (error) {
        this.markMessageFailed(tempId);
        uni.showToast({ title: "发送失败，请重试", icon: "none" });
      } finally {
        this.sendingText = false;
        this.scrollToBottom();
      }
    },

    chooseAndSendImage() {
      if (!this.conversationId || this.sendingImage) {
        return;
      }

      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        success: async (res) => {
          const imagePath = res.tempFilePaths && res.tempFilePaths[0];
          if (!imagePath) {
            return;
          }

          const tempId = `temp-image-${Date.now()}`;
          this.sendingImage = true;
          this.pushOptimisticMessage(tempId, { type: "image", content: "[图片]", imageUrl: imagePath });

          try {
            await sendImageMessage(this.conversationId, imagePath);
            this.messages = await getConversationMessages(this.conversationId, { limit: 120 });
          } catch (error) {
            this.markMessageFailed(tempId);
            uni.showToast({ title: "图片发送失败", icon: "none" });
          } finally {
            this.sendingImage = false;
            this.scrollToBottom();
          }
        }
      });
    },

    previewMessageImage(item) {
      if (!item || item.type !== "image" || !item.imageUrl) {
        return;
      }

      const imageUrls = this.messages
        .filter((msg) => msg.type === "image" && msg.imageUrl)
        .map((msg) => msg.imageUrl);
      if (imageUrls.length === 0) {
        return;
      }

      uni.previewImage({
        urls: imageUrls,
        current: item.imageUrl
      });
    },

    buildProductCardPayload() {
      if (!this.conversation || !this.conversation.productId || String(this.conversation.productId).startsWith("task:")) {
        return null;
      }

      return {
        id: String(this.conversation.productId),
        title: String(this.conversation.productTitle || "商品"),
        subtitle: `来自会话：${this.conversation.peerName || "校园同学"}`,
        priceText: "点击查看商品详情"
      };
    },

    buildTaskCardPayload() {
      if (!this.conversation || !this.conversation.productId || !String(this.conversation.productId).startsWith("task:")) {
        return null;
      }

      const taskId = String(this.conversation.productId).replace("task:", "");
      if (!taskId) {
        return null;
      }

      return {
        id: taskId,
        title: String(this.conversation.productTitle || "任务"),
        subtitle: `来自会话：${this.conversation.peerName || "校园同学"}`,
        priceText: "点击查看任务详情"
      };
    },

    showCardActionSheet() {
      if (!this.conversationId || this.sendingCard) {
        return;
      }

      const actions = [];
      const productPayload = this.buildProductCardPayload();
      const taskPayload = this.buildTaskCardPayload();

      if (productPayload) {
        actions.push({ label: "发送商品卡片", type: "product", payload: productPayload });
      }
      if (taskPayload) {
        actions.push({ label: "发送任务卡片", type: "task", payload: taskPayload });
      }

      if (actions.length === 0) {
        uni.showToast({ title: "当前会话暂无可发送卡片", icon: "none" });
        return;
      }

      uni.showActionSheet({
        itemList: actions.map((item) => item.label),
        success: async (res) => {
          const selected = actions[Number(res.tapIndex)];
          if (!selected) {
            return;
          }

          const tempId = `temp-card-${Date.now()}`;
          const tempType = selected.type === "product" ? "product_card" : "task_card";
          const tempContent = tempType === "product_card" ? "[商品卡片]" : "[任务卡片]";
          this.sendingCard = true;
          this.pushOptimisticMessage(tempId, { type: tempType, content: tempContent, cardPayload: selected.payload });

          try {
            if (selected.type === "product") {
              await sendProductCardMessage(this.conversationId, selected.payload);
            } else {
              await sendTaskCardMessage(this.conversationId, selected.payload);
            }
            this.messages = await getConversationMessages(this.conversationId, { limit: 120 });
          } catch (error) {
            this.markMessageFailed(tempId);
            uni.showToast({ title: "卡片发送失败", icon: "none" });
          } finally {
            this.sendingCard = false;
            this.scrollToBottom();
          }
        }
      });
    },

    openCardPayload(item) {
      const payload = item?.cardPayload;
      if (!payload || !payload.id) {
        return;
      }

      if (item.type === "product_card") {
        uni.navigateTo({
          url: `/pages/products/detail?id=${payload.id}`
        });
        return;
      }

      if (item.type === "task_card") {
        uni.navigateTo({
          url: `/pages/tasks/detail?id=${payload.id}`
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-detail-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16rpx;
  background:
    radial-gradient(circle at 50% 0%, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0) 60%),
    #f2f5fb;
}

/* --- 对话头部 --- */
.conversation-head {
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 38, 66, 0.04);
}

.head-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex: 1;
  min-width: 0;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  border: 2rpx solid #eef2fb;
}

.status-dot {
  position: absolute;
  bottom: 2rpx;
  right: 2rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: $success-color;
  border: 3rpx solid #ffffff;
}

.head-info {
  flex: 1;
  min-width: 0;
}

.name {
  color: #1f2430;
  font-size: 29rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-row {
  margin-top: 4rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.product-icon {
  font-size: 20rpx;
  flex-shrink: 0;
}

.product {
  color: #74819a;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- 消息列表 --- */
.message-list {
  flex: 1;
  margin-top: 14rpx;
  padding: 10rpx 6rpx;
}

.new-message-tip {
  align-self: center;
  margin-bottom: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid #d8e5ff;
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.14);
}

.new-message-tip .tip-badge {
  height: 34rpx;
  line-height: 34rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: #1f53cc;
  background: #e9f0ff;
}

.new-message-tip .tip-text {
  font-size: 22rpx;
  color: #375189;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20rpx 0 12rpx;
}

.date-text {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(140, 150, 170, 0.12);
  color: #8a93a7;
  font-size: 20rpx;
}

.message-row {
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  animation: anim-fade-in 0.35s ease both;
}

.message-row.peer {
  align-items: flex-start;
  animation: anim-slide-right 0.35s ease both;
}

.message-row.me {
  align-items: flex-end;
  animation: anim-slide-left 0.35s ease both;
}

.message-row.system {
  align-items: center;
  animation: anim-scale-in 0.3s ease both;
}

.bubble {
  max-width: 76%;
  padding: 16rpx 22rpx;
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-all;
}

.image-bubble {
  width: 280rpx;
  height: 280rpx;
  border-radius: 18rpx;
  border: 1rpx solid #e5ecf9;
  box-shadow: 0 6rpx 16rpx rgba(30, 42, 67, 0.08);
}

.card-bubble {
  padding: 24rpx;
  background: linear-gradient(145deg, #ffffff, #fafbff);
  border: 1rpx solid rgba(215, 226, 246, 0.8);
  border-radius: 20rpx;
  max-width: 460rpx;
  min-width: 280rpx;
  box-shadow: 0 6rpx 20rpx rgba(31, 38, 66, 0.05);
}

.message-row.me .card-bubble {
  background: linear-gradient(145deg, #f2f7ff, #e9effc);
  border: 1rpx solid rgba(193, 212, 248, 0.6);
  border-radius: 20rpx 20rpx 4rpx 20rpx;
}

.message-row.peer .card-bubble {
  border-radius: 20rpx 20rpx 20rpx 4rpx;
}

.card-type {
  color: #4c6bb2;
  font-size: 20rpx;
}

.card-title {
  margin-top: 6rpx;
  color: #22304a;
  font-size: 26rpx;
  font-weight: 600;
}

.card-subtitle {
  margin-top: 6rpx;
  color: #6f7f9e;
  font-size: 22rpx;
}

.card-price {
  margin-top: 8rpx;
  color: #2f6bff;
  font-size: 22rpx;
}

.message-row.peer .bubble {
  background: #ffffff;
  color: #293246;
  border-radius: 6rpx 24rpx 24rpx 24rpx;
  border: 1rpx solid #e9eef8;
  box-shadow: 0 4rpx 12rpx rgba(24, 37, 66, 0.04);
}

.message-row.me .bubble {
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  border-radius: 24rpx 6rpx 24rpx 24rpx;
  box-shadow: 0 6rpx 16rpx rgba(47, 107, 255, 0.2);
}

.message-row.system .bubble {
  background: #edf2ff;
  color: #4963ae;
  font-size: 22rpx;
  border-radius: 999rpx;
  padding: 8rpx 22rpx;
}

.time {
  color: #8a93a8;
  font-size: 20rpx;
  padding: 0 4rpx;
}

.time-row {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.message-row.peer .time-row,
.message-row.system .time-row {
  justify-content: flex-start;
}

.message-row.me .time-row {
  justify-content: flex-end;
}

.status-text {
  color: #6f7ea0;
  font-size: 20rpx;
}

/* --- 发送栏 --- */
.send-box {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 8rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.5);
  box-shadow: 0 -2rpx 12rpx rgba(31, 38, 66, 0.03);
}

.pick-image-btn {
  margin: 0;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
  border-radius: 36rpx;
  background: linear-gradient(135deg, #e6edff, #dde6ff);
  color: #315fca;
  font-size: 30rpx;
  padding: 0;
  box-shadow: 0 2rpx 8rpx rgba(47, 107, 255, 0.1);
}

.pick-image-btn::after {
  border: none;
}

.pick-card-btn {
  margin: 0;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
  border-radius: 36rpx;
  background: linear-gradient(135deg, #eef2ff, #e6edff);
  color: #395fc6;
  font-size: 23rpx;
  font-weight: 600;
  padding: 0;
  box-shadow: 0 2rpx 8rpx rgba(47, 107, 255, 0.08);
}

.pick-card-btn::after {
  border: none;
}

.input-wrap {
  flex: 1;
  height: 78rpx;
  border-radius: 39rpx;
  background: #ffffff;
  border: 1rpx solid rgba(228, 235, 251, 0.8);
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-wrap:focus-within {
  border-color: rgba(47, 107, 255, 0.25);
  box-shadow: 0 0 0 4rpx rgba(47, 107, 255, 0.06);
}

.input {
  flex: 1;
  height: 78rpx;
  font-size: 26rpx;
  background: transparent;
}

.send-btn {
  margin: 0;
  width: 120rpx;
  height: 78rpx;
  line-height: 78rpx;
  border: none;
  border-radius: 39rpx;
  background: #d0d8ea;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.25s ease;
}

.send-btn.active {
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.3);
  transform: scale(1.02);
}

.send-btn::after {
  border: none;
}
</style>
