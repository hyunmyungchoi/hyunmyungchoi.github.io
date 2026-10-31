import { seriesNames } from '../data/navigation.js';
import { createCategoryNavigation } from './category-navigation.js';

export function createPostFilter(cards) {
  const posts = [...document.querySelectorAll('#post-list > .post')];
  const input = document.querySelector('#search-input');
  const title = document.querySelector('#feed-title');
  const page = document.querySelector('#latest');
  const categories = createCategoryNavigation(page.querySelector('.sidebar'));

  function update(selected, homeMode) {
    const query = input.value.trim().toLocaleLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const post of posts) {
      const searchable = (post.textContent + ' ' + post.dataset.tags).toLocaleLowerCase();
      const matches = !selected || (selected.type === 'series' ? post.dataset.series === selected.value : post.dataset.tags.split(',').includes(selected.value));
      post.hidden = !(matches && terms.every(term => searchable.includes(term)));
      if (!post.hidden) visible++;
    }
    const name = selected ? (selected.type === 'series' ? seriesNames[selected.value] : selected.value) : '';
    categories.update(selected, name);
    const inSeries = selected?.type === 'series';
    title.textContent = inSeries ? name : query ? '검색 결과' : name || '전체 글';
    document.querySelector('#result-count').textContent = visible + '개';
    document.querySelector('#filter-state').hidden = !query && (!selected || inSeries);
    document.querySelector('#filter-label').textContent = [inSeries ? '' : name, query ? '“' + input.value.trim() + '”' : ''].filter(Boolean).join(' / ');
    page.classList.toggle('is-series', inSeries);
    const cover = document.querySelector('#series-context-cover');
    const label = document.querySelector('#series-context-label');
    cover.hidden = label.hidden = !inSeries;
    document.querySelector('#series-return').hidden = !selected;
    document.querySelector('#home-return-label').textContent = inSeries ? '연재로 돌아가기' : 'INDEX로 돌아가기';
    if (inSeries) {
      cover.src = cards.find(card => card.hash === '#series/' + selected.value).querySelector('img').src;
      label.textContent = '연재' + (query ? ' · 검색 결과' : '');
    }
    document.querySelector('#empty-state').hidden = visible !== 0;
    const hasSelectedPosts = selected && posts.some(post => inSeries ? post.dataset.series === selected.value : post.dataset.tags.split(',').includes(selected.value));
    const waitingForPosts = !query && (selected ? !hasSelectedPosts : posts.length === 0);
    document.querySelector('#empty-title').textContent = waitingForPosts ? (selected ? (inSeries ? '이 연재에는 아직 발행된 글이 없습니다.' : '이 주제에는 아직 발행된 글이 없습니다.') : '아직 발행된 글이 없습니다.') : '일치하는 글이 없습니다.';
    document.querySelector('#empty-description').textContent = waitingForPosts ? '글이 발행되면 이곳에서 읽을 수 있습니다.' : '다른 검색어를 입력하거나 필터를 해제해 주세요.';
    document.querySelector('#list-end').hidden = visible === 0;
    for (const button of document.querySelectorAll('.series-item')) button.setAttribute('aria-pressed', String(selected?.type === 'series' && selected.value === button.dataset.seriesFilter));
    for (const button of document.querySelectorAll('.topic-button')) button.setAttribute('aria-pressed', String(selected?.type === 'topic' && selected.value === button.dataset.topic));
    for (const link of document.querySelectorAll('.nav a')) {
      if (link.hash === (homeMode ? '#home' : '#latest')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
  return { input, title, page, update };
}
