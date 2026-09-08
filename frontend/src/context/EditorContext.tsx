"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type EditorVideo = {
  name: string;
  size: number;
  url: string;
  /** set when the video comes from an uploaded backend asset */
  assetId?: string;
};

type EditorContextValue = {
  video: EditorVideo | null;
  /** local, not-yet-uploaded file (object URL) */
  setVideo: (file: File) => void;
  /** already-uploaded backend asset, played from its stream URL */
  setRemoteVideo: (video: EditorVideo) => void;
  clearVideo: () => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [video, setVideoState] = useState<EditorVideo | null>(null);
  const urlRef = useRef<string | null>(null);

  const setVideo = useCallback((file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setVideoState({ name: file.name, size: file.size, url });
  }, []);

  const setRemoteVideo = useCallback((next: EditorVideo) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    // Backend stream blobs are also object URLs, so keep tracking them for
    // revocation when the video is replaced or cleared.
    urlRef.current = next.url.startsWith("blob:") ? next.url : null;
    setVideoState(next);
  }, []);

  const clearVideo = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setVideoState(null);
  }, []);

  const value = useMemo(
    () => ({ video, setVideo, setRemoteVideo, clearVideo }),
    [video, setVideo, setRemoteVideo, clearVideo],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}
