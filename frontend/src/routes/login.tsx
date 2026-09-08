import { createFileRoute } from "@tanstack/react-router";
import AuthForm from "@/components/auth/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const value = search["redirect"];
    return typeof value === "string" ? { redirect: value } : {};
  },
  head: () => ({
    meta: [
      { title: "Log in — ClipCraft" },
      {
        name: "description",
        content: "Log in to your ClipCraft account to continue editing your videos.",
      },
      { property: "og:title", content: "Log in — ClipCraft" },
      {
        property: "og:description",
        content: "Log in to your ClipCraft account to continue editing your videos.",
      },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
