"use client";

import { useSearchParams } from "next/navigation";

import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import MediaLibrary from "@/components/media/MediaLibrary";

type MediaSearch = { projectId?: string };


function MediaRoute() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;
  return (
    <RequireAuth>
      <AppShell>
        <MediaLibrary projectId={projectId ?? null} />
      </AppShell>
    </RequireAuth>
  );
}


export default MediaRoute;
