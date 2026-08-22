import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeField, isValidTime, normaliseTime, stepTime } from "@/components/ui/time-field";

const LABEL = "Mon opening time";

function renderField(value = "09:00", onChange = vi.fn()) {
  render(<TimeField aria-label={LABEL} value={value} onChange={onChange} />);
  return { input: screen.getByLabelText(LABEL), onChange };
}

describe("normaliseTime", () => {
  it.each([
    ["7:5", "07:05"],
    ["1930", "19:30"],
    ["9", "09:00"],
    ["25:99", "23:59"],
    ["", ""],
    ["abc", ""],
  ])("normalises %j → %j", (raw, expected) => {
    expect(normaliseTime(raw)).toBe(expected);
  });
});

describe("stepTime", () => {
  it("wraps forward across midnight", () => expect(stepTime("23:58", 5)).toBe("00:03"));
  it("wraps backward across midnight", () => expect(stepTime("00:02", -5)).toBe("23:57"));
  it("steps a whole hour", () => expect(stepTime("09:30", 60)).toBe("10:30"));
  it("treats an unparseable value as midnight", () => expect(stepTime("zz", 5)).toBe("00:05"));
});

describe("isValidTime", () => {
  it.each(["00:00", "09:05", "23:59"])("accepts %j", (v) => expect(isValidTime(v)).toBe(true));
  it.each(["", "9:00", "24:00", "12:60", "0900"])("rejects %j", (v) =>
    expect(isValidTime(v)).toBe(false),
  );
});

describe("TimeField", () => {
  // The whole reason this component exists. `type="time"` renders in the
  // BROWSER's locale, which showed "07:15 AM" to an owner using the console in
  // Portuguese — a format pt-PT does not use and the app cannot override.
  it("is NOT a native time input, so the browser locale cannot impose AM/PM", () => {
    const { input } = renderField("19:00");
    expect(input).toHaveAttribute("type", "text");
    expect(input.type).not.toBe("time");
  });

  it("shows a 24-hour value verbatim", () => {
    const { input } = renderField("23:00");
    expect(input).toHaveValue("23:00");
    expect(input.value).not.toMatch(/AM|PM/i);
  });

  it("reports what the owner types", () => {
    const { input, onChange } = renderField("");
    fireEvent.change(input, { target: { value: "18:30" } });
    expect(onChange).toHaveBeenCalledWith("18:30");
  });

  it("strips characters that cannot appear in a time", () => {
    const { input, onChange } = renderField("");
    fireEvent.change(input, { target: { value: "1a8:b3" } });
    expect(onChange).toHaveBeenCalledWith("18:3");
  });

  it("normalises a half-typed value on blur", () => {
    const { input, onChange } = renderField("7:5");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("07:05");
  });

  it("leaves an already-normal value alone on blur", () => {
    const { input, onChange } = renderField("09:00");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("steps by 5 minutes with the arrow keys", () => {
    const { input, onChange } = renderField("09:00");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("09:05");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("08:55");
  });

  it("steps by an hour with Shift held", () => {
    const { input, onChange } = renderField("09:00");
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("flags a malformed value with aria-invalid", () => {
    const { input } = renderField("9:9");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not flag an empty value", () => {
    const { input } = renderField("");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("still runs normalisation when the consumer also passes onBlur", () => {
    // Guards the prop-spread order: `{...props}` must not clobber the internal
    // handlers, or a consumer's onBlur would silently disable normalisation.
    const consumerBlur = vi.fn();
    const onChange = vi.fn();
    render(<TimeField aria-label={LABEL} value="7:5" onChange={onChange} onBlur={consumerBlur} />);
    fireEvent.blur(screen.getByLabelText(LABEL));
    expect(onChange).toHaveBeenCalledWith("07:05");
    expect(consumerBlur).toHaveBeenCalled();
  });
});
