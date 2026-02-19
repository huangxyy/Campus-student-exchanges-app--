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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLoginEvent(event) {
  if (event === null || event === undefined) {
    return { ok: true };
  }

  if (!isPlainObject(event)) {
    return { ok: false, message: "Invalid event payload" };
  }

  if (event.userInfo !== undefined && !isPlainObject(event.userInfo)) {
    return { ok: false, message: "Invalid userInfo payload" };
  }

  const userInfo = event.userInfo || {};
  if (typeof userInfo.nickName === "string" && userInfo.nickName.length > 80) {
    return { ok: false, message: "nickName is too long" };
  }

  if (typeof userInfo.avatarUrl === "string" && userInfo.avatarUrl.length > 500) {
    return { ok: false, message: "avatarUrl is too long" };
  }

  return { ok: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: -1, message: "Failed to get user identity" };
  }

  const validation = validateLoginEvent(event);
  if (!validation.ok) {
    return {
      code: -2,
      message: validation.message || "Invalid payload"
    };
  }

  const profile = (event && event.userInfo) || {};
  const nickName = sanitizeString(profile.nickName, 20) || "校园用户";
  const avatar = isValidUrl(profile.avatarUrl) ? profile.avatarUrl : "";

  const tokenPayload = `${openid}-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
  const token = crypto.createHash("sha256").update(tokenPayload).digest("hex");

  // 持久化用户信息到云数据库
  const db = cloud.database();
  const now = Date.now();
  let existingUser = null;

  try {
    const userRes = await db.collection("users").where({ userId: openid }).limit(1).get();
    existingUser = userRes.data && userRes.data[0];
  } catch (e) {
    // collection may not exist yet, ignore
  }

  try {
    if (existingUser) {
      // 仅在用户主动提供新信息时更新
      const patch = { lastLoginAt: now };
      if (nickName && nickName !== "校园用户") {
        patch.nickName = nickName;
      }
      if (avatar) {
        patch.avatar = avatar;
      }
      await db.collection("users").where({ userId: openid }).update({ data: patch });
    } else {
      await db.collection("users").add({
        data: {
          userId: openid,
          nickName,
          avatar,
          rating: 5,
          studentId: "",
          phone: "",
          createdAt: now,
          lastLoginAt: now
        }
      });
    }
  } catch (e) {
    // user persistence is non-blocking, login should still succeed
    console.warn("[login] Failed to persist user:", e);
  }

  // 合并已有用户数据
  const mergedNickName = (existingUser && existingUser.nickName && nickName === "校园用户")
    ? existingUser.nickName
    : nickName;
  const mergedAvatar = avatar || (existingUser && existingUser.avatar) || "";
  const mergedRating = (existingUser && existingUser.rating) || 5;
  const mergedStudentId = (existingUser && existingUser.studentId) || "";
  const mergedPhone = (existingUser && existingUser.phone) || "";

  return {
    code: 0,
    message: "ok",
    userInfo: {
      openid,
      nickName: mergedNickName,
      avatar: mergedAvatar,
      avatarUrl: mergedAvatar,
      rating: mergedRating,
      studentId: mergedStudentId,
      phone: mergedPhone
    },
    token
  };
};
