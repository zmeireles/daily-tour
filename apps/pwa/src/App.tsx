import { createBrowserRouter, RouterProvider } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "sonner";
import IndexRoute from "@/routes/index";
import RTokenRoute from "@/routes/r.$token";
import PlaceDetailRoute from "@/routes/_authed.p.$id";
import ActionDrillDownRoute from "@/routes/_authed.a.$action";
import TourNewRoute from "@/routes/_authed.tour.new";
import TourPlanRoute from "@/routes/_authed.tour.$planId";
import TourShareRoute from "@/routes/tour.share.$planId";
import AdminRoute from "@/routes/admin";
import AdminCallbackRoute from "@/routes/admin.callback";
import AdminPlacesRoute from "@/routes/admin.places";
import AdminPlacesNewRoute from "@/routes/admin.places.new";
import AdminPlacesEditRoute from "@/routes/admin.places.$id";
import AdminProfileRoute from "@/routes/admin.profile";
import AdminGuesthousesRoute from "@/routes/admin.guesthouses";
import AdminGuesthousesNewRoute from "@/routes/admin.guesthouses.new";
import AdminGuesthousesEditRoute from "@/routes/admin.guesthouses.$id";
import { InstallBanner } from "@/features/pwa-install/install-banner";
import { OfflineBanner } from "@/components/offline-banner";
import { queryPersister } from "@/lib/offline/cache";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "/r/:token", element: <RTokenRoute /> },
  { path: "/p/:id", element: <PlaceDetailRoute /> },
  { path: "/a/:action", element: <ActionDrillDownRoute /> },
  { path: "/tour/new", element: <TourNewRoute /> },
  { path: "/tour/share/:planId", element: <TourShareRoute /> },
  { path: "/tour/:planId", element: <TourPlanRoute /> },
  {
    path: "/admin",
    element: <AdminRoute />,
    children: [
      { path: "places", element: <AdminPlacesRoute /> },
      { path: "places/new", element: <AdminPlacesNewRoute /> },
      { path: "places/:id", element: <AdminPlacesEditRoute /> },
      { path: "profile", element: <AdminProfileRoute /> },
      { path: "guesthouses", element: <AdminGuesthousesRoute /> },
      { path: "guesthouses/new", element: <AdminGuesthousesNewRoute /> },
      { path: "guesthouses/:id", element: <AdminGuesthousesEditRoute /> },
    ],
  },
  { path: "/admin/callback", element: <AdminCallbackRoute /> },
  { path: "*", element: <IndexRoute /> },
]);

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <RouterProvider router={router} />
      <Toaster />
      <InstallBanner />
      <OfflineBanner />
    </PersistQueryClientProvider>
  );
}
