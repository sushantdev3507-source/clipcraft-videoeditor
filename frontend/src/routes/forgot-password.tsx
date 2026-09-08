import { createFileRoute } from "@tanstack/react-router";
import AuthForm from "@/components/auth/AuthForm";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — ClipCraft" },
      {
        name: "description",
        content: "Request a password reset link for your ClipCraft account.",
      },
      { property: "og:title", content: "Reset your password — ClipCraft" },
      {
        property: "og:description",
        content: "Request a password reset link for your ClipCraft account.",
      },
    ],
  }),
  component: () => <AuthForm mode="forgot" />,
});
