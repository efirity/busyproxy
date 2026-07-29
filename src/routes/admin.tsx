import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — permanent redirect to portal. */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/portal" });
  },
  component: () => null,
});
