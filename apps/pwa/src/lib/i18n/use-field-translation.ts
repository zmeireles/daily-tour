import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOwnerJwt } from "@/store/owner-session";

// TODO: switch to shared import from @/features/backoffice/shared/form-locale-config when that module exists
export type ContentLocale = "en" | "pt-PT" | "es";

export const LOCALE_SUFFIX: Record<ContentLocale, string> = {
  en: "en",
  "pt-PT": "pt",
  es: "es",
};

const ALL_LOCALES: ContentLocale[] = ["en", "pt-PT", "es"];

type FieldStatus = { translating: boolean; autoTranslated: boolean; outOfSync: boolean };

interface TranslateRequest {
  source_locale: ContentLocale;
  target_locales: ContentLocale[];
  fields: Array<{ key: string; text: string; kind?: "prose" | "proper_name" }>;
}

interface TranslateResponse {
  translations: Array<{ key: string; values: Array<{ locale: string; text: string }> }>;
}

function authHeader(jwt: string) {
  return { Authorization: `Bearer ${jwt}` };
}

export interface UseFieldTranslationOptions {
  setValue: (name: string, value: string, opts?: { shouldDirty?: boolean }) => void;
  getValues: (name: string) => string;
  sourceLocale: ContentLocale;
}

export interface FieldTranslation {
  /**
   * Translates ONE field from source→targetLocales.
   * Returns true on success, false on failure.
   * Never throws — safe to call without try/catch.
   * Shows an error toast on failure.
   */
  translateField: (
    namePrefix: string,
    targetLocales: ContentLocale[],
    kind?: "prose" | "proper_name",
  ) => Promise<boolean>;
  /**
   * Bulk translate: fills only currently-empty target cells. Skips non-empty ones.
   * Targets are all locales except sourceLocale.
   */
  translateAll: (
    fields: Array<{ namePrefix: string; kind?: "prose" | "proper_name" }>,
  ) => Promise<void>;
  /** Returns translation status for a given field+locale. */
  status: (namePrefix: string, locale: ContentLocale) => FieldStatus;
  /**
   * Call when the user manually edits a target field.
   * Clears autoTranslated + outOfSync flags for that field.
   * @internal — called by TranslatableField; form consumers should not call this directly.
   */
  _notifyEdit: (namePrefix: string, locale: ContentLocale) => void;
}

export function useFieldTranslation({
  setValue,
  getValues,
  sourceLocale,
}: UseFieldTranslationOptions): FieldTranslation {
  const jwt = useOwnerJwt();
  const { t } = useTranslation("admin");
  const [statuses, setStatuses] = useState<Record<string, Partial<FieldStatus>>>({});
  // Stores the source text at the time of last successful translation, per `${namePrefix}:${locale}`
  const snapshotRef = useRef<Record<string, string>>({});

  const patch = useCallback(
    (namePrefix: string, locale: ContentLocale, update: Partial<FieldStatus>) => {
      setStatuses((prev) => {
        const key = `${namePrefix}:${locale}`;
        return { ...prev, [key]: { ...prev[key], ...update } };
      });
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: async (req: TranslateRequest): Promise<TranslateResponse> => {
      const res = await fetch("/v1/admin/translate", {
        method: "POST",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`translate ${res.status}`);
      return res.json() as Promise<TranslateResponse>;
    },
  });

  const applyResult = useCallback(
    (
      namePrefix: string,
      targetLocales: ContentLocale[],
      result: TranslateResponse,
      sourceText: string,
    ) => {
      const entry = result.translations.find((r) => r.key === namePrefix);
      if (!entry) return;
      for (const { locale, text } of entry.values) {
        const tl = locale as ContentLocale;
        setValue(`${namePrefix}_${LOCALE_SUFFIX[tl]}`, text, { shouldDirty: true });
        snapshotRef.current[`${namePrefix}:${tl}`] = sourceText;
        patch(namePrefix, tl, { translating: false, autoTranslated: true, outOfSync: false });
      }
      // Ensure translating cleared even for locales not in response
      for (const locale of targetLocales) {
        patch(namePrefix, locale, { translating: false });
      }
    },
    [setValue, patch],
  );

  const translateField = useCallback(
    async (
      namePrefix: string,
      targetLocales: ContentLocale[],
      kind: "prose" | "proper_name" = "prose",
    ): Promise<boolean> => {
      if (!jwt) {
        toast.error(t("translate.toast_fail"));
        return false;
      }
      const sourceText = getValues(`${namePrefix}_${LOCALE_SUFFIX[sourceLocale]}`);
      if (!sourceText?.trim()) return false;

      for (const locale of targetLocales) {
        patch(namePrefix, locale, { translating: true });
      }

      try {
        const result = await mutation.mutateAsync({
          source_locale: sourceLocale,
          target_locales: targetLocales,
          fields: [{ key: namePrefix, text: sourceText, kind }],
        });
        applyResult(namePrefix, targetLocales, result, sourceText);
        return true;
      } catch {
        for (const locale of targetLocales) {
          patch(namePrefix, locale, { translating: false });
        }
        toast.error(t("translate.toast_fail"));
        return false;
      }
    },
    [jwt, getValues, sourceLocale, patch, mutation, applyResult, t],
  );

  const translateAll = useCallback(
    async (fields: Array<{ namePrefix: string; kind?: "prose" | "proper_name" }>): Promise<void> => {
      const targetLocales = ALL_LOCALES.filter((l) => l !== sourceLocale);

      for (const { namePrefix, kind = "prose" } of fields) {
        const sourceText = getValues(`${namePrefix}_${LOCALE_SUFFIX[sourceLocale]}`);
        if (!sourceText?.trim()) continue;

        const emptyTargets = targetLocales.filter(
          (locale) => !getValues(`${namePrefix}_${LOCALE_SUFFIX[locale]}`)?.trim(),
        );
        if (!emptyTargets.length) continue;

        for (const locale of emptyTargets) {
          patch(namePrefix, locale, { translating: true });
        }

        try {
          const result = await mutation.mutateAsync({
            source_locale: sourceLocale,
            target_locales: emptyTargets,
            fields: [{ key: namePrefix, text: sourceText, kind }],
          });
          applyResult(namePrefix, emptyTargets, result, sourceText);
        } catch {
          for (const locale of emptyTargets) {
            patch(namePrefix, locale, { translating: false });
          }
        }
      }
    },
    [getValues, sourceLocale, patch, mutation, applyResult],
  );

  const status = useCallback(
    (namePrefix: string, locale: ContentLocale): FieldStatus => {
      const s = statuses[`${namePrefix}:${locale}`];
      const currentSource = getValues(`${namePrefix}_${LOCALE_SUFFIX[sourceLocale]}`);
      const snapshotSource = snapshotRef.current[`${namePrefix}:${locale}`];
      const outOfSync =
        !!(s?.autoTranslated) && snapshotSource !== undefined && currentSource !== snapshotSource;

      return {
        translating: s?.translating ?? false,
        autoTranslated: s?.autoTranslated ?? false,
        outOfSync,
      };
    },
    [statuses, getValues, sourceLocale],
  );

  const _notifyEdit = useCallback(
    (namePrefix: string, locale: ContentLocale) => {
      patch(namePrefix, locale, { autoTranslated: false, outOfSync: false });
    },
    [patch],
  );

  return { translateField, translateAll, status, _notifyEdit };
}
