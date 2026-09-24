import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, record, undo, redo, canUndo, canRedo } from '../../src/history.js';

test('a new history has nothing to undo or redo', () => {
  const h = createHistory('a');
  assert.equal(h.present, 'a');
  assert.equal(canUndo(h), false);
  assert.equal(canRedo(h), false);
});

test('record, undo and redo move through states', () => {
  let h = createHistory('a');
  h = record(h, 'b');
  h = record(h, 'c');
  h = undo(h);
  assert.equal(h.present, 'b');
  h = undo(h);
  assert.equal(h.present, 'a');
  h = redo(h);
  assert.equal(h.present, 'b');
});

test('recording after an undo clears the redo branch', () => {
  let h = record(record(createHistory('a'), 'b'), 'c');
  h = record(undo(h), 'x');
  assert.equal(canRedo(h), false);
  assert.equal(h.present, 'x');
});

test('recording the same state twice is a no-op', () => {
  const h = record(createHistory('a'), 'a');
  assert.equal(canUndo(h), false);
});

test('history never mutates the previous object', () => {
  const h1 = createHistory('a');
  const h2 = record(h1, 'b');
  assert.equal(h1.present, 'a');
  assert.notEqual(h1, h2);
});

test('history keeps at most the limit of past states', () => {
  let h = createHistory('0', 3);
  for (const s of ['1', '2', '3', '4', '5']) h = record(h, s);
  assert.equal(h.past.length, 3);
  assert.deepEqual(h.past, ['2', '3', '4']);
});

test('undo and redo at the ends return the same history', () => {
  const h = createHistory('a');
  assert.equal(undo(h), h);
  assert.equal(redo(h), h);
});
