import { useLayoutEffect, type RefObject } from "react";

/**
 * Space reserved at the bottom of the viewport by a fixed overlay banner.
 *
 * Three banners pin themselves to `bottom-0` at `z-50` (consent, offline,
 * PWA-install) and sit above the app's own bottom-pinned surfaces at `z-30`
 * (the guest tab bar, the discover sheet). A fixed element cannot inherit
 * padding from an ancestor, so the only way those surfaces can get out of the
 * way is to be told how much room to leave.
 *
 * The banner publishes its measured height here; consumers read
 * `var(--bottom-inset)`. Measured rather than hardcoded because the height
 * depends on the locale — the same banner is two lines in English and three in
 * French.
 */
export const BOTTOM_INSET_VAR = "--bottom-inset";

/**
 * Publishes `ref`'s height as `--bottom-inset` on the document root while
 * `active`, and clears it as soon as `active` goes false or the element
 * unmounts.
 *
 * `active` is a required argument rather than being inferred from `ref.current`
 * because a ref going null does not re-run an effect: a banner that returns
 * `null` after the user answers would leave the inset stuck at its last height
 * forever, permanently indenting the layout for a banner that is gone.
 *
 * Only one banner is expected to be visible at a time. If that ever stops being
 * true, this needs to publish the max of the mounted banners rather than the
 * last one to render.
 */
export function usePublishBottomInset(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!active || !el) {
      root.style.removeProperty(BOTTOM_INSET_VAR);
      return;
    }

    const publish = () => {
      root.style.setProperty(BOTTOM_INSET_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`);
    };
    publish();

    // The height changes with locale, viewport width (text reflow) and font
    // loading, so a one-shot measurement goes stale.
    const ro = new ResizeObserver(publish);
    ro.observe(el);

    return () => {
      ro.disconnect();
      root.style.removeProperty(BOTTOM_INSET_VAR);
    };
  }, [ref, active]);
}
