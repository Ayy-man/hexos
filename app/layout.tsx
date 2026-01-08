import type { Metadata } from "next";
import { Geist_Mono, Figtree } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import { InstallPrompt } from "@/components/install-prompt";
import "./globals.css";

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hexOS",
  description: "Project management portal for Hexona",
  manifest: "/manifest.json",
  themeColor: "#8860d0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "hexOS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OfflineIndicator />
          {children}
          <InstallPrompt />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
