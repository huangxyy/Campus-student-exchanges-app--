const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const categoryMap = {
  books: "教材",
  electronics: "数码",
  daily: "生活用品",
  sports: "运动器材",
  other: "其他"
};

exports.main = async (event) => {
  const category = event.category || "other";
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
