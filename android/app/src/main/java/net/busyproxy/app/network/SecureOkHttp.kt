package net.busyproxy.app.network

import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Shared OkHttp clients with **public-key (SPKI) pinning**.
 *
 * ## Renewal-safe design (no app update on every Let's Encrypt leaf renew)
 *
 * We do **not** rely only on the short-lived leaf cert for busyproxy.net
 * (those rotate ~every 60–90 days, often with a new key).
 *
 * OkHttp accepts a connection if **any** pin matches **any** cert in the
 * validated chain. So we pin:
 * - Current LE intermediate(s) + ISRG roots (survive leaf renewals)
 * - Common LE intermediates (R3, R10, R11, E5, E6, YE1, …) for CA path changes
 * - Current leaf as an *extra* pin (nice-to-have until that leaf key rotates)
 *
 * When LE issues a new leaf under a still-pinned intermediate/root, pinning
 * continues to work without shipping a new APK.
 *
 * ## When an app update *is* needed
 *
 * If Let's Encrypt (or our host) moves to a brand-new intermediate/root that
 * is not in this list, add its SPKI pin and ship an update *before* cutover.
 * Use: `./android/scripts/print-ssl-pins.sh busyproxy.net`
 */
object SecureOkHttp {

    /**
     * SPKI pins as `sha256/<base64>`.
     * Generated from live chain + published LE roots/intermediates (2026-07).
     */
    private val BUSYPROXY_SPKI_PINS: Array<String> =
        arrayOf(
            // --- Current chain (busyproxy.net, Jul 2026) ---
            // Leaf busyproxy.net (extra; may change on renew — not required alone)
            "sha256/hL/8BV5lL4Fr4Fc6UFwgRISASQbPXmqmB0qMoYsM/SY=",
            // Intermediate YE1
            "sha256/brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4=",
            // Root YE
            "sha256/sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=",
            // ISRG Root X2
            "sha256/diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=",
            // ISRG Root X1 (long-lived trust anchor)
            "sha256/C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=",
            // --- Other common Let's Encrypt intermediates (rotation buffer) ---
            // R3
            "sha256/jQJTbIh0grw0/1TkHSumWb+Fs0Ggogr621gT3PvPKG0=",
            // R10
            "sha256/K7rZOrXHknnsEhUH8nLL4MZkejquUuIvOIr6tCa0rbo=",
            // R11
            "sha256/bdrBhpj38ffhxpubzkINl0rG+UyossdhcBYj+Zx2fcc=",
            // E5
            "sha256/NYbU7PBwV4y9J67c4guWTki8FJ+uudrXL0a4V4aRcrg=",
            // E6
            "sha256/0Bbh/jEZSKymTy3kTOhsmlHKBB32EDu1KojrP3YfV9c=",
        )

    private val hosts =
        arrayOf(
            "busyproxy.net",
            "www.busyproxy.net",
            "gate.busyproxy.net",
            "admin.busyproxy.net",
            "agent.busyproxy.net",
        )

    val certificatePinner: CertificatePinner by lazy {
        val b = CertificatePinner.Builder()
        for (host in hosts) {
            b.add(host, *BUSYPROXY_SPKI_PINS)
            // OkHttp multi-level subdomain pattern
            b.add("**.$host", *BUSYPROXY_SPKI_PINS)
        }
        b.build()
    }

    /** Default API client (HTTPS control plane). */
    fun apiClient(
        connectTimeoutSec: Long = 20,
        readTimeoutSec: Long = 30,
    ): OkHttpClient =
        OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .connectTimeout(connectTimeoutSec, TimeUnit.SECONDS)
            .readTimeout(readTimeoutSec, TimeUnit.SECONDS)
            .build()

    /** Builder already configured with pinning — add socketFactory / timeouts for tunnel. */
    fun pinnedBuilder(): OkHttpClient.Builder =
        OkHttpClient.Builder().certificatePinner(certificatePinner)
}
