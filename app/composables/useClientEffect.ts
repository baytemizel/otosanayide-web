import {onBeforeUnmount, onMounted, watch} from 'vue';

const same = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

/**
 * React's useEffect semantics for ported screens: never runs during SSR, runs after mount
 * and after DOM updates, compares dependencies by value, and an optional returned
 * function cleans up before the next run and on unmount.
 */
export function useClientEffect(deps: () => readonly unknown[], effect: () => void | (() => void)) {
  let cleanup: void | (() => void);
  let stop: (() => void) | undefined;
  const run = () => {
    cleanup?.();
    cleanup = effect();
  };
  onMounted(() => {
    run();
    let previous = deps();
    stop = watch(deps, next => {
      if (same(previous, next)) return;
      previous = next;
      run();
    }, {flush: 'post'});
  });
  onBeforeUnmount(() => {
    stop?.();
    cleanup?.();
  });
}
