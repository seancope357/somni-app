import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "DREAMONEIR - Dream Interpretation & Journal",
  description: "Decode your dreams with DREAMONEIR, the AI-powered dream interpretation and journal app. Track patterns, get insights, and understand your subconscious mind.",
  keywords: ["DREAMONEIR", "dream interpretation", "dream journal", "dream meaning", "dream analysis", "AI dream", "subconscious", "dream symbols", "sleep tracker", "dream dictionary"],
  authors: [{ name: "DREAMONEIR Team" }],
  icons: {
    icon: "/oneir-icon.png",
  },
  openGraph: {
    title: "DREAMONEIR - Dream Interpretation & Journal",
    description: "Decode your dreams with AI-powered interpretation and track your subconscious patterns",
    url: "https://chat.z.ai",
    siteName: "DREAMONEIR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DREAMONEIR - Dream Interpretation & Journal",
    description: "Decode your dreams with AI-powered interpretation and track your subconscious patterns",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground font-sans"
        style={{
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
