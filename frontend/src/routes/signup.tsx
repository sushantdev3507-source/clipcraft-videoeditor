import { createFileRoute } from "@tanstack/react-router";
import AuthForm from "@/components/auth/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — ClipCraft" },
      {
        name: "description",
        content: "Create a free ClipCraft account and start editing videos in your browser.",
      },
      { property: "og:title", content: "Create account — ClipCraft" },
      {
        property: "og:description",
        content: "Create a free ClipCraft account and start editing videos in your browser.",
      },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
