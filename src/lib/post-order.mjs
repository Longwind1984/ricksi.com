/**
 * 文章正文保留原始发布日期；列表与翻页优先按本站上传时间排序。
 * 没有 uploadedAt 的既有文章继续使用 date，避免全量补字段。
 */
export function postOrderTime(post) {
  return (post.data.uploadedAt ?? post.data.date).valueOf();
}

export function newestPostFirst(a, b) {
  return (
    postOrderTime(b) - postOrderTime(a) ||
    b.data.date.valueOf() - a.data.date.valueOf() ||
    a.id.localeCompare(b.id)
  );
}
