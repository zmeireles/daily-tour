import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { useLocaleAuto } from "@/lib/locale/use-locale-auto";
import { Greeting } from "@/features/home/greeting";
import { ActionGrid } from "@/features/home/action-grid";
import { PremiumStubs } from "@/features/home/premium-stubs";
import { LocaleSwitcher } from "@/features/home/locale-switcher";

export default function AuthedIndexRoute() {
  useThemeAuto();
  useLocaleAuto();

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="flex justify-end px-6 py-4">
        <LocaleSwitcher />
      </header>
      <main className="flex-1">
        <Greeting />
        <ActionGrid />
        <PremiumStubs />
      </main>
    </div>
  );
}
