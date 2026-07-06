import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { TranslatableField, TranslateAllButton } from "@/components/ui/translatable-field";
import type { FieldTranslation } from "@/lib/i18n/use-field-translation";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type Status = { translating: boolean; autoTranslated: boolean; outOfSync: boolean };
const IDLE: Status = { translating: false, autoTranslated: false, outOfSync: false };

function makeTranslation(over: Partial<FieldTranslation> = {}): FieldTranslation {
  return {
    translateField: vi.fn().mockResolvedValue(true),
    translateAll: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockReturnValue(IDLE),
    _notifyEdit: vi.fn(),
    ...over,
  };
}

function Harness({
  defaultValues = {},
  children,
}: {
  defaultValues?: Record<string, unknown>;
  children: (methods: ReturnType<typeof useForm>) => React.ReactNode;
}) {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children(methods)}</FormProvider>;
}

// A description field on the ES tab, authored in PT → globe is shown.
function renderField(props: {
  translation: FieldTranslation;
  defaultValues?: Record<string, unknown>;
  locale?: "en" | "pt-PT" | "es";
  sourceLocale?: "en" | "pt-PT" | "es";
  multiline?: boolean;
  maxLength?: number;
}) {
  const { translation, defaultValues, locale = "es", sourceLocale = "pt-PT", ...rest } = props;
  return render(
    <Harness defaultValues={defaultValues}>
      {() => (
        <TranslatableField
          namePrefix="description"
          locale={locale}
          sourceLocale={sourceLocale}
          label="Descrição"
          translation={translation}
          {...rest}
        />
      )}
    </Harness>,
  );
}

const globe = () => screen.getByRole("button", { name: "Translate this field" });

describe("TranslatableField", () => {
  beforeEach(() => vi.clearAllMocks());

  it("translates immediately when the target is empty (no confirm dialog)", async () => {
    const translation = makeTranslation();
    renderField({ translation, defaultValues: { description_es: "" } });

    fireEvent.click(globe());

    await waitFor(() =>
      expect(translation.translateField).toHaveBeenCalledWith("description", ["es"], "prose"),
    );
    expect(screen.queryByText("Replace existing text?")).not.toBeInTheDocument();
  });

  it("asks for confirmation before overwriting a non-empty target; confirm translates, cancel does not", async () => {
    const translation = makeTranslation();
    const { rerender } = renderField({
      translation,
      defaultValues: { description_es: "texto existente" },
    });

    // Cancel path
    fireEvent.click(globe());
    expect(await screen.findByText("Replace existing text?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByText("Replace existing text?")).not.toBeInTheDocument(),
    );
    expect(translation.translateField).not.toHaveBeenCalled();

    // Confirm path
    fireEvent.click(globe());
    expect(await screen.findByText("Replace existing text?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(translation.translateField).toHaveBeenCalledTimes(1));
    // Successful overwrite offers a one-tap undo toast.
    expect(toast.success).toHaveBeenCalled();

    rerender(<div />); // silence act warnings on unmount
  });

  it("disables the globe while a translation is in flight", () => {
    const translation = makeTranslation({
      status: vi.fn().mockReturnValue({ ...IDLE, translating: true }),
    });
    renderField({ translation });
    expect(globe()).toBeDisabled();
  });

  it("shows the auto-translated badge, and an out-of-sync hint from status", () => {
    const translation = makeTranslation({
      status: vi
        .fn()
        .mockReturnValue({ translating: false, autoTranslated: true, outOfSync: true }),
    });
    renderField({ translation });
    expect(screen.getByText("Auto-translated")).toBeInTheDocument();
    expect(screen.getByText("Source changed — translate again")).toBeInTheDocument();
  });

  it("notifies the hook on manual edit so the badge can clear", () => {
    const translation = makeTranslation();
    renderField({ translation, multiline: true, defaultValues: { description_es: "" } });

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "editado à mão" } });
    expect(translation._notifyEdit).toHaveBeenCalledWith("description", "es");
  });

  it("hides the translate affordance on the source-locale tab", () => {
    const translation = makeTranslation();
    renderField({ translation, locale: "pt-PT", sourceLocale: "pt-PT" });
    expect(screen.queryByRole("button", { name: "Translate this field" })).not.toBeInTheDocument();
  });
});

describe("TranslateAllButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bulk-translates the given fields and disables while any is translating", () => {
    const translation = makeTranslation();
    const fields = [
      { namePrefix: "name", kind: "proper_name" as const },
      { namePrefix: "description" },
    ];
    const { rerender } = render(
      <Harness>{() => <TranslateAllButton translation={translation} fields={fields} />}</Harness>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Translate all" }));
    expect(translation.translateAll).toHaveBeenCalledWith(fields);

    // When a field reports translating, the button is disabled.
    const busy = makeTranslation({
      status: vi.fn().mockReturnValue({ ...IDLE, translating: true }),
    });
    rerender(<Harness>{() => <TranslateAllButton translation={busy} fields={fields} />}</Harness>);
    expect(screen.getByRole("button", { name: "Translate all" })).toBeDisabled();
  });
});
