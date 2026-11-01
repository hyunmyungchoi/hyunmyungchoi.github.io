// readPosts에서 정렬한 발행 순서를 유지하고, 같은 글을 홈에서 반복하지 않습니다.
export function selectHomePosts(posts, preferredSlug) {
  const published = posts.filter(post => post.published && post.hasBody);
  const featured = published.find(post => post.slug === preferredSlug) || published[0] || null;
  const recent = published.filter(post => post !== featured).slice(0, 3);
  return { featured, recent };
}
