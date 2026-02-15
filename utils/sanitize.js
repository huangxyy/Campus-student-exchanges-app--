/**
 * 输入消毒与安全工具
 * - XSS 防护：HTML 实体转义
 * - 敏感词过滤
 * - 通用文本清洗
 */

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#96;"
};

const HTML_ESCAPE_RE = /[&<>"'`/]/g;

export function escapeHtml(str) {
  if (typeof str !== "string") {
    return "";
  }
  return str.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

const SENSITIVE_WORDS = [
  "赌博", "代写", "枪手", "刷单", "传销",
  "色情", "毒品", "诈骗", "裸贷", "高利贷"
];

let sensitiveTestRegex = null;
let sensitiveReplaceRegex = null;

function buildSensitivePattern() {
  return SENSITIVE_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

function getSensitiveTestRegex() {
  if (!sensitiveTestRegex) {
    sensitiveTestRegex = new RegExp(buildSensitivePattern(), "i");
  }
  return sensitiveTestRegex;
}

function getSensitiveReplaceRegex() {
  if (!sensitiveReplaceRegex) {
    sensitiveReplaceRegex = new RegExp(buildSensitivePattern(), "gi");
  }
  return sensitiveReplaceRegex;
}

export function containsSensitiveWords(text) {
  if (!text) {
    return false;
  }
  return getSensitiveTestRegex().test(text);
}

export function maskSensitiveWords(text) {
  if (!text) {
    return "";
  }
  return text.replace(getSensitiveReplaceRegex(), (match) => "*".repeat(match.length));
}

export function sanitizeText(text, options = {}) {
  if (typeof text !== "string") {
    return "";
  }

  let result = text;

  // Trim whitespace
  result = result.trim();

  // Remove control characters except newlines and tabs
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Collapse excessive whitespace
  result = result.replace(/[ \t]{4,}/g, "   ");

  // Collapse excessive newlines
  result = result.replace(/\n{4,}/g, "\n\n\n");

  // XSS: escape HTML entities
  if (options.escapeHtml !== false) {
    result = escapeHtml(result);
  }

  // Mask sensitive words
  if (options.filterSensitive !== false) {
    result = maskSensitiveWords(result);
  }

  // Max length
  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result;
}

export function sanitizeUrl(url) {
  if (typeof url !== "string") {
    return "";
  }

  const trimmed = url.trim();

  // Only allow http, https, and wxfile protocols
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("wxfile://") ||
    trimmed.startsWith("cloud://")
  ) {
    return trimmed;
  }

  return "";
}

export function sanitizeNumber(value, min = 0, max = Infinity) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return min;
  }
  return Math.max(min, Math.min(max, num));
}
