import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocQuery — Technical Document Intelligence",
  description: "Session-isolated document intelligence and question answering engine.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-stone-900 selection:text-stone-100 dark:selection:bg-stone-100 dark:selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
