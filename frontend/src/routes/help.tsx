import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/shell/AppShell";
import HelpSupport from "@/components/help/HelpSupport";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — ClipCraft" },
      { name: "description", content: "ClipCraft help centre, FAQs and support requests." },
      { property: "og:title", content: "Help & Support — ClipCraft" },
      { property: "og:description", content: "ClipCraft help centre, FAQs and support requests." },
    ],
  }),
  component: () => (
    <AppShell>
      <HelpSupport />
    </AppShell>
  ),
});
