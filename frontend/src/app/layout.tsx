import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "Learn With Avee — AI-Powered Instagram Automation & Content Platform",
  description:
    "End-to-end AI automation SaaS for Learn With Avee: Research trending AI topics, generate high-retention Hindi/Hinglish Reel scripts, manage media, schedule and publish officially to Instagram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-brand-500/30">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
