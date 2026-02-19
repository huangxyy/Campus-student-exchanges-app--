const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const categoryMap = {
  books: "教材",
  electronics: "数码",
  daily: "生活用品",
  sports: "运动器材",
  other: "其他"
};

const ALLOWED_CATEGORIES = new Set(Object.keys(categoryMap));

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeCategory(event) {
  if (event === null || event === undefined) {
    return { ok: true, category: "other" };
  }

  if (!isPlainObject(event)) {
    return { ok: false, message: "Invalid event payload" };
  }

  const rawCategory = event.category;
  if (rawCategory === null || rawCategory === undefined || rawCategory === "") {
    return { ok: true, category: "other" };
  }

  if (typeof rawCategory !== "string") {
    return { ok: false, message: "category must be a string" };
  }

  if (rawCategory.length > 30) {
    return { ok: false, message: "category is too long" };
  }

  const category = rawCategory.trim().toLowerCase();
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { ok: false, message: "category is not allowed" };
  }

  return { ok: true, category };
}

exports.main = async (event) => {
  const categoryRes = normalizeCategory(event);
  if (!categoryRes.ok) {
    return {
      success: false,
      code: -1,
      message: categoryRes.message || "Invalid payload"
    };
  }

  const category = categoryRes.category;
  const categoryText = categoryMap[category] || "校园好物";

  return {
    success: true,
    data: {
      title: `${categoryText}低价转让`,
      description: `这是一件${categoryText}，成色良好，功能正常，日常使用没有问题。校内可自提，支持当面验货，感兴趣欢迎私聊。`,
      suggestedTags: ["校园二手", categoryText, "自提"]
    }
  };
};
