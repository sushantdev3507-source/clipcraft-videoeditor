import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import EditorWorkspace from "@/components/editor/EditorWorkspace";

type EditorSearch = { projectId?: string; assetId?: string };

export const Route = createFileRoute("/editor")({
  validateSearch: (search: Record<string, unknown>): EditorSearch => ({
    ...(typeof search["projectId"] === "string" && search["projectId"]
      ? { projectId: search["projectId"] }
      : {}),
    ...(typeof search["assetId"] === "string" && search["assetId"]
      ? { assetId: search["assetId"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Editor Workspace — ClipCraft" },
      {
        name: "description",
        content: "Trim, crop, add text overlays and export your video in the ClipCraft editor.",
      },
      { property: "og:title", content: "Editor Workspace — ClipCraft" },
      {
        property: "og:description",
        content: "Trim, crop, add text overlays and export your video in the ClipCraft editor.",
      },
    ],
  }),
  component: EditorRoute,
});

function EditorRoute() {
  const { projectId, assetId } = Route.useSearch();
  return (
    <RequireAuth>
      <AppShell>
        <EditorWorkspace projectId={projectId ?? null} assetId={assetId ?? null} />
      </AppShell>
    </RequireAuth>
  );
}
