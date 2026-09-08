import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import MediaLibrary from "@/components/media/MediaLibrary";

type MediaSearch = { projectId?: string };

export const Route = createFileRoute("/media")({
  validateSearch: (search: Record<string, unknown>): MediaSearch =>
    typeof search["projectId"] === "string" && search["projectId"]
      ? { projectId: search["projectId"] }
      : {},
  head: () => ({
    meta: [
      { title: "Media Library — ClipCraft" },
      { name: "description", content: "Manage your videos, images and audio files." },
      { property: "og:title", content: "Media Library — ClipCraft" },
      { property: "og:description", content: "Manage your videos, images and audio files." },
    ],
  }),
  component: MediaRoute,
});

function MediaRoute() {
  const { projectId } = Route.useSearch();
  return (
    <RequireAuth>
      <AppShell>
        <MediaLibrary projectId={projectId ?? null} />
      </AppShell>
    </RequireAuth>
  );
}
