export function createPageTransition(prefersReducedMotion) {
  let revision = 0;
  let activeAnimation = null;
  function clearAnimation() {
    if (activeAnimation) activeAnimation.cancel();
    activeAnimation = null;
  }
  async function play(element, keyframes, duration) {
    activeAnimation = element.animate(keyframes, {duration, easing:'cubic-bezier(.2,.7,.2,1)', fill:'both'});
    await activeAnimation.finished.catch(() => {});
  }
  return {
    async run({outgoing, commit, incoming}) {
      const current = ++revision;
      clearAnimation();
      const animate = !prefersReducedMotion() && typeof outgoing?.animate === 'function';
      try {
        if (animate) {
          await play(outgoing, [{opacity:1, transform:'translateY(0)'}, {opacity:0, transform:'translateY(-4px)'}], 70);
          if (current !== revision) return false;
        }
        commit();
        clearAnimation();
        const next = incoming();
        if (animate && !prefersReducedMotion() && typeof next?.animate === 'function') {
          await play(next, [{opacity:0, transform:'translateY(6px)'}, {opacity:1, transform:'translateY(0)'}], 150);
        }
        return current === revision;
      } finally {
        if (current === revision) clearAnimation();
      }
    },
    finish() { if (activeAnimation) activeAnimation.finish(); }
  };
}
