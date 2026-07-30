import { F as require_jsx_runtime, O as redirect, c as HeadContent, d as createRouter, f as Outlet, h as createRootRoute, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-J49nu1aI.js
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-BHgHmepW.css";
var siteUrl = "https://busyproxy.net";
var title = "BusyProxy — Share bandwidth. Get paid per GB.";
var description = "BusyProxy lets you earn money by sharing spare Wi‑Fi or mobile bandwidth. Phone OTP login, transparent per-GB pay, Stripe withdrawals from $20.";
var Route$7 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title },
			{
				name: "description",
				content: description
			},
			{
				name: "keywords",
				content: "bandwidth sharing, earn money wifi, residential proxy earner, share mobile data, get paid per GB, BusyProxy"
			},
			{
				name: "theme-color",
				content: "#07090e"
			},
			{
				name: "robots",
				content: "index,follow"
			},
			{
				name: "author",
				content: "BusyProxy"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				property: "og:site_name",
				content: "BusyProxy"
			},
			{
				property: "og:title",
				content: title
			},
			{
				property: "og:description",
				content: description
			},
			{
				property: "og:url",
				content: siteUrl
			},
			{
				property: "og:locale",
				content: "en_US"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: title
			},
			{
				name: "twitter:description",
				content: description
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "canonical",
			href: siteUrl
		}]
	}),
	component: RootDocument
});
function RootDocument() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", {
			type: "application/ld+json",
			dangerouslySetInnerHTML: { __html: JSON.stringify({
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
					description: "Free to install. Earn per GB shared. Withdraw from $20."
				}
			}) }
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg antialiased",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
		})]
	});
}
/** Host helpers for multi-domain routing (busyproxy.net / portal.busyproxy.net). */
function getHostname() {
	if (typeof window === "undefined") return "";
	return window.location.hostname.toLowerCase();
}
function isPortalHost(host = getHostname()) {
	return host === "portal.busyproxy.net" || host === "portal.localhost" || host.startsWith("portal.");
}
var $$splitComponentImporter$6 = () => import("./routes-D3Y54-kO.mjs");
var Route$6 = createFileRoute("/")({
	beforeLoad: () => {
		if (typeof window !== "undefined" && isPortalHost()) throw redirect({ to: "/portal" });
	},
	head: () => ({
		meta: [
			{ title: "BusyProxy — Share bandwidth. Get paid per GB." },
			{
				name: "description",
				content: "Earn money by sharing spare Wi‑Fi or mobile bandwidth with BusyProxy. Simple app, phone login, Stripe payouts from $20."
			},
			{
				property: "og:title",
				content: "BusyProxy — Share bandwidth. Get paid."
			},
			{
				property: "og:description",
				content: "Turn spare connection capacity into earnings. Phone OTP, transparent rates, secure withdrawals."
			}
		],
		links: [{
			rel: "canonical",
			href: "https://busyproxy.net/"
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./admin-DUJFKD03.mjs");
/** Legacy path — permanent redirect to portal. */
var Route$5 = createFileRoute("/admin")({
	beforeLoad: () => {
		throw redirect({ to: "/portal" });
	},
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./app-BCITOa-L.mjs");
var Route$4 = createFileRoute("/app")({
	head: () => ({
		meta: [
			{ title: "BusyProxy App — Start earning from shared bandwidth" },
			{
				name: "description",
				content: "BusyProxy earner app preview: phone OTP login, share Wi‑Fi or mobile data, track earnings, withdraw with Stripe."
			},
			{
				name: "robots",
				content: "index,follow"
			}
		],
		links: [{
			rel: "canonical",
			href: "https://busyproxy.net/app"
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./dashboard-DENasujC.mjs");
var Route$3 = createFileRoute("/dashboard")({
	head: () => ({ meta: [
		{ title: "BusyProxy Dashboard — Earnings & wallet" },
		{
			name: "description",
			content: "Sign in to your BusyProxy dashboard: traffic, earnings, devices, and Stripe withdrawals."
		},
		{
			name: "robots",
			content: "noindex,follow"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./design-Bt2HFR85.mjs");
/**
* Internal project page — design system.
* Not linked from public marketing nav. noindex.
*/
var Route$2 = createFileRoute("/design")({
	head: () => ({ meta: [{ title: "BusyProxy — Design system (internal)" }, {
		name: "robots",
		content: "noindex,nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./docs-CVAXUKrb.mjs");
/**
* Internal project specs — not linked from public marketing nav. noindex.
*/
var Route$1 = createFileRoute("/docs")({
	head: () => ({ meta: [{ title: "BusyProxy — Specs (internal)" }, {
		name: "robots",
		content: "noindex,nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./portal-BhYhqMKH.mjs");
/**
* Operator admin console.
* Public site: https://portal.busyproxy.net (and /portal on main host for dev).
* Not linked from marketing navigation.
*/
var Route = createFileRoute("/portal")({
	head: () => ({ meta: [
		{ title: "BusyProxy Portal — Operator console" },
		{
			name: "robots",
			content: "noindex,nofollow"
		},
		{
			name: "description",
			content: "Internal operator dashboard for BusyProxy."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$6.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$7
	}),
	AdminRoute: Route$5.update({
		id: "/admin",
		path: "/admin",
		getParentRoute: () => Route$7
	}),
	AppRoute: Route$4.update({
		id: "/app",
		path: "/app",
		getParentRoute: () => Route$7
	}),
	DashboardRoute: Route$3.update({
		id: "/dashboard",
		path: "/dashboard",
		getParentRoute: () => Route$7
	}),
	DesignRoute: Route$2.update({
		id: "/design",
		path: "/design",
		getParentRoute: () => Route$7
	}),
	DocsRoute: Route$1.update({
		id: "/docs",
		path: "/docs",
		getParentRoute: () => Route$7
	}),
	PortalRoute: Route.update({
		id: "/portal",
		path: "/portal",
		getParentRoute: () => Route$7
	})
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({ routeTree });
}
//#endregion
export { getRouter };
