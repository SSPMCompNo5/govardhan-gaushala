import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Script from "next/script";
import SessionProviderWrapper from "../components/providers/SessionProviderWrapper";
import MetricsProvider from "../components/providers/MetricsProvider";
import HelpLauncher from "../components/help/HelpLauncher";

export const metadata = {
  title: "Govardhan Goshala Management System",
  description: "Comprehensive management system for cow shelter operations including gate management, food inventory, health records, and staff coordination",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Goshala"
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Govardhan Goshala",
    title: "Govardhan Goshala Management System",
    description: "Comprehensive management system for cow shelter operations",
  },
  twitter: {
    card: "summary",
    title: "Govardhan Goshala Management System",
    description: "Comprehensive management system for cow shelter operations",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen`}>
        <SessionProviderWrapper>
          <MetricsProvider>
            <div className="min-h-screen bg-background">
              {children}
              <HelpLauncher />
            </div>
          </MetricsProvider>
        </SessionProviderWrapper>
        <Script id="service-worker" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                  .then(registration => {
                    console.log('ServiceWorker registration successful');
                  })
                  .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                  });
              });
              
              // Listen for controllerchange event to handle page refreshes
              let refreshing = false;
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                  window.location.reload();
                  refreshing = true;
                }
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
