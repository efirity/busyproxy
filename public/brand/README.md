# BusyProxy brand assets

Use these everywhere (web, Android, docs, marketing).

## Files

| Path | Use |
|---|---|
| `logo-mark.svg` | Vector mark (UI, print) |
| `logo-full.svg` | Mark + wordmark |
| `icon-16.png` … `icon-1024.png` | Raster app icons |
| `icon-master.png` / `icon-1024.png` | Source of truth raster |
| `favicon.ico` | Browser tab (also `/favicon.ico`) |
| `og-icon.png` | Social / OG fallback |
| `source-generated.jpg` | Original generated art |

Public root shortcuts:

- `/favicon.ico`
- `/favicon-32.png`
- `/apple-touch-icon.png`
- `/icon-192.png`, `/icon-512.png`
- `/site.webmanifest`

## React components

```tsx
import { BrandLogo, BrandMark, BrandIcon } from "@/components/brand/logo";

<BrandLogo />           // nav lockup
<BrandMark className="h-6 w-6" />
<BrandIcon size={48} /> // PNG
```

## Android

Mipmaps under `android/app/src/main/res/mipmap-*/ic_launcher.png`  
Adaptive foreground: `drawable/ic_launcher_foreground.png`

## Meaning

Phone + signal + egress arrow = mobile bandwidth shared as a proxy path.  
Colors: brand blue `#3B82F6` → cyan `#22D3EE` on dark navy.


## Favicon (transparent)

Browser tab icons use a **transparent background** mark (no dark square tile):

- `/favicon.svg` — preferred (modern browsers)
- `/favicon.ico` — multi-size transparent PNG
- `/favicon-32.png`
- `icon-mark-transparent-1024.png` / `icon-transparent-*.png`

Apple touch icon keeps a dark rounded tile for iOS home screen readability.
