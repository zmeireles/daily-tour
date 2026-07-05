import { TodayDashboard } from "@/features/admin-today/today-dashboard";

// Default child of /admin — the "Today" dashboard. Without this the shell's
// <Outlet/> rendered a blank pane on first contact.
export default function AdminIndexRoute() {
  return <TodayDashboard />;
}
