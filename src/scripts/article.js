(() => {
  if (!navigator.clipboard?.writeText) return;
  for (const pre of document.querySelectorAll('.article-body pre')) {
    const code = pre.querySelector('code');
    if (!code) continue;
    const button = document.createElement('button');
    button.className = 'copy-code'; button.type = 'button'; button.textContent = '복사';
    button.setAttribute('aria-label','코드 복사');
    button.setAttribute('aria-live','polite');
    button.addEventListener('click',async () => {
      try { await navigator.clipboard.writeText(code.textContent); button.textContent = '복사됨'; }
      catch (_) { button.textContent = '직접 선택해 복사'; }
      setTimeout(() => { button.textContent = '복사'; },2000);
    });
    pre.append(button);
  }
})();
