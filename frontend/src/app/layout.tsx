import type { Metadata } from "next";
import "./../styles.css";
import Providers from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ClipCraft — Browser Video Editing Studio",
  description:
    "Create and edit videos in a responsive browser-based workspace with ClipCraft.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
