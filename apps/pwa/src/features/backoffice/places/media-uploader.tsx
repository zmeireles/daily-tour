import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerJwt } from "@/store/owner-session";

export interface UploadedAsset {
  assetId: string;
  previewUrl: string;
  name: string;
}

interface Props {
  /**
   * Fires with the full list on every change — upload, removal and reorder
   * alike. The consumer's array order IS the stored `sort_order`
   * (catalog-svc `syncPlaceMedia` writes it from the array index), so the
   * order handed back here is the order guests will see.
   */
  onChange: (assets: UploadedAsset[]) => void;
  label?: string;
  initialAssets?: UploadedAsset[];
  /**
   * Render the per-thumbnail remove and reorder controls.
   *
   * Off by default, and deliberately so: a shorter or reordered array only
   * takes effect where the server REPLACES the set. That holds for places
   * (`syncPlaceMedia` deletes the rows the array drops) and for guesthouses
   * (a jsonb column overwritten wholesale) — both checked.
   *
   * It does NOT hold for the owner profile, where `owner-profiles.ts` applies
   * `if (updates.photo !== undefined)`, so an omitted photo means "leave
   * unchanged". A remove button there would appear to work and change nothing,
   * which is worse than having none.
   */
  editable?: boolean;
  /**
   * Mark the first thumbnail as the one guests see on the card. Only pass this
   * where the first photo really is the hero: verified for places, where
   * catalog-svc derives `hero_image_url` from the lowest `sort_order`
   * (`routes/places.ts`). Not assumed for anything else.
   */
  heroHint?: boolean;
}

async function uploadFile(file: File, jwt: string): Promise<UploadedAsset> {
  // Single same-origin call: the BFF proxies sign → PUT-to-MinIO → complete.
  // (The browser can't PUT to the internal MinIO presigned host directly.)
  const res = await fetch("/v1/admin/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "content-type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`upload failed ${res.status}`);
  const { asset_id } = (await res.json()) as { asset_id: string };

  return { assetId: asset_id, previewUrl: URL.createObjectURL(file), name: file.name };
}

export function MediaUploader({
  onChange,
  label = "Drag & drop images or click to select",
  initialAssets = [],
  editable = false,
  heroHint = false,
}: Props) {
  const { t } = useTranslation("admin");
  const jwt = useOwnerJwt();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<UploadedAsset[]>(initialAssets);
  const [dragging, setDragging] = useState(false);

  // Every mutation goes through here so the parent can never hold a list that
  // differs from the one on screen — the submit body is built from the
  // parent's copy, so a drift between the two is a silent wrong save.
  const commit = useCallback(
    (next: UploadedAsset[]) => {
      setAssets(next);
      onChange(next);
    },
    [onChange],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !jwt) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        const uploaded = await Promise.all(imageFiles.map((f) => uploadFile(f, jwt)));
        commit([...assets, ...uploaded]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [jwt, assets, commit],
  );

  const remove = useCallback(
    (assetId: string) => commit(assets.filter((a) => a.assetId !== assetId)),
    [assets, commit],
  );

  const move = useCallback(
    (from: number, to: number) => {
      // Reading the element first keeps the bounds check honest: both ends of
      // the row call this with an out-of-range `to`, and `assets[from]` is the
      // only expression here that can actually be undefined.
      const moved = assets[from];
      if (!moved || to < 0 || to >= assets.length) return;
      const next = assets.filter((_, i) => i !== from);
      next.splice(to, 0, moved);
      commit(next);
    },
    [assets, commit],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById("media-file-input")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("media-file-input")?.click();
          }
        }}
      >
        <input
          id="media-file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-sm text-muted-foreground">{uploading ? "Uploading…" : label}</p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {assets.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {assets.map((a, i) => (
            <li key={a.assetId} className="flex flex-col items-center gap-1">
              <div className="relative w-20 h-20 rounded overflow-hidden border">
                <img src={a.previewUrl} alt={a.name} className="w-full h-full object-cover" />
                {heroHint && i === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-primary/85 text-primary-foreground text-[10px] leading-4 text-center">
                    {t("media.main", "Main")}
                  </span>
                )}
              </div>
              {/* type="button" is load-bearing: these sit inside the place form,
                  and a bare <button> defaults to submit — removing a photo would
                  submit the whole form. */}
              {editable && (
                <div className="flex items-center gap-0.5">
                  {assets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                      aria-label={t("media.move_earlier", "Move {{name}} earlier", {
                        name: a.name,
                      })}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => remove(a.assetId)}
                    aria-label={t("media.remove", "Remove {{name}}", { name: a.name })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                  {assets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === assets.length - 1}
                      onClick={() => move(i, i + 1)}
                      aria-label={t("media.move_later", "Move {{name}} later", { name: a.name })}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
