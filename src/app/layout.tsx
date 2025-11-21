import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
