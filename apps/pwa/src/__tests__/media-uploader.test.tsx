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
    render(<MediaUploader onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: DEFAULT_LABEL })).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("renders a custom label when the label prop is supplied", () => {
    render(<MediaUploader onChange={vi.fn()} label="Upload room photos" />);
    expect(screen.getByRole("button", { name: "Upload room photos" })).toBeInTheDocument();
    expect(screen.getByText("Upload room photos")).toBeInTheDocument();
  });

  it("seeds the thumbnail strip from initialAssets", () => {
    const initial: UploadedAsset[] = [
      { assetId: "a-1", previewUrl: "blob:first", name: "first.jpg" },
      { assetId: "a-2", previewUrl: "blob:second", name: "second.jpg" },
    ];
    render(<MediaUploader onChange={vi.fn()} initialAssets={initial} />);

    const thumbs = screen.getAllByRole("img");
    expect(thumbs).toHaveLength(2);
    expect(screen.getByAltText("first.jpg").getAttribute("src")).toBe("blob:first");
    expect(screen.getByAltText("second.jpg").getAttribute("src")).toBe("blob:second");
  });

  it("does NOT call onChange on mount when only initialAssets is supplied", () => {
    const onChange = vi.fn();
    render(<MediaUploader onChange={onChange} initialAssets={[EXISTING]} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uploads via the same-origin BFF proxy and calls onChange with initialAssets ∪ new uploads", async () => {
    const fetchMock = makeUploadFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    const file = imageFile();

    render(<MediaUploader onChange={onChange} initialAssets={[EXISTING]} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

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
    // onChange receives the union of existing + newly uploaded
    expect(onChange).toHaveBeenCalledWith([EXISTING, NEW_ASSET]);
  });

  it("filters out non-image files and never uploads", async () => {
    const fetchMock = makeUploadFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();

    render(<MediaUploader onChange={onChange} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    const textFile = new File([new Blob(["x"])], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [textFile] } });

    // handleFiles returns synchronously before any await when no images remain;
    // flush a microtask to be safe, then assert nothing happened.
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
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
    const onChange = vi.fn();

    render(<MediaUploader onChange={onChange} />);

    const input = document.getElementById("media-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile()] } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("upload failed 500");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggles the dragging class on dragover and dragleave", () => {
    render(<MediaUploader onChange={vi.fn()} />);
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

    render(<MediaUploader onChange={vi.fn()} />);
    const dropzone = screen.getByRole("button");

    fireEvent.drop(dropzone, { dataTransfer: { files: [imageFile()] } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/v1/admin/media/upload", expect.anything()),
    );
  });

  it("clicks the hidden file input on Enter keydown", () => {
    render(<MediaUploader onChange={vi.fn()} />);
    const input = document.getElementById("media-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});

    const dropzone = screen.getByRole("button");
    fireEvent.keyDown(dropzone, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  // ── remove + reorder (the controls the console never had) ────────────────
  //
  // catalog-svc's syncPlaceMedia deletes the rows the array drops and rewrites
  // sort_order from the array index, so BOTH of these are already honoured by
  // the server; only the client could not express them.

  const TWO: UploadedAsset[] = [
    { assetId: "a-1", previewUrl: "blob:first", name: "first.jpg" },
    { assetId: "a-2", previewUrl: "blob:second", name: "second.jpg" },
  ];

  /** alt text of the thumbnail currently carrying the "Main" badge. */
  function heroAlt(): string | null {
    const li = screen.getByText("Main").closest("li");
    return li?.querySelector("img")?.getAttribute("alt") ?? null;
  }

  it("renders NO remove control unless editable is set", () => {
    render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} />);
    // this is the pre-fix state, and it is still correct for the owner profile:
    // owner-profiles.ts treats an omitted photo as "leave unchanged", so a
    // remove button there would appear to work and change nothing.
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
  });

  it("removes a thumbnail and reports the shorter list", () => {
    const onChange = vi.fn();
    render(<MediaUploader onChange={onChange} initialAssets={TWO} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Remove first.jpg" }));

    expect(onChange).toHaveBeenCalledWith([TWO[1]]);
    expect(screen.queryByAltText("first.jpg")).not.toBeInTheDocument();
    expect(screen.getByAltText("second.jpg")).toBeInTheDocument();
  });

  it("reorders a thumbnail and reports the new order", () => {
    const onChange = vi.fn();
    render(<MediaUploader onChange={onChange} initialAssets={TWO} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Move first.jpg later" }));

    // the array order IS the stored sort_order — reversing it reverses the row
    expect(onChange).toHaveBeenCalledWith([TWO[1], TWO[0]]);
    const alts = screen.getAllByRole("img").map((i) => i.getAttribute("alt"));
    expect(alts).toEqual(["second.jpg", "first.jpg"]);
  });

  it("offers no reorder controls when there is only one photo", () => {
    render(<MediaUploader onChange={vi.fn()} initialAssets={[EXISTING]} editable />);
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    // …but removal still applies to a lone photo
    expect(screen.getByRole("button", { name: "Remove existing.jpg" })).toBeInTheDocument();
  });

  it("disables the move controls at each end of the row", () => {
    render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} editable />);
    expect(screen.getByRole("button", { name: "Move first.jpg earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move second.jpg later" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move first.jpg later" })).toBeEnabled();
  });

  it("marks the first photo as Main only when heroHint is set", () => {
    const { unmount } = render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} editable />);
    expect(screen.queryByText("Main")).not.toBeInTheDocument();
    unmount();

    render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} editable heroHint />);
    expect(heroAlt()).toBe("first.jpg");
  });

  it("moves the Main badge when a reorder changes which photo is first", () => {
    render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} editable heroHint />);
    expect(heroAlt()).toBe("first.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Move second.jpg earlier" }));

    // the hero is the lowest sort_order photo, so reordering re-chooses it
    expect(heroAlt()).toBe("second.jpg");
  });

  it("promotes the next photo to Main when the current Main is removed", () => {
    render(<MediaUploader onChange={vi.fn()} initialAssets={TWO} editable heroHint />);
    fireEvent.click(screen.getByRole("button", { name: "Remove first.jpg" }));
    expect(heroAlt()).toBe("second.jpg");
  });

  it("never submits the enclosing form — the controls are type=button", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <MediaUploader onChange={vi.fn()} initialAssets={TWO} editable />
      </form>,
    );

    const removeBtn = screen.getByRole("button", { name: "Remove first.jpg" });
    // asserted directly, because jsdom's implicit-submission behaviour is not
    // something this guard should depend on
    expect(removeBtn).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Move first.jpg later" })).toHaveAttribute(
      "type",
      "button",
    );

    fireEvent.click(removeBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
