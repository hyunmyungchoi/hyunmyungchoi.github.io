export function pickMostRead(posts, views) {
  if (!Array.isArray(posts) || !views || typeof views !== 'object' || Array.isArray(views)) return null;
  let winner = null;
  for (let index = 0; index < posts.length; index++) {
    const post = posts[index];
    if (!post.eligible) continue;
    // 누락된 집계값을 0으로 추정하지 않습니다.
    if (!Object.prototype.hasOwnProperty.call(views, post.id)) return null;
    const count = views[post.id];
    if (!Number.isSafeInteger(count) || count < 0) return null;
    if (count > 0 && (!winner || count > winner.views)) winner = {index, id:post.id, views:count};
  }
  return winner;
}
