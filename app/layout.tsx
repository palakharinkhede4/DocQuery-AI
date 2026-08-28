import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocQuery — Document Assistant & Q&A",
  description: "Ask questions across your documents with verified, accurate answers.",
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
