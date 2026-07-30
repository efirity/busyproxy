import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const siteUrl = "https://busyproxy.net";
const title = "BusyProxy — Share bandwidth. Get paid per GB.";
const description =
  "BusyProxy lets you earn money by sharing spare Wi‑Fi or mobile bandwidth. Phone OTP login, transparent per-GB pay, Stripe withdrawals from $20.";

/** Google Analytics 4 (gtag.js) */
const GA_MEASUREMENT_ID = "G-Z1ZVDLYFWQ";

/** Google Tag Manager container (tags/ads managed in GTM UI) */
const GTM_ID = "GTM-NB3866JG";

const gtagInlineScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`.trim();

const gtmHeadScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title },
      { name: "description", content: description },
      {
        name: "keywords",
        content:
          "bandwidth sharing, earn money wifi, residential proxy earner, share mobile data, get paid per GB, BusyProxy",
      },
      { name: "theme-color", content: "#07090e" },
      { name: "msapplication-TileColor", content: "#07090e" },
      { name: "robots", content: "index,follow" },
      { name: "author", content: "BusyProxy" },
      { name: "color-scheme", content: "dark" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BusyProxy" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: siteUrl },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: `${siteUrl}/brand/icon-512.png` },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: `${siteUrl}/brand/icon-512.png` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: siteUrl },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/brand/icon-transparent-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: siteUrl },
      { rel: "dns-prefetch", href: siteUrl },
      {
        rel: "preconnect",
        href: "https://www.googletagmanager.com",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BusyProxy",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, Web",
    description,
    url: siteUrl,
    image: `${siteUrl}/brand/icon-512.png`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to install. Earn per GB shared. Withdraw from $20.",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: gtmHeadScript }} />
        <HeadContent />
        {/* Google tag (gtag.js) — GA4 */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <script dangerouslySetInnerHTML={{ __html: gtagInlineScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
