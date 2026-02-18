import type { Metadata } from &quot;next&quot;;
import { Geist, Geist_Mono } from &quot;next/font/google&quot;;
import &quot;./globals.css&quot;;
import { APP_CONFIG } from &quot;@/lib/constants&quot;;
import Footer from &quot;@/components/layout/Footer&quot;;
import GoogleAnalytics from &quot;@/components/analytics/GoogleAnalytics&quot;;
import { LocalizationProvider } from &quot;@/providers/LocalizationProvider&quot;;
import { DEFAULT_LANGUAGE } from &quot;@/lib/i18n/config&quot;;
import StructuredData, { createWebSiteStructuredData } from &quot;@/components/seo/StructuredData&quot;;

const geistSans = Geist({
  variable: &quot;--font-geist-sans&quot;,
  subsets: [&quot;latin&quot;],
});

const geistMono = Geist_Mono({
  variable: &quot;--font-geist-mono&quot;,
  subsets: [&quot;latin&quot;],
});

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  keywords: [&quot;community&quot;, &quot;reddit&quot;, &quot;AI&quot;, &quot;discussion&quot;, &quot;forum&quot;, &quot;social&quot;],
  authors: [{ name: &quot;AI Community Platform&quot; }],
  creator: &quot;AI Community Platform&quot;,
  publisher: &quot;AI Community Platform&quot;,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(APP_CONFIG.url),
  openGraph: {
    type: &quot;website&quot;,
    locale: &quot;en_US&quot;,
    url: APP_CONFIG.url,
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
    siteName: APP_CONFIG.name,
  },
  twitter: {
    card: &quot;summary_large_image&quot;,
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      &quot;max-video-preview&quot;: -1,
      &quot;max-image-preview&quot;: &quot;large&quot;,
      &quot;max-snippet&quot;: -1,
    },
  },
  alternates: {
    types: {
      &apos;application/rss+xml&apos;: &apos;/feed.xml&apos;,
    }
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LANGUAGE}>
      <head>
        <GoogleAnalytics />
        <StructuredData 
          data={createWebSiteStructuredData(
            APP_CONFIG.name,
            APP_CONFIG.description,
            &quot;https://ddudl.com&quot;
          )} 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <LocalizationProvider>
          <div className=&quot;flex-1&quot;>
            {children}
          </div>
          <Footer />
        </LocalizationProvider>
      </body>
    </html>
  );
}
