import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPageTransition} from '../src/scripts/page-transition.js';
const tick = () => new Promise(resolve => setImmediate(resolve));

function element() {
  const animations = [];
  return {
    animations,
    animate(frames, options) {
      let resolve, reject;
      const finished = new Promise((yes,no) => { resolve = yes; reject = no; });
      const animation = {frames, options, finished, cancelled:false, finish:resolve,
        cancel() { this.cancelled = true; reject(new Error('cancelled')); }};
      animations.push(animation);
      return animation;
    }
  };
}

test('commits between the 70ms exit and 150ms entrance, then removes animation styles', async () => {
  const controller = createPageTransition(() => false);
  const home = element(), list = element();
  let committed = false;
  const result = controller.run({outgoing:home, commit:() => { committed = true; }, incoming:() => list});
  assert.equal(committed, false);
  assert.equal(home.animations[0].options.duration,70);
  home.animations[0].finish();
  await tick();
  assert.equal(committed,true);
  assert.equal(home.animations[0].cancelled,true);
  assert.equal(list.animations[0].options.duration,150);
  list.animations[0].finish();
  assert.equal(await result,true);
  assert.equal(list.animations[0].cancelled,true);
});

test('rapid navigation cancels the stale route before it can commit', async () => {
  const controller = createPageTransition(() => false);
  const home = element(), list = element(), committed = [];
  const first = controller.run({outgoing:home,commit:() => committed.push('old'),incoming:() => list});
  const last = controller.run({outgoing:home,commit:() => committed.push('new'),incoming:() => list});
  assert.equal(home.animations[0].cancelled,true);
  home.animations[1].finish();
  await tick();
  assert.deepEqual(committed,['new']);
  list.animations[0].finish();
  assert.equal(await first,false);
  assert.equal(await last,true);
});

test('navigation during entrance leaves the newest animation intact', async () => {
  const controller = createPageTransition(() => false);
  const home = element(), list = element(), destination = element();
  const first = controller.run({outgoing:home,commit:() => {},incoming:() => list});
  home.animations[0].finish();
  await tick();
  const last = controller.run({outgoing:list,commit:() => {},incoming:() => destination});
  await tick();
  assert.equal(await first,false);
  assert.equal(list.animations[0].cancelled,true);
  assert.equal(list.animations[1].cancelled,false);
  list.animations[1].finish();
  await tick();
  destination.animations[0].finish();
  assert.equal(await last,true);
});

test('reduced motion and browsers without animate commit immediately', async () => {
  for (const [reduced, home] of [[true,element()], [false,{}]]) {
    let committed = 0;
    const controller = createPageTransition(() => reduced);
    const result = controller.run({outgoing:home,commit:() => committed++,incoming:() => element()});
    assert.equal(committed,1);
    assert.equal(await result,true);
    assert.equal(home.animations?.length || 0,0);
  }
});

test('enabling reduced motion during exit skips the entrance', async () => {
  let reduced = false;
  const controller = createPageTransition(() => reduced);
  const home = element(), list = element();
  let committed = 0;
  const result = controller.run({outgoing:home,commit:() => committed++,incoming:() => list});
  reduced = true;
  controller.finish();
  assert.equal(await result,true);
  assert.equal(committed,1);
  assert.equal(list.animations.length,0);
});
