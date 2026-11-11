import { createElement, lazy, useState, type ComponentType } from "react";

/** A prepared screen can render synchronously, without a one-frame Suspense blank. */
export function preloadable<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>
) {
  let ready: ComponentType<P> | undefined;
  let pending: ReturnType<typeof loader> | undefined;
  const preload = () => {
    if (!pending)
      pending = loader()
        .then(module => {
          ready = module.default;
          return module;
        })
        .catch(error => {
          pending = undefined; // A failed background preparation must be retryable.
          throw error;
        });
    return pending;
  };
  const Deferred = lazy(preload);
  function Screen(props: P) {
    // Keep the chosen type stable for this mount: changing from Lazy to the
    // resolved type mid-edit would reset input/canvas state.
    const [Component] = useState(() => ready ?? Deferred);
    return createElement(Component, props);
  }
  return { Screen, preload };
}
