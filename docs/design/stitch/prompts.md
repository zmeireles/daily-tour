# Stitch screen prompts — Daily Tour São Miguel (T-2.B.0)

Reusable prompts for the 5 Slice-2.B mockups. Project **`Daily Tour — São Miguel PWA`**
(`projects/11661203433672958283`, private). Design system **São Miguel Editorial**
(asset `8a6674ad896243c8881fc985aee6f504`) — see [`../DESIGN.md`](../DESIGN.md).
Device: **MOBILE**. Direction: premium/editorial ("travel magazine, not booking app"),
dark "Field Journal" aesthetic, Green Island palette anchors.

> **Status 2026-06-15:** Home exists (2 iterations). The other 4 were attempted via the
> Stitch MCP `generate_screen_from_text` but the MCP transport timed out and the
> generation did not persist server-side across 4 attempts (~20 min) — see session-handoff.
> These prompts are ready to paste into the Stitch web UI (labs.google.com/stitch) on the
> existing project + design system, OR to re-fire via MCP if the timeout is resolved.

## 1. Home — ✅ generated

Dark editorial home: brand wordmark + EN/PT switcher + avatar; Newsreader "Welcome back,"
headline; 6 cream action cards (Eat/Drink/See/Do/Buy/Move) with tea-green line icons;
"Host's picks" horizontal ribbon with photo cards + hydrangea distance chips; tea-green
bottom tab bar (Explore/Saved/Host/Profile).

## 2. Place Detail

> Place-detail screen for the "Daily Tour São Miguel" premium editorial PWA (dark "Field Journal" aesthetic, basalt-950 #0E1413 canvas). Top ~45%: a full-bleed photographic hero of Lagoa do Fogo (a volcanic crater lake), with a soft dark gradient scrim at the bottom for legibility, a back chevron top-left and a bookmark/save outline icon top-right. Overlaid lower-left on the hero: a small attribution credit chip in label-sm reading "© Samuel Fonseca · CC BY-SA 3.0". Below the hero on the dark canvas: an uppercase tea-green (#2F5D43) overline "NATURAL LANDMARK · 14 KM", then the place name "Lagoa do Fogo" in a large Newsreader serif headline, then a row of two hydrangea-blue (#5B6FB8) category chips "Hiking" and "Viewpoint". A relaxed Inter body paragraph (max 65 characters per line) describing the crater lake and its protected nature reserve. A 1px basalt divider. Then a row of three primary deep-link action tiles rendered as tea-green rounded-md buttons, each with a line icon and label: "Directions", "Call", "Website". Below, a compact borderless "Opening hours" list with 1px basalt dividers, and a "Best season — Summer" line marked with a small sun-amber (#E6B566) dot. No emojis, no invented statistics. Fixed bottom tab bar matching Home: Explore, Saved, Host, Profile, with Explore active in tea-green.

## 3. Discover / Map

> Discover / map screen for the "Daily Tour São Miguel" premium editorial PWA (dark "Field Journal" aesthetic). Top ~55%: an immersive dark-styled interactive map of São Miguel island (muted basalt-tinted map tiles), with several tea-green (#2F5D43) location pins and one larger selected pin, a floating rounded search field pinned at the top reading "Search places on São Miguel", and a small circular "locate me" control bottom-right of the map. Bottom ~45%: a draggable cream-surfaced (#F7F4EC) sheet with rounded-lg top corners (paper-on-stone) titled "Nearby" in a Newsreader serif headline with basalt text, containing a horizontal "peek" ribbon of editorial place cards — each card a photo with a rounded top, the place name in tea-green ("Sete Cidades", "Gorreana Tea Estate", "Furnas"), a small uppercase category overline, and a hydrangea-blue (#5B6FB8) distance chip like "3.2 km". The next card partially peeks at the right edge to signal horizontal scroll. No emojis, no fabricated metrics. Fixed bottom tab bar matching Home: Explore (active, tea-green), Saved, Host, Profile.

## 4. Daily Tour (itinerary)

> "Daily Tour" itinerary screen for the "Daily Tour São Miguel" premium editorial PWA (dark "Field Journal" aesthetic, basalt-950 canvas). Header: an uppercase sun-amber (#E6B566) overline "YOUR DAILY TOUR", a Newsreader serif headline "A day around Furnas", and a quiet Inter subline "Five stops · about 6 hours". Below: a vertical timeline running down the left as a 1px basalt line with tea-green (#2F5D43) node dots. Each stop is an editorial row with a small rounded thumbnail photo, the stop name in tea-green (in order: "Terra Nostra Park", "Furnas Caldeiras", "Lagoa das Furnas", "Gorreana Tea Estate", "Miradouro do Pico do Ferro"), a time label (e.g. "09:30"), and a one-line Inter description. Between consecutive stops, a subtle travel-time connector chip in sun-amber with a small car or walking line icon, e.g. "12 min drive". A primary tea-green rounded-md button fixed near the bottom: "Share this tour". No emojis, no fabricated data. Fixed bottom tab bar matching Home: Explore, Saved, Host, Profile.

## 5. Chat

> In-app chat screen for the "Daily Tour São Miguel" premium editorial PWA (dark "Field Journal" aesthetic, basalt-950 canvas). Top app bar: a back chevron, a small circular avatar, the host name "João · Casa do Sol" with a subtle "Online" status beneath. The conversation area shows alternating message bubbles: host/assistant bubbles left-aligned with a cream (#F7F4EC) surface and basalt text (rounded-lg, no shadow); guest bubbles right-aligned with a tea-green (#2F5D43) fill and cream text. The conversation reads naturally about local recommendations — the guest asks where to watch the sunset, the host suggests a viewpoint. Include one rich assistant suggestion rendered as a small editorial place card embedded inside a left bubble: a photo with rounded top, the name "Miradouro da Vista do Rei" in tea-green, and a hydrangea-blue (#5B6FB8) distance chip "9 km". Timestamps in muted label-sm. Bottom: a rounded message input field with a calm microphone line icon and a tea-green circular send button. No emojis. This screen is conversation-focused with no bottom tab bar.
