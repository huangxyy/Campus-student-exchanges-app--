<script>
import { initCloud } from "@/utils/cloud";

export default {
  onLaunch() {
    initCloud();
  }
};
</script>

<style lang="scss">
@import "uview-plus/index.scss";

page {
  background: $app-bg;
  color: $text-primary;
  font-size: 28rpx;
  --ui-bg: #f5f7fc;
  --ui-surface: #ffffff;
  --ui-primary: #2f6bff;
  --ui-primary-strong: #2459d6;
  --ui-success: #24b987;
  --ui-warning: #f39b34;
  --ui-danger: #e25269;
  --ui-text-main: #1f2430;
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
}

.ui-btn-secondary {
  background: #e7efff;
  color: #325ec0;
}

.ui-btn-ghost {
  background: #eef2fb;
  color: #3f4f6f;
}

.ui-btn-danger {
  background: #fceff1;
  color: $danger-color;
}

button.ui-btn::after,
button.ui-btn-primary::after,
button.ui-btn-secondary::after,
button.ui-btn-ghost::after,
button.ui-btn-danger::after {
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

@keyframes anim-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}

@keyframes anim-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10rpx); }
}

@keyframes anim-shimmer {
  0%   { background-position: -400rpx 0; }
  100% { background-position: 400rpx 0; }
}

@keyframes anim-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(47, 107, 255, 0.25); }
  50%      { box-shadow: 0 0 20rpx 6rpx rgba(47, 107, 255, 0.18); }
}

@keyframes anim-breathe {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}

/* ========== 动画工具类 ========== */

.anim-fade-in  { animation: anim-fade-in 0.5s ease both; }
.anim-slide-up { animation: anim-slide-up 0.5s ease both; }
.anim-slide-down { animation: anim-slide-down 0.45s ease both; }
.anim-scale-in { animation: anim-scale-in 0.45s ease both; }
.anim-slide-left { animation: anim-slide-left 0.5s ease both; }
.anim-slide-right { animation: anim-slide-right 0.5s ease both; }

/* 交错延迟 (用于列表子项) */
.anim-d1 { animation-delay: 0.06s; }
.anim-d2 { animation-delay: 0.12s; }
.anim-d3 { animation-delay: 0.18s; }
.anim-d4 { animation-delay: 0.24s; }
.anim-d5 { animation-delay: 0.30s; }
.anim-d6 { animation-delay: 0.36s; }
.anim-d7 { animation-delay: 0.42s; }
.anim-d8 { animation-delay: 0.48s; }

/* 循环动画 */
.anim-float  { animation: anim-float 3s ease-in-out infinite; }
.anim-pulse  { animation: anim-pulse 2s ease-in-out infinite; }
.anim-glow   { animation: anim-glow 2.5s ease-in-out infinite; }
.anim-breathe { animation: anim-breathe 2.5s ease-in-out infinite; }

/* 按压反馈 */
.press-able {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.press-able:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 12rpx rgba(24, 37, 66, 0.12);
}

/* 卡片悬浮反馈 (按压时微缩 + 阴影变深) */
.card-press {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.card-press:active {
  transform: scale(0.975) translateY(2rpx);
  box-shadow: 0 6rpx 16rpx rgba(24, 37, 66, 0.14);
}

/* 按钮弹性按压 */
.btn-bounce {
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.btn-bounce:active {
  transform: scale(0.93);
}

/* 加载骨架闪光 */
.skeleton-shimmer {
  background: linear-gradient(90deg, #eef2fb 25%, #e3eaf6 50%, #eef2fb 75%);
  background-size: 800rpx 100%;
  animation: anim-shimmer 1.5s infinite linear;
}
</style>
