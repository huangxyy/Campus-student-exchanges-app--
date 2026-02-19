<script>
import { initCloud } from "@/utils/cloud";
import { getFestivalTheme, getSeasonTheme } from "@/utils/easter-eggs";
import { getStoredToken } from "@/utils/auth";
import { listConversations } from "@/utils/chat-service";

export default {
  globalData: {
    festival: null,
    season: "spring"
  },

  onLaunch() {
    initCloud();

    // 全局彩蛋: 节日检测
    const festival = getFestivalTheme();
    const season = getSeasonTheme();
    this.globalData.festival = festival;
    this.globalData.season = season;

    if (festival) {
      setTimeout(() => {
        uni.showToast({
          title: `${festival.emoji} ${festival.name}快乐！${festival.greeting}`,
          icon: "none",
          duration: 3500
        });
      }, 1500);
    }

    // 初始化未读消息角标
    this.initUnreadBadge();
  },

  methods: {
    async initUnreadBadge() {
      try {
        const token = getStoredToken();
        if (!token) {
          return;
        }
        const conversations = await listConversations().catch(() => []);
        const unread = conversations.reduce((sum, item) => sum + (item.unread || 0), 0);
        if (unread > 0) {
          uni.setTabBarBadge({ index: 2, text: unread > 99 ? "99+" : String(unread) });
        }
      } catch (e) {
        // non-blocking
      }
    }
  }
};
</script>

<style lang="scss">
@import "uview-plus/index.scss";

page {
  background: $app-bg;
  color: $text-primary;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  --ui-bg: #f2f5fc;
  --ui-surface: #ffffff;
  --ui-primary: #2f6bff;
  --ui-primary-strong: #2459d6;
  --ui-success: #24b987;
  --ui-warning: #f39b34;
  --ui-danger: #e25269;
  --ui-text-main: #1a2540;
  --ui-text-soft: #65728a;
  --ui-line: #e5ebf8;
}

.page-container {
  @include page-container;
}

.card {
  @include card-style;
}

.ui-section-title {
  color: #243149;
  font-size: 29rpx;
  font-weight: 700;
}

.ui-chip {
  @include token-chip();
}

