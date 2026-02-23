<template>
  <view class="legal-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
    </view>

    <view class="legal-card glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="legal-header">
        <text class="legal-icon">🔒</text>
        <view>
          <view class="legal-title">隐私政策</view>
          <view class="legal-date">更新日期：2026-02-15</view>
        </view>
      </view>

      <view class="legal-section anim-fade-in anim-d1">
        <view class="section-heading">
          <text class="heading-num">一</text>
          <text>我们收集的信息</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>账号信息：当您使用微信登录时，我们会获取您的微信昵称和头像，用于展示您的个人资料。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>发布内容：您发布的商品、任务、动态、维基文章等内容信息。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>交易信息：订单记录、评价信息，用于保障交易安全。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>设备信息：设备型号、操作系统版本，用于优化应用兼容性。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>位置信息：仅在您主动使用地图选点功能时获取，用于标注交易地点。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d2">
        <view class="section-heading">
          <text class="heading-num">二</text>
          <text>信息的使用</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>提供核心服务：展示商品、匹配求购、撮合交易、传递消息。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>安全保障：识别违规内容、防止欺诈行为、维护社区秩序。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>体验优化：分析使用习惯以改进产品功能和性能。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d3">
        <view class="section-heading">
          <text class="heading-num">三</text>
          <text>信息的共享</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>我们不会将您的个人信息出售给第三方。仅在以下情况下可能共享：</text></view>
          <view class="body-item sub"><text class="item-dot"></text><text>经您明确同意的情况下。</text></view>
          <view class="body-item sub"><text class="item-dot"></text><text>根据法律法规的要求或政府主管部门的强制性要求。</text></view>
          <view class="body-item sub"><text class="item-dot"></text><text>交易对手方为完成交易所必需的信息（如昵称、聊天内容）。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d4">
        <view class="section-heading">
          <text class="heading-num">四</text>
          <text>信息的存储与保护</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>数据存储于微信云开发平台，受微信安全体系保护。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>部分数据缓存于本地设备，以支持离线浏览。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>我们采取合理的技术措施防止数据泄露、篡改和丢失。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d5">
        <view class="section-heading">
          <text class="heading-num">五</text>
          <text>您的权利</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>您可以随时在设置页修改昵称和头像。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>您可以删除已发布的内容。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>您可以通过清除缓存删除本地存储的数据。</text></view>
          <view class="body-item"><text class="item-dot"></text><text>您可以随时退出登录以停止信息收集。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d6">
        <view class="section-heading">
          <text class="heading-num">六</text>
          <text>未成年人保护</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>本应用主要面向高校在校学生。如您为未满18周岁的未成年人，请在监护人指导下使用本应用。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d7">
        <view class="section-heading">
          <text class="heading-num">七</text>
          <text>政策更新</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>我们可能会不时更新本隐私政策。更新后的政策将在本页面公布，重大变更将以弹窗形式通知您。</text></view>
        </view>
      </view>

      <view class="divider-gradient"></view>

      <view class="legal-section anim-fade-in anim-d8">
        <view class="section-heading">
          <text class="heading-num">八</text>
          <text>联系我们</text>
        </view>
        <view class="section-body">
          <view class="body-item"><text class="item-dot"></text><text>如您对本隐私政策有任何疑问，请通过应用内"设置 > 关于"页面中的联系方式与我们取得联系。</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {};
</script>

<style lang="scss" scoped>
.legal-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 80rpx;
  min-height: 100vh;
  overflow: hidden;
  background: $page-bg;
}

.page-orbs {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.35;
}
.orb-1 {
  width: 180rpx; height: 180rpx;
  top: -20rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.25), transparent 70%);
}

.legal-card {
  position: relative;
  padding: 28rpx;
  overflow: hidden;
}

.legal-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
}
.legal-icon { font-size: 40rpx; }
.legal-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1a2540;
}
.legal-date {
  color: #8a95ac;
  font-size: 22rpx;
  margin-top: 4rpx;
}

.legal-section {
  padding: 16rpx 0;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2540;
  margin-bottom: 14rpx;
}
.heading-num {
  width: 40rpx; height: 40rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0.04));
  color: #4a78d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-left: 50rpx;
}
.body-item {
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
}
.body-item.sub {
  padding-left: 16rpx;
}
.body-item text:last-child {
  font-size: 25rpx;
  color: #5a6a88;
  line-height: 1.8;
  flex: 1;
}
.item-dot {
  width: 8rpx; height: 8rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  margin-top: 16rpx;
  flex-shrink: 0;
}
</style>
