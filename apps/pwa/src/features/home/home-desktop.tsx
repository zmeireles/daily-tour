import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Greeting } from "@/features/home/greeting";
import { DesktopSectionNav } from "@/features/home/desktop-section-nav";
import { HomeBodyGrid } from "@/features/home/home-body-grid";
import { useHostsPicks } from "@/features/home/use-hosts-picks";
import { FirstRunOrientation } from "@/components/first-run-orientation";
import { SupportFooter } from "@/components/support-footer";

// Desktop Home — one editorial spread (NOT a dashboard) in the contained frame:
// masthead spread → verbs-as-navigation strip → two-column body. Mounted by the
// route via ResponsiveScreen engageAt="md".
export function HomeDesktop() {
  const { data: picks } = useHostsPicks();

  return (
    <DesktopAppShell frame="contained">
      <div className="flex flex-col gap-section pb-section">
        <FirstRunOrientation className="mx-0" />
        <Greeting variant="masthead" />
        <DesktopSectionNav />
        <HomeBodyGrid picks={picks ?? []} />
        <SupportFooter />
      </div>
    </DesktopAppShell>
  );
}
