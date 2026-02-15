const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function sanitizeString(str, maxLen = 30) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F<>]/g, "").trim().slice(0, maxLen);
}

function isValidUrl(url) {
  if (typeof url !== "string") return false;
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("wxfile://");
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: -1, message: "Failed to get user identity" };
  }

  const profile = event.userInfo || {};
  const nickName = sanitizeString(profile.nickName, 20) || "校园用户";
  const avatar = isValidUrl(profile.avatarUrl) ? profile.avatarUrl : "";

  const tokenPayload = `${openid}-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
  const token = crypto.createHash("sha256").update(tokenPayload).digest("hex");

  return {
    code: 0,
    message: "ok",
    userInfo: {
      openid,
      nickName,
      avatar,
      rating: 5
    },
    token
  };
};
