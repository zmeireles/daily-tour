# `docs/design/`

Visual reference comps and design exports for the Daily Tour PWA. Source-of-truth lives in [`docs/exploration/02-ui-design-system.md`](../exploration/02-ui-design-system.md); this directory captures the **rendered** form of that system.

## Layout

| File / subdir                   | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `tokens-light.svg` _(deferred)_ | Visual palette swatches for the Green Island light theme. |
| `tokens-dark.svg` _(deferred)_  | Same, dark theme.                                         |
| `home.png` _(deferred)_         | Hero mockup of the tokened-guest Home (action grid).      |
| `place-detail.png` _(deferred)_ | Hero mockup of the Place Detail page (hero + actions).    |
| `daily-tour.png` _(deferred)_   | Hero mockup of the Daily Tour timeline.                   |
| `chat.png` _(deferred)_         | Hero mockup of the in-app channel-agnostic chat.          |

## Stitch MCP integration — deferred

The original T-0.4.1 prompt called for Stitch MCP-generated mockups landing in this directory. Status as of merge:

- ✅ **Stitch project created**: `Daily Tour — São Miguel PWA` (`projects/11661203433672958283`, private).
- ⚠️ **Design system + mockup generation deferred** to T-0.4.1.1 (new) or the first task that needs a visual comp for downstream implementation (likely T-1.2.1 Home, T-1.3.2 Place Detail).

Reasons for deferring:

1. The structural deliverable for T-0.4.1 (CSS tokens + Tailwind v4 `@theme` + shadcn semantic-var reskin + Google Fonts) ships as code and is immediately consumable. That's the merge-blocking artifact.
2. Stitch screen generation runs asynchronously (multi-minute per screen) and produces hosted assets. Pulling them into the repo as binary PNGs at scaffold time has weak ROI when no implementation screens exist yet to validate against.
3. Each downstream task (Home, Place Detail, Daily Tour, Chat) is the natural moment to invoke Stitch with that screen's specific brief — the design system has already been characterised in [`02-ui-design-system.md`](../exploration/02-ui-design-system.md).

When the first implementation task is ready, the workflow will be:

```
mcp__stitch__upload_design_md(projectId: 11661203433672958283, file: 02-ui-design-system.md)
mcp__stitch__create_design_system_from_design_md(...)
mcp__stitch__generate_screen_from_text(
  projectId: 11661203433672958283,
  prompt: "...",
  deviceType: "MOBILE",
  designSystem: <id from above>,
)
# Download the resulting screen via get_screen and save to docs/design/<name>.png
```

## Editing tokens

Don't edit visual tokens here. Edit them at the source:

- **Palette + typography + motion**: [`apps/pwa/src/styles/tokens.css`](../../apps/pwa/src/styles/tokens.css)
- **Tailwind v4 `@theme` + shadcn semantic vars**: [`apps/pwa/src/styles/globals.css`](../../apps/pwa/src/styles/globals.css)
- **Source-of-truth rationale (palette anchors, contrast targets)**: [`docs/exploration/02-ui-design-system.md`](../exploration/02-ui-design-system.md)

A future `tokens-light.svg` / `tokens-dark.svg` would be **derived** from those files, not the other way around.
