import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalErrorHandler } from "@/components/global-error-handler";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: './fonts/Switzer-Thin.otf', weight: '100', style: 'normal' },
    { path: './fonts/Switzer-ThinItalic.otf', weight: '100', style: 'italic' },
    { path: './fonts/Switzer-Extralight.otf', weight: '200', style: 'normal' },
    { path: './fonts/Switzer-ExtralightItalic.otf', weight: '200', style: 'italic' },
    { path: './fonts/Switzer-Light.otf', weight: '300', style: 'normal' },
    { path: './fonts/Switzer-LightItalic.otf', weight: '300', style: 'italic' },
    { path: './fonts/Switzer-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/Switzer-Italic.otf', weight: '400', style: 'italic' },
    { path: './fonts/Switzer-Medium.otf', weight: '500', style: 'normal' },
    { path: './fonts/Switzer-MediumItalic.otf', weight: '500', style: 'italic' },
    { path: './fonts/Switzer-Semibold.otf', weight: '600', style: 'normal' },
    { path: './fonts/Switzer-SemiboldItalic.otf', weight: '600', style: 'italic' },
    { path: './fonts/Switzer-Bold.otf', weight: '700', style: 'normal' },
    { path: './fonts/Switzer-BoldItalic.otf', weight: '700', style: 'italic' },
    { path: './fonts/Switzer-Extrabold.otf', weight: '800', style: 'normal' },
    { path: './fonts/Switzer-ExtraboldItalic.otf', weight: '800', style: 'italic' },
    { path: './fonts/Switzer-Black.otf', weight: '900', style: 'normal' },
    { path: './fonts/Switzer-BlackItalic.otf', weight: '900', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hexOS",
  description: "Project management portal for Hexona",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "hexOS",
    startupImage: "/apple-icon-180.png",
  },
  icons: {
    icon: [
      { url: "/manifest-icon-192.maskable.png", sizes: "192x192", type: "image/png" },
      { url: "/manifest-icon-512.maskable.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8860d0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={switzer.variable} suppressHydrationWarning>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <GlobalErrorHandler />
        <ServiceWorkerRegister />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <OfflineIndicator />
            {children}
            <InstallPrompt />
          </ErrorBoundary>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
