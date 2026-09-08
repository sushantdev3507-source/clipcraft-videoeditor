import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/shell/AppShell";
import AccountSettingsPage from "@/components/account/AccountSettingsPage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & Settings — ClipCraft" },
      { name: "description", content: "Manage your ClipCraft account and preferences." },
      { property: "og:title", content: "Account & Settings — ClipCraft" },
      { property: "og:description", content: "Manage your ClipCraft account and preferences." },
    ],
  }),
  component: () => (
    <AppShell>
      <AccountSettingsPage />
    </AppShell>
  ),
});
