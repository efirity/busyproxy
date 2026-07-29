import { g as require_jsx_runtime, h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CTHgZWgb.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSkeleton, {}) });
}
function AppSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-[min(844px,100dvh)] w-full max-w-[390px] animate-pulse rounded-[2.25rem] border border-border bg-bg-elevated sm:h-[min(844px,calc(100dvh-6rem))]" })
	});
}
//#endregion
export { Home as component };
