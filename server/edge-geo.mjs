/**
 * Enrich device public IPs with country / city / ASN / ISP.
 * Uses ip-api.com (no key, rate-limited ~45 req/min).
 */
import http from "node:http";

const cache = new Map(); // ip → { at, data }
const CACHE_MS = 30 * 60 * 1000;

function fetchJson(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let raw = "";
      res.on("data", (c) => {
        raw += c;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("geo_timeout"));
    });
  });
}

/**
 * @param {string} ip
 * @returns {Promise<{
 *   country: string|null,
 *   countryCode: string|null,
 *   region: string|null,
 *   city: string|null,
 *   zip: string|null,
 *   lat: number|null,
 *   lon: number|null,
 *   isp: string|null,
 *   org: string|null,
 *   asn: string|null,
 *   asOrg: string|null,
 *   query: string|null,
 * } | null>}
 */
export async function lookupIpGeo(ip) {
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  try {
    const fields =
      "status,message,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,as,query";
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`;
    const j = await fetchJson(url);
    if (!j || j.status !== "success") return null;
    const asRaw = String(j.as || "");
    const asnMatch = asRaw.match(/AS(\d+)/i);
    const data = {
      country: j.country || null,
      countryCode: j.countryCode || null,
      region: j.regionName || j.region || null,
      city: j.city || null,
      zip: j.zip || null,
      lat: typeof j.lat === "number" ? j.lat : null,
      lon: typeof j.lon === "number" ? j.lon : null,
      isp: j.isp || null,
      org: j.org || null,
      asn: asnMatch ? `AS${asnMatch[1]}` : asRaw || null,
      asOrg: asRaw.replace(/^AS\d+\s*/i, "").trim() || j.org || null,
      query: j.query || ip,
    };
    cache.set(ip, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

/**
 * Apply geo fields onto a device object (mutates).
 */
export function applyGeoToDevice(device, geo) {
  if (!device || !geo) return device;
  if (geo.countryCode) device.country = geo.countryCode;
  if (geo.country) device.countryName = geo.country;
  if (geo.city) device.city = geo.city;
  if (geo.region) device.region = geo.region;
  if (geo.isp) device.isp = geo.isp;
  if (geo.org) device.org = geo.org;
  if (geo.asn) device.asn = geo.asn;
  if (geo.asOrg) device.asOrg = geo.asOrg;
  if (geo.lat != null) device.lat = geo.lat;
  if (geo.lon != null) device.lon = geo.lon;
  if (geo.zip) device.zip = geo.zip;
  device.geoAt = Date.now();
  return device;
}
