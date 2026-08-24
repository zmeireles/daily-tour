// dt-tests #37 — address a transcoded derivative instead of the original.
//
// Every upload is already transcoded into 200/600/1200 px × avif/webp
// (media-svc workers/transcode.ts). Until this helper existed nothing asked for
// one, so an owner console rendering a 40 px thumbnail downloaded the full-size
// original — 86% of the object store was derivatives nobody served.
//
// Format is NOT a parameter: the BFF negotiates avif/webp from the browser's own
// Accept header and falls back to the original when neither is offered, so a
// caller cannot accidentally serve a codec the client cannot decode.

/** Widths the transcode worker actually produces. */
export const MEDIA_WIDTHS = [200, 600, 1200] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

/**
 * URL for an asset at (at least) `width` CSS pixels.
 *
 * Pass the size the image is DISPLAYED at, not a guess at file size. The BFF
 * rounds up to the smallest stored derivative that covers it and serves the
 * original beyond the largest, so an image is never upscaled.
 */
export function mediaUrl(assetId: string, width: MediaWidth): string {
  return `/v1/media/${assetId}?w=${width}`;
}
