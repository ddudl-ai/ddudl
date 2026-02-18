'use client&apos;

import Script from &apos;next/script&apos;

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        strategy=&quot;afterInteractive&quot;
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id=&quot;google-analytics&quot;
        strategy=&quot;afterInteractive&quot;
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag(&apos;js&apos;, new Date());
            gtag(&apos;config&apos;, &apos;${GA_MEASUREMENT_ID}&apos;, {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}
