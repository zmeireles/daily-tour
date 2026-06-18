import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { ResponsiveScreen } from "@/components/responsive-screen";
import { Home } from "@/features/home/home";
import { HomeDesktop } from "@/features/home/home-desktop";

// Guest home. The theme hook stays here (above the fork) so both layouts mount
// it. engageAt="md" because the mobile ActionGrid is already broken at tablet
// width — 834 + ~960 get the real desktop layout; <1024 phones stay mobile.
export default function AuthedIndexRoute() {
  useThemeAuto();
  return <ResponsiveScreen engageAt="md" mobile={<Home />} desktop={<HomeDesktop />} />;
}
