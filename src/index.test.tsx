import { expect, test } from 'vitest';
import { signal } from 'alien-signals';

const micro = () =>
  new Promise<void>(resolve => queueMicrotask(() => resolve()));

test('div', () => {
  const n = signal(0);
  const d = <div>{n}</div>;
  expect(d.innerText).toBe('0');
  n(1);
  expect(d.innerText).toBe('1');
});

test('counter', () => {
  function Counter() {
    const count = signal(0);
    const inc = () => count(count() + 1);
    return <button onClick={inc}>{count}</button>;
  }
  const counter = Counter();
  expect(counter.textContent).toBe('0');
  counter.click();
  expect(counter.textContent).toBe('1');
});

test('changes in one child do not cause changes in another', async () => {
  const a = signal(10);
  const b = signal(20);
  const c = signal(30);
  const r = (
    <div>
      {() => <div>{a()}</div>}
      {() => <div>{b()}</div>}
      {() => <div>{c()}</div>}
    </div>
  );
  const divA = r.children[0];
  const divC = r.children[2];
  b(21);
  expect(r.children[0]).toBe(divA);
  expect(r.children[1].innerText).toBe('21');
  expect(r.children[2]).toBe(divC);
});

test('empty array as signal result', async () => {
  const a = signal([10]);
  const b = signal([20]);
  const c = signal([30]);
  const r = (
    <div>
      {() => a().map(x => <div>{x}</div>)}
      {() => b().map(x => <div>{x}</div>)}
      {() => c().map(x => <div>{x}</div>)}
    </div>
  );
  await micro();
  expect(r.children[0].innerText).toBe('10');
  expect(r.children[1].innerText).toBe('20');
  expect(r.children[2].innerText).toBe('30');
  b([]);
  await micro();
  expect(r.children[0].innerText).toBe('10');
  expect(r.children[1].innerText).toBe('30');
  b([20]);
  await micro();
  expect(r.children[0].innerText).toBe('10');
  expect(r.children[1].innerText).toBe('20');
  expect(r.children[2].innerText).toBe('30');
});

test('component setup runs untracked', () => {
  const TestComponent = (props: { s: () => number }) => {
    const n = props.s();
    return <span>{n}</span>;
  };

  const s = signal(1);
  const d = <div>{() => <TestComponent s={s} />}</div>;
  const span1 = d.children[0];
  s(2);
  const span2 = d.children[0];
  expect(span1).toBe(span2);
});

test('updates attribute', () => {
  const cssClass = signal('a');
  const d = <div class={cssClass} />;
  expect(d.className).toEqual('a');
  cssClass('b');
  expect(d.className).toEqual('b');
});
