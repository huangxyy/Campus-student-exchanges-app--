<template>
  <view class="legal-page">
    <view class="card anim-slide-down">
      <view class="legal-title">用户协议</view>
      <view class="legal-date">更新日期：2026-02-15</view>

      <view class="legal-section">
        <view class="section-heading">一、服务说明</view>
        <view class="section-body">
          <text>校园集市是一款面向高校在校师生的二手物品交易与校园互助小程序，提供商品发布与浏览、任务发布与接单、聊天沟通、求购匹配、校园动态、维基知识库等功能。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">二、账号注册与使用</view>
        <view class="section-body">
          <text>1. 您需要通过微信授权登录使用本应用的完整功能。</text>
          <text>2. 您应确保提供的信息真实准确，不得冒用他人身份。</text>
          <text>3. 您有责任妥善保管自己的账号，因账号使用产生的行为由账号持有人承担。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">三、用户行为规范</view>
        <view class="section-body">
          <text>使用本应用时，您不得：</text>
          <text>1. 发布虚假、违法或侵权的商品及内容信息。</text>
          <text>2. 发布与校园二手交易无关的广告或商业推广。</text>
          <text>3. 利用平台从事欺诈、传销、赌博等违法活动。</text>
          <text>4. 骚扰、辱骂、威胁其他用户。</text>
          <text>5. 恶意刷单、刷积分、操纵信用分等破坏平台秩序的行为。</text>
          <text>6. 利用技术手段攻击平台或干扰正常运行。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">四、交易规则</view>
        <view class="section-body">
          <text>1. 本平台仅提供信息撮合服务，不参与买卖双方的实际交易。</text>
          <text>2. 交易双方应自行协商价格、交付方式和交易地点。</text>
          <text>3. 建议在校园公共区域进行当面交易，确保人身和财产安全。</text>
          <text>4. 因交易产生的纠纷由买卖双方自行协商解决，平台可协助提供交易记录。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">五、内容管理</view>
        <view class="section-body">
          <text>1. 您发布的内容应遵守国家法律法规和社会公德。</text>
          <text>2. 平台有权对违规内容进行删除、屏蔽等处理。</text>
          <text>3. 对多次违规的用户，平台有权限制或终止其使用权限。</text>
          <text>4. 您对自己发布的内容承担法律责任。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">六、知识产权</view>
        <view class="section-body">
          <text>1. 本应用的软件、设计、文案等内容受知识产权法保护。</text>
          <text>2. 您发布的原创内容版权归您所有，但您授权平台在服务范围内使用。</text>
          <text>3. 您不得未经授权使用其他用户或第三方的知识产权内容。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">七、免责声明</view>
        <view class="section-body">
          <text>1. 因不可抗力、系统维护等原因导致服务中断，平台不承担责任。</text>
          <text>2. 平台不对用户发布信息的真实性和合法性承担担保责任。</text>
          <text>3. 因用户自身原因导致的损失，平台不承担赔偿责任。</text>
        </view>
      </view>

      <view class="legal-section">
        <view class="section-heading">八、协议修订</view>
        <view class="section-body">
          <text>我们保留修订本协议的权利。修订后的协议将在应用内公布，继续使用本应用即视为同意修订后的协议。</text>
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
