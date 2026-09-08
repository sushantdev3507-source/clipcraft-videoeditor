import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/shell/AppShell";
import AnalyticsHistoryPage from "@/components/analytics/AnalyticsHistoryPage";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics History — ClipCraft" },
      { name: "description", content: "Review export history and editing analytics." },
      { property: "og:title", content: "Analytics History — ClipCraft" },
      { property: "og:description", content: "Review export history and editing analytics." },
    ],
  }),
  component: () => (
    <AppShell>
      <AnalyticsHistoryPage />
    </AppShell>
  ),
});
