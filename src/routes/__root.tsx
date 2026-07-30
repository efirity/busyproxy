import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const siteUrl = "https://busyproxy.net";
const title = "BusyProxy — Share bandwidth. Get paid per GB.";
const description =
  "BusyProxy lets you earn money by sharing spare Wi‑Fi or mobile bandwidth. Phone OTP login, transparent per-GB pay, Stripe withdrawals from $20.";

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
      { name: "robots", content: "index,follow" },
      { name: "author", content: "BusyProxy" },
      { name: "color-scheme", content: "dark" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BusyProxy" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: siteUrl },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      // Preload critical CSS for faster first paint
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: siteUrl },
      // Faster API/auth on first interaction
      { rel: "preconnect", href: siteUrl },
      { rel: "dns-prefetch", href: siteUrl },
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
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
