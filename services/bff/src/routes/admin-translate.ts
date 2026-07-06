import Anthropic from "@anthropic-ai/sdk";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loadConfig } from "../config.js";

// The three locales Daily Tour ships content in. A request translates a set of
// source-locale strings into one or two of the OTHER locales.
const LOCALES = ["en", "pt-PT", "es"] as const;
const LocaleSchema = z.enum(LOCALES);

// A single translatable field. `kind` steers the model: "proper_name" passes
// through essentially verbatim, "prose" is translated while keeping embedded
// proper nouns intact. Defaults to prose semantics when omitted.
const FieldSchema = z.object({
  key: z.string(),
  text: z.string().min(1).max(4000),
  kind: z.enum(["prose", "proper_name"]).optional(),
});

// target_locales must exclude source_locale (translating a locale into itself
// is a no-op the frontend never requests). With three locales, the useful
// maximum after excluding the source is two.
const RequestSchema = z
  .object({
    source_locale: LocaleSchema,
    target_locales: z.array(LocaleSchema).min(1).max(2),
    fields: z.array(FieldSchema).min(1).max(10),
  })
  .refine((body) => !body.target_locales.includes(body.source_locale), {
    message: "target_locales must not include source_locale",
    path: ["target_locales"],
  });

// Structured-outputs schema (Opus 4.8). `additionalProperties: false` and
// `required` on every object are mandatory; min/max/length keywords are
// unsupported by structured outputs, so all bounds are enforced on the request
// (zod) side instead. The returned text block is guaranteed to parse to this
// shape.
const RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["translations"],
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "values"],
        properties: {
          key: { type: "string" },
          values: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["locale", "text"],
              properties: {
                locale: { type: "string", enum: [...LOCALES] },
                text: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are a professional translator for Daily Tour, a São Miguel (Açores) travel product.

You receive a JSON object: { source_locale, target_locales, fields }. Translate each field's "text" from source_locale into EVERY locale listed in target_locales.

OUTPUT
- Return ONLY JSON matching the provided schema: an object { "translations": [ ... ] }.
- For each input field, emit exactly one entry: echo the field's "key" VERBATIM, and provide a "values" array with exactly one entry per requested target locale (same set, no more, no fewer).
- If a requested target locale equals the source locale, return the source "text" unchanged for that locale.

LOCALES
- "en" — English.
- "es" — Spanish (Spain).
- "pt-PT" — European Portuguese (Portugal), pré-Acordo Ortográfico. This is NOT Brazilian Portuguese and NOT post-AO spelling.

PT-PT RULES (apply to every "pt-PT" target)
1. Pré-AO spelling — keep the etymological consonants the 1990 Acordo Ortográfico dropped: "acção" (not "ação"), "óptimo" (not "ótimo"), "director" (not "diretor"), "contacto" (not "contato"), "facto" (not "fato"), "eléctrico" (not "elétrico"), "actividade" (not "atividade"), "colecção" (not "coleção"), "arquitecto" (not "arquiteto"). Apply the same rule to every other word carrying a silent/etymological c or p.
2. European register and vocabulary, never Brazilian: "pequeno-almoço" (not "café da manhã"), "casa de banho" (not "banheiro"), "autocarro" (not "ônibus"), "comboio" (not "trem"). Prefer the "está a fazer" construction over "está fazendo".
3. NEVER use "vosso"/"vossa". Address the reader with "o seu"/"a sua".

DO NOT TRANSLATE (all target locales)
- Proper nouns pass through UNCHANGED: guesthouse, place, and business names; the district name "Calheta"; POI names; brand names; and São Miguel / Açores place names.
- kind:"proper_name" → return the text essentially verbatim (only trivial spacing/casing corrections if clearly warranted).
- kind:"prose" (the default) → translate the sentence naturally, but keep any embedded proper nouns exactly as they appear in the source.`;

interface TranslateResponse {
  translations: {
    key: string;
    values: { locale: (typeof LOCALES)[number]; text: string }[];
  }[];
}

// Structured outputs guarantees the JSON *shape* but not that the model honoured
// the request. Verify every requested field key is echoed exactly once and each
// entry covers exactly the requested target locales — otherwise wrong/missing
// content would ship silently into the owner's form.
function matchesRequest(
  result: TranslateResponse,
  fields: { key: string }[],
  targetLocales: readonly string[],
): boolean {
  if (!Array.isArray(result?.translations)) return false;
  const expectedKeys = new Set(fields.map((f) => f.key));
  const targetSet = new Set(targetLocales);
  const seen = new Set<string>();
  for (const entry of result.translations) {
    if (!entry || !expectedKeys.has(entry.key) || seen.has(entry.key)) return false;
    seen.add(entry.key);
    const locales = new Set<string>((entry.values ?? []).map((v) => v.locale));
    if (locales.size !== targetSet.size) return false;
    for (const l of targetSet) if (!locales.has(l)) return false;
  }
  return seen.size === expectedKeys.size;
}

// POST /v1/admin/translate — owner-only LLM translation helper. The owner guard
// is applied by the global onRoute hook (see plugins/auth.ts) via `auth: "owner"`.
// eslint-disable-next-line @typescript-eslint/require-await
const adminTranslateRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(
    "/v1/admin/translate",
    { config: { auth: "owner", rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = RequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }
      const { source_locale, target_locales, fields } = parsed.data;

      // Guard BEFORE constructing the client — an unset key means the feature is
      // disabled (dev/CI posture, mirrors planner-svc), and we must not attempt
      // a call.
      const config = loadConfig();
      if (!config.ANTHROPIC_API_KEY) {
        return reply.code(503).send({ error: "translation_unavailable" });
      }

      const client = new Anthropic({
        apiKey: config.ANTHROPIC_API_KEY,
        timeout: 30_000,
        maxRetries: 1,
      });

      try {
        const msg = await client.messages.create({
          model: config.ANTHROPIC_MODEL,
          // Must cover the validated input envelope translated into up to two
          // locales; 2048 truncates large-but-valid requests (→ parse error).
          // 16k is the SDK-safe non-streaming ceiling.
          max_tokens: 16_000,
          // Opus 4.8: no temperature/top_p/top_k, no thinking config. `effort`
          // + structured outputs replace them; runs without thinking (fast).
          output_config: {
            effort: "low",
            format: { type: "json_schema", schema: RESPONSE_JSON_SCHEMA },
          },
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: JSON.stringify({ source_locale, target_locales, fields }),
            },
          ],
        });

        // A truncated response (hit the output cap) yields invalid JSON; surface
        // it distinctly rather than as a confusing parse failure.
        if (msg.stop_reason === "max_tokens") {
          fastify.log.error({ stop_reason: msg.stop_reason }, "[admin-translate] output truncated");
          return reply.code(502).send({ error: "translation_truncated" });
        }

        let jsonText = "";
        for (const block of msg.content) {
          if (block.type === "text") {
            jsonText = block.text;
            break;
          }
        }
        const result = JSON.parse(jsonText) as TranslateResponse;

        if (!matchesRequest(result, fields, target_locales)) {
          fastify.log.error({ result }, "[admin-translate] response contract mismatch");
          return reply.code(502).send({ error: "translation_failed" });
        }

        return reply.code(200).send(result);
      } catch (err) {
        // RateLimitError is a subclass of APIError — check it first.
        if (err instanceof Anthropic.RateLimitError) {
          return reply.code(429).send({ error: "translation_rate_limited" });
        }
        // Any other upstream APIError, or a JSON.parse failure on a
        // non-conforming response, collapses to a 502.
        fastify.log.error({ err }, "[admin-translate] upstream or parse failure");
        return reply.code(502).send({ error: "translation_failed" });
      }
    },
  );
};

export default adminTranslateRoute;
