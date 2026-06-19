import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "sonner";
import IndexRoute from "@/routes/index";
import { InstallBanner } from "@/features/pwa-install/install-banner";
import { OfflineBanner } from "@/components/offline-banner";
import { SessionBootstrap } from "@/components/session-bootstrap";
import { queryPersister } from "@/lib/offline/cache";

// Route-based code splitting: only the landing route (IndexRoute) ships in the initial
// bundle. Every other route — and its heavy deps (notably maplibre-gl + its CSS on place
// detail) — is fetched on demand, keeping the home/initial bundle small and fast.
function RouteFallback() {
  return <main className="min-h-svh grid place-items-center" aria-busy="true" aria-live="polite" />;
}

function lazyRoute(factory: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "/r/:token", element: lazyRoute(() => import("@/routes/r.$token")) },
  { path: "/p/:id", element: lazyRoute(() => import("@/routes/_authed.p.$id")) },
  { path: "/a/:action", element: lazyRoute(() => import("@/routes/_authed.a.$action")) },
  { path: "/chat", element: lazyRoute(() => import("@/routes/_authed.chat")) },
  { path: "/tour/new", element: lazyRoute(() => import("@/routes/_authed.tour.new")) },
  { path: "/tour/share/:planId", element: lazyRoute(() => import("@/routes/tour.share.$planId")) },
  { path: "/tour/:planId", element: lazyRoute(() => import("@/routes/_authed.tour.$planId")) },
  {
    path: "/admin",
    element: lazyRoute(() => import("@/routes/admin")),
    children: [
      { path: "places", element: lazyRoute(() => import("@/routes/admin.places")) },
      { path: "places/new", element: lazyRoute(() => import("@/routes/admin.places.new")) },
      { path: "places/:id", element: lazyRoute(() => import("@/routes/admin.places.$id")) },
      { path: "profile", element: lazyRoute(() => import("@/routes/admin.profile")) },
      { path: "beta", element: lazyRoute(() => import("@/routes/admin.beta")) },
      { path: "guesthouses", element: lazyRoute(() => import("@/routes/admin.guesthouses")) },
      {
        path: "reservations",
        element: lazyRoute(() => import("@/routes/admin.reservations")),
      },
      { path: "chat", element: lazyRoute(() => import("@/routes/admin.chat")) },
      {
        path: "guesthouses/new",
        element: lazyRoute(() => import("@/routes/admin.guesthouses.new")),
      },
      {
        path: "guesthouses/:id",
        element: lazyRoute(() => import("@/routes/admin.guesthouses.$id")),
      },
    ],
  },
  { path: "/admin/callback", element: lazyRoute(() => import("@/routes/admin.callback")) },
  { path: "*", element: <IndexRoute /> },
]);

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <SessionBootstrap>
        <RouterProvider router={router} />
        <Toaster />
        <InstallBanner />
        <OfflineBanner />
      </SessionBootstrap>
    </PersistQueryClientProvider>
  );
}
