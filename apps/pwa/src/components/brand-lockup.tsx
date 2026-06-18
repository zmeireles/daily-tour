import { cn } from "@/lib/utils";
import { Overline } from "@/components/overline";

export type BrandLockupSize = "bar" | "masthead";

// The Daily Tour brand lockup — logo + Fraunces wordmark + "São Miguel" overline.
// Single source of truth shared by the mobile BrandAppBar (size="bar") and the
// desktop DesktopTopNav (size="masthead"). The "bar" classes are kept verbatim
// from the original BrandAppBar left zone so the mobile bar stays byte-identical
// (guarded by brand-app-bar.test.tsx). "masthead" steps the logo + wordmark up.
const SIZES: Record<BrandLockupSize, { logo: string; word: string }> = {
  bar: { logo: "h-8 w-8", word: "font-display text-lg leading-none text-primary" },
  masthead: { logo: "h-10 w-10", word: "font-display text-2xl leading-none text-primary" },
};

export function BrandLockup({
  size = "bar",
  className,
}: {
  size?: BrandLockupSize;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src="/logo.svg" alt="" className={s.logo} />
      <span className="flex flex-col">
        <span className={s.word}>Daily Tour</span>
        <Overline size="sm">São Miguel</Overline>
      </span>
    </div>
  );
}
