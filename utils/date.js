/**
 * 格式化为 YYYY-MM-DD
 */
export function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 格式化为 YYYY-MM-DD HH:mm
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const date = formatDate(timestamp);
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${date} ${h}:${min}`;
}

/**
 * 判断是否为今天
 */
export function isToday(timestamp) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

/**
 * 判断两个时间戳是否同一天
 */
export function isSameDay(ts1, ts2) {
  if (!ts1 || !ts2) return false;
  const a = new Date(ts1);
  const b = new Date(ts2);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "刚刚";
  }

  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  }

  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const dayText = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${dayText}`;
}
