import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipCraft — Browser Video Editing Studio" },
      {
        name: "description",
        content:
          "ClipCraft is a browser based video studio: trim, split, caption and export your videos, with a media library, analytics history and team workspace.",
      },
      { property: "og:title", content: "ClipCraft — Browser Video Editing Studio" },
      {
        property: "og:description",
        content:
          "Trim, caption and export videos in your browser. ClipCraft brings your editor, media library and project history into one workspace.",
      },
    ],
  }),
  component: LandingPage,
});
