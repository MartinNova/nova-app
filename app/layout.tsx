import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { PageTitleProvider } from "@/components/providers/PageTitleProvider";
import { PresenceProvider } from "@/components/providers/PresenceProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { WelcomeGate } from "@/components/welcome/WelcomeGate";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/config/app";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  // iPhone: open full screen from the home screen, with the app's short name under the icon.
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: "default" },
  // Shared links show a preview card (image: app/opengraph-image.tsx).
  openGraph: { title: APP_NAME, description: APP_DESCRIPTION, siteName: APP_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1220" },
  ],
};

/** App shell: header on top, page content in the middle, bottom navigation. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <CurrentUserProvider>
          <PresenceProvider>
            <ToastProvider>
              <WelcomeGate>
                <PageTitleProvider>
                  <Header />
                  <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 pb-36">
                    {children}
                  </main>
                  <BottomNav />
                </PageTitleProvider>
              </WelcomeGate>
            </ToastProvider>
          </PresenceProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
