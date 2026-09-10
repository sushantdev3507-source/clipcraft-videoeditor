"use client";

import { useSearchParams } from "next/navigation";

import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import EditorWorkspace from "@/components/editor/EditorWorkspace";

type EditorSearch = { projectId?: string; assetId?: string };


function EditorRoute() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;
  const assetId = searchParams.get("assetId") ?? undefined;
  return (
    <RequireAuth>
      <AppShell>
        <EditorWorkspace projectId={projectId ?? null} assetId={assetId ?? null} />
      </AppShell>
    </RequireAuth>
  );
}


export default EditorRoute;
