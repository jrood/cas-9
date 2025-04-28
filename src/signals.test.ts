import { expect, test } from 'vitest';
import { signal, computed, effect } from './signals';

test('diamond problem', async () => {
  /*       avg
   *      ↗   ↖
   *  count   total
   *      ↖   ↗
   *     numbers
   */

  const numbers = signal([1, 2]);

  let countRuns = 0;
  const count = computed(() => {
    countRuns++;
    return numbers().length;
  });

  let totalRuns = 0;
  const total = computed(() => {
    totalRuns++;
    return numbers().reduce((_total, n) => (_total += n), 0);
  });

  expect(countRuns).toBe(0);
  expect(totalRuns).toBe(0);

  let avg = 0;
  let effectRuns = 0;
  effect(() => {
    effectRuns++;
    avg = total() / count();
  });

  expect(countRuns).toBe(1);
  expect(totalRuns).toBe(1);
  expect(effectRuns).toBe(1);
  expect(avg).toBe(1.5);

  numbers([1, 2, 3]);

  expect(countRuns).toBe(2);
  expect(totalRuns).toBe(2);
  expect(effectRuns).toBe(2);
  expect(avg).toBe(2);
});

test('flag problem', async () => {
  /* count & avg
   *    ↑ ↖
   *    ↑  total
   *    ↑ ↗
   * numbers
   */

  const numbers = signal([1, 2]);

  let totalRuns = 0;
  const total = computed(() => {
    totalRuns++;
    return numbers().reduce((_total, n) => (_total += n), 0);
  });

  expect(totalRuns).toBe(0);

  let avg = 0;
  let effectRuns = 0;
  effect(() => {
    effectRuns++;
    avg = total() / numbers().length;
  });

  expect(totalRuns).toBe(1);
  expect(effectRuns).toBe(1);
  expect(avg).toBe(1.5);

  numbers([1, 2, 3]);

  expect(totalRuns).toBe(2);
  expect(effectRuns).toBe(2);
  expect(avg).toBe(2);
});

test('computed does not run until accessed, but returns correct value immediately when called directly', async () => {
  const s = signal(0);
  let doubleRuns = 0;
  const double = computed(() => {
    doubleRuns++;
    return s() * 2;
  });
  s(1);
  expect(doubleRuns).toBe(0);
  expect(double()).toBe(2);
  expect(doubleRuns).toBe(1);
  expect(doubleRuns).toBe(1);
});

test('inner effects are disposed when outer effects re-run', async () => {
  const a = signal(Symbol());
  const b = signal(Symbol());

  let outerRuns = 0;
  let innerRuns = 0;
  effect(() => {
    outerRuns++;
    a();
    effect(() => {
      innerRuns++;
      b();
    });
  });
  b(Symbol());
  a(Symbol());
  b(Symbol());
  expect(outerRuns).toBe(2);
  expect(innerRuns).toBe(4); // would be 6 if inner effects are not disposed
});

test('inner effects are disposed when outer computeds re-run', async () => {
  const a = signal(Symbol());
  const b = signal(Symbol());

  let outerRuns = 0;
  let innerRuns = 0;
  const outer = computed(() => {
    outerRuns++;
    a();
    effect(() => {
      innerRuns++;
      b();
    });
  });
  outer();
  b(Symbol());
  a(Symbol());
  outer();
  b(Symbol());
  expect(outerRuns).toBe(2);
  expect(innerRuns).toBe(4); // would be 6 if inner effects are not disposed
});