.ui-chip-primary {
  @include token-chip(#e6efff, #2d5dc6);
}

.ui-chip-success {
  @include token-chip(#eaf8f2, #23885f);
}

.ui-chip-warning {
  @include token-chip(#fff4e5, #b4751d);
}

.ui-chip-muted {
  @include token-chip(#eef2fb, #5f708e);
}

.ui-btn {
  @include token-btn-base;
}

.ui-btn-primary {
  background: linear-gradient(135deg, $primary-color, $primary-strong);
  color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(47, 107, 255, 0.28);
}

.ui-btn-secondary {
  background: linear-gradient(135deg, #e7efff, #dfe9ff);
  color: #325ec0;
}

.ui-btn-ghost {
  background: #eef2fb;
  color: #3f4f6f;
}

.ui-btn-danger {
  background: linear-gradient(135deg, #fceff1, #ffe8ec);
  color: $danger-color;
}

.ui-btn-muted {
  background: #e8ecf2;
  color: #8a95ac;
  opacity: 0.7;
}

button.ui-btn::after,
button.ui-btn-primary::after,
button.ui-btn-secondary::after,
button.ui-btn-ghost::after,
button.ui-btn-danger::after,
button.ui-btn-muted::after {
  border: none;
}

/* ========== 全局动画 Keyframes ========== */

@keyframes anim-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes anim-slide-up {
  from { opacity: 0; transform: translateY(40rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes anim-slide-down {
  from { opacity: 0; transform: translateY(-30rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes anim-scale-in {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes anim-slide-left {
  from { opacity: 0; transform: translateX(40rpx); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes anim-slide-right {
  from { opacity: 0; transform: translateX(-40rpx); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes anim-bounce-in {
  0%   { opacity: 0; transform: scale(0.3); }
  50%  { opacity: 1; transform: scale(1.08); }
  70%  { transform: scale(0.96); }
  100% { transform: scale(1); }
}

@keyframes anim-wiggle {
  0%, 100% { transform: rotate(0); }
  15%      { transform: rotate(-6deg); }
  30%      { transform: rotate(5deg); }
  45%      { transform: rotate(-4deg); }
  60%      { transform: rotate(2deg); }
  75%      { transform: rotate(-1deg); }
}

@keyframes anim-spin-in {
  from { opacity: 0; transform: rotate(-180deg) scale(0.5); }
  to   { opacity: 1; transform: rotate(0) scale(1); }
}

@keyframes anim-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}

@keyframes anim-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10rpx); }
}

@keyframes anim-float-x {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(8rpx); }
}

@keyframes anim-shimmer {
  0%   { background-position: -400rpx 0; }
  100% { background-position: 400rpx 0; }
}

@keyframes anim-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(47, 107, 255, 0.25); }
  50%      { box-shadow: 0 0 20rpx 6rpx rgba(47, 107, 255, 0.18); }
}

@keyframes anim-glow-soft {
  0%, 100% { box-shadow: 0 4rpx 16rpx rgba(47, 107, 255, 0.12); }
  50%      { box-shadow: 0 8rpx 32rpx rgba(47, 107, 255, 0.28); }
}

@keyframes anim-breathe {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}

@keyframes anim-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes anim-ring-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(47, 107, 255, 0.4); }
  70%  { box-shadow: 0 0 0 16rpx rgba(47, 107, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 107, 255, 0); }
}

@keyframes anim-ring-pulse-success {
  0%   { box-shadow: 0 0 0 0 rgba(36, 185, 135, 0.4); }
  70%  { box-shadow: 0 0 0 16rpx rgba(36, 185, 135, 0); }
  100% { box-shadow: 0 0 0 0 rgba(36, 185, 135, 0); }
}

@keyframes anim-count-up {
  from { opacity: 0; transform: translateY(14rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes anim-blink-cursor {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

@keyframes anim-border-flow {
  0%   { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

/* ========== 动画工具类 ========== */

.anim-fade-in    { animation: anim-fade-in 0.5s ease forwards; }
.anim-slide-up   { animation: anim-slide-up 0.5s ease forwards; }
.anim-slide-down { animation: anim-slide-down 0.45s ease forwards; }
.anim-scale-in   { animation: anim-scale-in 0.45s ease forwards; }
.anim-slide-left { animation: anim-slide-left 0.5s ease forwards; }
.anim-slide-right { animation: anim-slide-right 0.5s ease forwards; }
.anim-bounce-in  { animation: anim-bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.anim-spin-in    { animation: anim-spin-in 0.5s ease forwards; }

/* 交错延迟 (用于列表子项) */
.anim-d1  { animation-delay: 0.06s; }
.anim-d2  { animation-delay: 0.12s; }
.anim-d3  { animation-delay: 0.18s; }
.anim-d4  { animation-delay: 0.24s; }
.anim-d5  { animation-delay: 0.30s; }
.anim-d6  { animation-delay: 0.36s; }
.anim-d7  { animation-delay: 0.42s; }
.anim-d8  { animation-delay: 0.48s; }
.anim-d9  { animation-delay: 0.54s; }
.anim-d10 { animation-delay: 0.60s; }
.anim-d11 { animation-delay: 0.66s; }
.anim-d12 { animation-delay: 0.72s; }

/* 循环动画 */
.anim-float   { animation: anim-float 3s ease-in-out infinite; }
.anim-float-x { animation: anim-float-x 4s ease-in-out infinite; }
.anim-pulse   { animation: anim-pulse 2s ease-in-out infinite; }
.anim-glow    { animation: anim-glow 2.5s ease-in-out infinite; }
.anim-glow-soft { animation: anim-glow-soft 3s ease-in-out infinite; }
.anim-breathe { animation: anim-breathe 2.5s ease-in-out infinite; }
.anim-wiggle  { animation: anim-wiggle 1.2s ease-in-out; }
.anim-ring    { animation: anim-ring-pulse 1.5s ease infinite; }
.anim-ring-success { animation: anim-ring-pulse-success 1.5s ease infinite; }
.anim-count   { animation: anim-count-up 0.4s ease forwards; }
.anim-gradient { animation: anim-gradient-shift 4s ease infinite; background-size: 200% 200%; }

/* ========== 玻璃态工具类 ========== */

.glass {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.4);
}

.glass-strong {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 8rpx 32rpx rgba(31, 38, 56, 0.08);
}

.glass-dark {
  background: rgba(31, 36, 48, 0.6);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ========== 渐变边框 ========== */

.border-gradient {
  position: relative;
  border: none !important;
}
.border-gradient::before {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  padding: 2rpx;
  border-radius: inherit;
  background: linear-gradient(135deg, #2f6bff, #13c2a3, #7c3aed, #2f6bff);
  background-size: 200% 100%;
  animation: anim-border-flow 3s linear infinite;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  pointer-events: none;
}

/* ========== 按压反馈 ========== */

.press-able {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.press-able:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 12rpx rgba(24, 37, 66, 0.12);
}

.card-press {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}
.card-press:active {
  transform: scale(0.97) translateY(2rpx);
  box-shadow: 0 4rpx 14rpx rgba(24, 37, 66, 0.16);
}

.btn-bounce {
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
}
.btn-bounce:active {
  transform: scale(0.92);
  box-shadow: 0 2rpx 8rpx rgba(24, 37, 66, 0.12);
}

/* 涟漪按压效果 */
.ripple-wrap {
  position: relative;
  overflow: hidden;
}
.ripple-wrap::after {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), rgba(47, 107, 255, 0.18), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.ripple-wrap:active::after {
  opacity: 1;
}

/* ========== 增强卡片样式 ========== */

.card-elevated {
  background: #ffffff;
  border-radius: $radius-card;
  border: 1rpx solid rgba(228, 235, 251, 0.8);
  box-shadow:
    0 4rpx 12rpx rgba(31, 38, 66, 0.04),
    0 16rpx 40rpx rgba(31, 38, 66, 0.06);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.card-elevated:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 12rpx rgba(31, 38, 66, 0.08);
}

.card-glow {
  @include card-style;
  transition: box-shadow 0.4s ease;
}
.card-glow:active {
  box-shadow: 0 0 0 4rpx rgba(47, 107, 255, 0.12), 0 8rpx 24rpx rgba(47, 107, 255, 0.14);
}

/* ========== 图片效果 ========== */

.img-zoom-wrap {
  overflow: hidden;
}
.img-zoom-wrap image {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.img-zoom-wrap:active image {
  transform: scale(1.06);
}

.img-shine {
  position: relative;
  overflow: hidden;
}
.img-shine::after {
  content: "";
  position: absolute;
  top: 0; left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  animation: anim-img-shine 2.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes anim-img-shine {
  0%   { left: -100%; }
  50%  { left: 150%; }
  100% { left: 150%; }
}

/* ========== 加载骨架 ========== */

.skeleton-shimmer {
  background: linear-gradient(90deg, #eef2fb 25%, #e3eaf6 50%, #eef2fb 75%);
  background-size: 800rpx 100%;
  animation: anim-shimmer 1.5s infinite linear;
}

.skeleton-pulse {
  animation: anim-breathe 1.5s ease-in-out infinite;
  background: #eef2fb;
  border-radius: 12rpx;
}

/* ========== 数字动画辅助 ========== */

.num-animate {
  display: inline-block;
  animation: anim-count-up 0.5s ease both;
}

/* ========== 徽标/标签增强 ========== */

.badge-dot {
  position: relative;
}
.badge-dot::after {
  content: "";
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e25269;
  border: 2rpx solid #fff;
  animation: anim-pulse 2s ease-in-out infinite;
}

.tag-new {
  display: inline-block;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  animation: anim-pulse 2s ease-in-out infinite;
}

/* ========== 分割线增强 ========== */

.divider-gradient {
  height: 1rpx;
  background: linear-gradient(90deg, transparent, #e0e8f8, transparent);
}
</style>
