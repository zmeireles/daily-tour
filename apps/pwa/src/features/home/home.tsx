import { BrandAppBar } from "@/components/brand-app-bar";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Greeting } from "@/features/home/greeting";
import { ActionGrid } from "@/features/home/action-grid";
import { HostsPicksSection } from "@/features/home/hosts-picks-section";
import { PremiumStubs } from "@/features/home/premium-stubs";
import { LocaleSwitcher } from "@/components/locale-switcher";

// The shipped mobile home — extracted verbatim from the route so the route can
// switch between this and HomeDesktop. Unchanged below the breakpoint.
export function Home() {
  return (
    <div className="min-h-svh bg-background flex flex-col">
      <BrandAppBar right={<LocaleSwitcher />} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <main className="flex-1 pb-24">
          <Greeting />
          <HostsPicksSection />
          <ActionGrid />
          <PremiumStubs />
        </main>
      </div>
      <BottomTabBar active="explore" />
    </div>
  );
}
