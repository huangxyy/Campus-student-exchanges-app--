<template>
  <view class="legal-page">
    <view class="card anim-slide-down">
      <view class="legal-title">隐私政策</view>
      <view class="legal-date">更新日期：2026-02-15</view>

      <view class="legal-section">
        <view class="section-heading">一、我们收集的信息</view>
        <view class="section-body">
          <text>1. 账号信息：当您使用微信登录时，我们会获取您的微信昵称和头像，用于展示您的个人资料。</text>
          <text>2. 发布内容：您发布的商品、任务、动态、维基文章等内容信息。</text>
          <text>3. 交易信息：订单记录、评价信息，用于保障交易安全。</text>
          <text>4. 设备信息：设备型号、操作系统版本，用于优化应用兼容性。</text>
          <text>5. 位置信息：仅在您主动使用地图选点功能时获取，用于标注交易地点。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">二、信息的使用</view>
        <view class="section-body">
          <text>1. 提供核心服务：展示商品、匹配求购、撮合交易、传递消息。</text>
          <text>2. 安全保障：识别违规内容、防止欺诈行为、维护社区秩序。</text>
          <text>3. 体验优化：分析使用习惯以改进产品功能和性能。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">三、信息的共享</view>
        <view class="section-body">
          <text>我们不会将您的个人信息出售给第三方。仅在以下情况下可能共享：</text>
          <text>1. 经您明确同意的情况下。</text>
          <text>2. 根据法律法规的要求或政府主管部门的强制性要求。</text>
          <text>3. 交易对手方为完成交易所必需的信息（如昵称、聊天内容）。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">四、信息的存储与保护</view>
        <view class="section-body">
          <text>1. 数据存储于微信云开发平台，受微信安全体系保护。</text>
          <text>2. 部分数据缓存于本地设备，以支持离线浏览。</text>
          <text>3. 我们采取合理的技术措施防止数据泄露、篡改和丢失。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">五、您的权利</view>
        <view class="section-body">
          <text>1. 您可以随时在设置页修改昵称和头像。</text>
          <text>2. 您可以删除已发布的内容。</text>
          <text>3. 您可以通过清除缓存删除本地存储的数据。</text>
          <text>4. 您可以随时退出登录以停止信息收集。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">六、未成年人保护</view>
        <view class="section-body">
          <text>本应用主要面向高校在校学生。如您为未满18周岁的未成年人，请在监护人指导下使用本应用。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">七、政策更新</view>
        <view class="section-body">
          <text>我们可能会不时更新本隐私政策。更新后的政策将在本页面公布，重大变更将以弹窗形式通知您。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">八、联系我们</view>
        <view class="section-body">
          <text>如您对本隐私政策有任何疑问，请通过应用内"设置 > 关于"页面中的联系方式与我们取得联系。</text>
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
  padding: 24rpx;
  padding-bottom: 80rpx;
  background: #f5f7fc;
}
.legal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2430;
  text-align: center;
}
.legal-date {
  text-align: center;
  color: #8a93a7;
  font-size: 22rpx;
  margin-top: 8rpx;
  margin-bottom: 24rpx;
}
.legal-section {
  margin-top: 20rpx;
}
.section-heading {
  font-size: 28rpx;
  font-weight: 600;
  color: #25324a;
  margin-bottom: 10rpx;
}
.section-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.section-body text {
  font-size: 25rpx;
  color: #4a5568;
  line-height: 1.8;
}
</style>
