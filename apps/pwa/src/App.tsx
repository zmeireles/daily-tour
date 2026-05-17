import { createBrowserRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import IndexRoute from "@/routes/index";
import RTokenRoute from "@/routes/r.$token";
import PlaceDetailRoute from "@/routes/_authed.p.$id";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "/r/:token", element: <RTokenRoute /> },
  { path: "/p/:id", element: <PlaceDetailRoute /> },
  { path: "*", element: <IndexRoute /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
