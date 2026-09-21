import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tower/")({
  beforeLoad: () => {
    throw redirect({ to: "/tower/workflow-guarantee" });
  },
  component: () => null,
});
