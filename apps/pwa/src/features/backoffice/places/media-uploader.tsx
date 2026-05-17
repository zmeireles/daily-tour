import { useCallback, useState } from "react";
import { useOwnerJwt } from "@/store/owner-session";

export interface UploadedAsset {
  assetId: string;
  previewUrl: string;
  name: string;
}

interface Props {
  onUploaded: (assets: UploadedAsset[]) => void;
  label?: string;
}

async function signAndUpload(file: File, jwt: string): Promise<UploadedAsset> {
  const signRes = await fetch("/v1/admin/media/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" },
    body: JSON.stringify({ mime_type: file.type, size_bytes: file.size }),
  });
  if (!signRes.ok) throw new Error(`sign failed ${signRes.status}`);
  const { put_url, asset_id } = (await signRes.json()) as { put_url: string; asset_id: string };

  const putRes = await fetch(put_url, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(`upload failed ${putRes.status}`);

  const completeRes = await fetch("/v1/admin/media/complete", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" },
    body: JSON.stringify({ asset_id }),
  });
  if (!completeRes.ok && completeRes.status !== 204) {
    throw new Error(`complete failed ${completeRes.status}`);
  }

  return { assetId: asset_id, previewUrl: URL.createObjectURL(file), name: file.name };
}

export function MediaUploader({ onUploaded, label = "Drag & drop images or click to select" }: Props) {
  const jwt = useOwnerJwt();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !jwt) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        const uploaded = await Promise.all(imageFiles.map((f) => signAndUpload(f, jwt)));
        const next = [...assets, ...uploaded];
        setAssets(next);
        onUploaded(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [jwt, assets, onUploaded],
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
        <p className="text-sm text-muted-foreground">
          {uploading ? "Uploading…" : label}
        </p>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <div key={a.assetId} className="relative w-20 h-20 rounded overflow-hidden border">
              <img src={a.previewUrl} alt={a.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
