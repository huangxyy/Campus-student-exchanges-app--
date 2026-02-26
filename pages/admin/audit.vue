<template>
  <view class="audit-page">
    <view class="banner glass-strong" style="border-radius: 24rpx;">
      <view class="title">🛡 风控审计台</view>
      <view class="desc">用于本地调试运营与交易风控数据</view>
    </view>

    <view class="panel glass-strong" style="border-radius: 20rpx;">
      <view class="row">
        <input v-model.trim="filters.action" class="input" placeholder="动作过滤，如 order_status_changed" />
      </view>
      <view class="row">
        <input v-model.trim="filters.userId" class="input" placeholder="用户ID过滤（可选）" />
      </view>
      <view class="actions">
        <button class="ui-btn ui-btn-primary btn" :loading="loading" @tap="loadAll">刷新</button>
        <button class="ui-btn ui-btn-secondary btn" :loading="exporting" @tap="exportAsJson">导出JSON</button>
        <button class="ui-btn ui-btn-ghost btn" :loading="exporting" @tap="exportAsCsv">导出CSV</button>
      </view>
    </view>

    <view class="panel glass-strong" style="border-radius: 20rpx;">
      <view class="section-title">统计概览</view>
      <view class="kv"><text class="k">总记录</text><text class="v">{{ stats.total || 0 }}</text></view>
      <view class="section-title sub">按动作</view>
      <view v-if="actionPairs.length === 0" class="empty">暂无数据</view>
      <view v-for="item in actionPairs" :key="item.key" class="kv">
        <text class="k">{{ item.key }}</text>
        <text class="v">{{ item.value }}</text>
      </view>
    </view>

    <view class="panel glass-strong" style="border-radius: 20rpx;">
      <view class="section-title">最近记录</view>
      <view v-if="logs.length === 0" class="empty">暂无记录</view>
      <view v-for="log in logs" :key="log.id" class="log-item">
        <view class="log-top">
          <text class="action">{{ log.action }}</text>
          <text class="time">{{ formatTime(log.createdAt) }}</text>
        </view>
        <view class="meta">用户：{{ log.userId || "unknown" }}</view>
        <view class="payload">{{ compactPayload(log.payload) }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { listAuditLogs, getAuditStats, exportAuditLogs } from "@/utils/audit-service";
import { formatRelativeTime } from "@/utils/date";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      filters: {
        action: "",
        userId: ""
      },
      logs: [],
      stats: {
        total: 0,
        byAction: {},
        byUser: {}
      },
      loading: false,
      exporting: false
    };
  },
  computed: {
    actionPairs() {
      return Object.entries(this.stats.byAction || {})
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    }
  },
  onLoad() {
    this.loadAll();
  },
  methods: {
    formatTime(ts) {
      return formatRelativeTime(ts);
    },
    compactPayload(payload) {
      const text = JSON.stringify(payload || {});
      if (!text) {
        return "{}";
      }
      return text.length > 140 ? `${text.slice(0, 140)}...` : text;
    },
    buildOptions() {
      return {
        action: this.filters.action || "",
        userId: this.filters.userId || "",
        page: 1,
        pageSize: 40
      };
    },
    async loadAll() {
      this.loading = true;
      try {
        const opts = this.buildOptions();
        const [logs, stats] = await Promise.all([
          listAuditLogs(opts),
          getAuditStats(opts)
        ]);
        this.logs = logs || [];
        this.stats = stats || { total: 0, byAction: {}, byUser: {} };
      } catch (error) {
        showError(error);
      } finally {
        this.loading = false;
      }
    },
    async exportAsJson() {
      await this.handleExport("json");
    },
    async exportAsCsv() {
      await this.handleExport("csv");
    },
    async handleExport(format) {
      this.exporting = true;
      try {
        const payload = await exportAuditLogs({
          action: this.filters.action || "",
          userId: this.filters.userId || "",
          format,
          maxRecords: 200
        });
        const content = payload?.content || "";
        if (!content) {
          uni.showToast({ title: "无可导出数据", icon: "none" });
          return;
        }
        uni.setClipboardData({
          data: content,
          success: () => {
            uni.showToast({ title: `已复制${payload.filename}`, icon: "none" });
          }
        });
      } catch (error) {
        showError(error);
      } finally {
        this.exporting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.audit-page {
  min-height: 100vh;
  padding: 24rpx;
  background: $page-bg;
}
.banner { padding: 24rpx; margin-bottom: 14rpx; }
.title { font-size: 32rpx; font-weight: 800; color: #1f2a42; }
.desc { margin-top: 8rpx; color: #6d7c97; font-size: 24rpx; }
.panel { padding: 20rpx; margin-bottom: 14rpx; }
.row { margin-bottom: 12rpx; }
.input {
  width: 100%;
  height: 76rpx;
  border-radius: 14rpx;
  background: rgba(238, 242, 251, 0.7);
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  padding: 0 18rpx;
  box-sizing: border-box;
  font-size: 24rpx;
}
.actions { display: flex; gap: 10rpx; }
.btn { flex: 1; }
.section-title { color: #22314e; font-size: 26rpx; font-weight: 700; }
.section-title.sub { margin-top: 10rpx; }
.kv {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.k { color: #5f6f89; font-size: 23rpx; }
.v { color: #1e2a44; font-size: 24rpx; font-weight: 600; }
.empty { margin-top: 12rpx; color: #8d98ac; font-size: 23rpx; }
.log-item {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 14rpx;
  background: rgba(247, 249, 253, 0.9);
}
.log-top { display: flex; justify-content: space-between; gap: 12rpx; }
.action { color: #2f6bff; font-size: 23rpx; font-weight: 700; }
.time { color: #90a0b9; font-size: 21rpx; }
.meta { margin-top: 6rpx; color: #5c6f8f; font-size: 22rpx; }
.payload {
  margin-top: 6rpx;
  color: #44546f;
  font-size: 21rpx;
  line-height: 1.5;
  word-break: break-all;
}
</style>
