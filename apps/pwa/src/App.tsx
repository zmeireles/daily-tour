import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";
import IndexRoute from "@/routes/index";
import RTokenRoute from "@/routes/r.$token";

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "/r/:token", element: <RTokenRoute /> },
  { path: "*", element: <IndexRoute /> },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
