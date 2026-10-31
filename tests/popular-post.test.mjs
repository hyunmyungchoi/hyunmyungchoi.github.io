import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickMostRead} from '../src/lib/popular-post.js';
const posts = [{id:'a',eligible:true},{id:'draft',eligible:false},{id:'b',eligible:true}];
test('selects the highest measured count, excluding drafts', () => {
  assert.deepEqual(pickMostRead(posts,{a:10,draft:999,b:20}), {index:2,id:'b',views:20});
});
test('ties preserve the original post order', () => {
  assert.equal(pickMostRead(posts,{a:20,b:20}).id, 'a');
});
test('missing, malformed, negative and zero-only counts do not create a ranking', () => {
  for (const counts of [null,[],{}, {a:1}, {a:10,b:'20'}, {a:10,b:-1}, {a:0,b:0}, {a:1,b:Infinity}, {a:1,b:0.5}]) assert.equal(pickMostRead(posts,counts),null);
});
test('inherited values are not treated as measured counts', () => {
  assert.equal(pickMostRead(posts,Object.create({a:10,b:20})),null);
});
test('a draft-only collection has no winner', () => {
  assert.equal(pickMostRead([{id:'draft',eligible:false}],{draft:999}),null);
});
