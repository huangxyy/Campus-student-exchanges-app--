const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const profile = event.userInfo || {};

  return {
    code: 0,
    message: "ok",
    userInfo: {
      openid: wxContext.OPENID,
      nickName: profile.nickName || "校园用户",
      avatar: profile.avatarUrl || "",
      rating: 5
    },
    token: `mock-token-${Date.now()}`
  };
};
