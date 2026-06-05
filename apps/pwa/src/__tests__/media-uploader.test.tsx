import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useOwnerSessionStore } from "@/store/owner-session";
import { MediaUploader, type UploadedAsset } from "@/features/backoffice/places/media-uploader";

const DEFAULT_LABEL = "Drag & drop images or click to select";

const EXISTING: UploadedAsset = {
  assetId: "existing-1",
  previewUrl: "blob:existing",
  name: "existing.jpg",
};

const NEW_ASSET: UploadedAsset = {
  // previewUrl comes from the URL.createObjectURL polyfill in setup.ts ("blob:mock").
  assetId: "new-1",
  previewUrl: "blob:mock",
  name: "test.jpg",
};

function imageFile() {
  return new File([new Blob(["x"])], "test.jpg", { type: "image/jpeg" });
}

/** Mock the single same-origin upload call (BFF proxies sign/PUT/complete). */
function makeUploadFetchMock() {
  return vi.fn((url: string) => {
    if (url.includes("/v1/admin/media/upload")) {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ asset_id: "new-1" }),
      });
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  });
}

describe("MediaUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    useOwnerSessionStore.getState().clearOwnerSession();
    useOwnerSessionStore.getState().setOwnerSession("test-jwt", {
      sub: "owner-uuid-1",
      email: "owner@example.com",
      name: "Owner",
    });
  });

  it("renders the dropzone with the default label", () => {
    render(<MediaUploader onUploaded={vi.fn()} />);
    expect(screen.getByRole("button", { name: DEFAULT_LABEL })).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("renders a custom label when the label prop is supplied", () => {
    render(<MediaUploader onUploaded={vi.fn()} label="Upload room photos" />);
    expect(screen.getByRole("button", { name: "Upload room photos" })).toBeInTheDocument();
    expect(screen.getByText("Upload room photos")).toBeInTheDocument();
  });

  it("seeds the thumbnail strip from initialAssets", () => {
    const initial: UploadedAsset[] = [
      { assetId: "a-1", previewUrl: "blob:first", name: "first.jpg" },
      { assetId: "a-2", previewUrl: "blob:second", name: "second.jpg" },
    ];
    render(<MediaUploader onUploaded={vi.fn()} initialAssets={initial} />);

    const thumbs = screen.getAllByRole("img");
    expect(thumbs).toHaveLength(2);
    expect(screen.getByAltText("first.jpg").getAttribute("src")).toBe("blob:first");
    expect(screen.getByAltText("second.jpg").getAttribute("src")).toBe("blob:second");
  });

  it("does NOT call onUploaded on mount when only initialAssets is supplied", () => {
    const onUploaded = vi.fn();
    render(<MediaUploader onUploaded={onUploaded} initialAssets={[EXISTING]} />);
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("uploads via the same-origin BFF proxy and calls onUploaded with initialAssets ∪ new uploads", async () => {
    const fetchMock = makeUploadFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const onUploaded = vi.fn();
    const file = imageFile();

    render(<MediaUploader onUploaded={onUploaded} initialAssets={[EXISTING]} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    // single POST to the BFF upload proxy: bearer token + the file as the body,
    // content-type carrying the file's mime so media-svc signs it correctly.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/admin/media/upload",
      expect.objectContaining({
        method: "POST",
        body: file,
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt",
          "content-type": "image/jpeg",
        }),
      }),
    );
    // onUploaded receives the union of existing + newly uploaded
    expect(onUploaded).toHaveBeenCalledWith([EXISTING, NEW_ASSET]);
  });

  it("filters out non-image files and never uploads", async () => {
    const fetchMock = makeUploadFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const onUploaded = vi.fn();

    render(<MediaUploader onUploaded={onUploaded} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    const textFile = new File([new Blob(["x"])], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [textFile] } });

    // handleFiles returns synchronously before any await when no images remain;
    // flush a microtask to be safe, then assert nothing happened.
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("surfaces an error when the upload request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/v1/admin/media/upload")) {
          return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
        }
        return Promise.reject(new Error(`unexpected fetch ${url}`));
      }),
    );
    const onUploaded = vi.fn();

    render(<MediaUploader onUploaded={onUploaded} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile()] } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("upload failed 500");
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("toggles the dragging class on dragover and dragleave", () => {
    render(<MediaUploader onUploaded={vi.fn()} />);
    const dropzone = screen.getByRole("button");

    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain("border-primary");

    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).toContain("border-muted-foreground/30");
    expect(dropzone.className).not.toContain("bg-primary/5");
  });

  it("handles a drop event with image files by starting the upload", async () => {
    const fetchMock = makeUploadFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<MediaUploader onUploaded={vi.fn()} />);
    const dropzone = screen.getByRole("button");

    fireEvent.drop(dropzone, { dataTransfer: { files: [imageFile()] } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/v1/admin/media/upload", expect.anything()),
    );
  });

  it("clicks the hidden file input on Enter keydown", () => {
    render(<MediaUploader onUploaded={vi.fn()} />);
    const input = document.getElementById("media-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});

    const dropzone = screen.getByRole("button");
    fireEvent.keyDown(dropzone, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
