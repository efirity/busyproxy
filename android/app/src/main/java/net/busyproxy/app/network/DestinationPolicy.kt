package net.busyproxy.app.network

import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress

/**
 * PocketRelay-aligned destination policy:
 * - TCP ports 80/443 only (MVP)
 * - Block private, loopback, link-local, metadata, multicast
 */
object DestinationPolicy {
    private val allowedPorts = setOf(80, 443)

    fun assertAllowed(host: String, port: Int, resolved: List<InetAddress>) {
        require(port in allowedPorts) { "port_not_allowed:$port" }
        require(host.isNotBlank()) { "empty_host" }
        // block literal special hostnames
        val h = host.lowercase()
        require(h != "localhost" && !h.endsWith(".local")) { "host_blocked" }
        for (addr in resolved) {
            require(!isBlocked(addr)) { "address_blocked:${addr.hostAddress}" }
        }
    }

    fun isBlocked(addr: InetAddress): Boolean {
        if (addr.isAnyLocalAddress || addr.isLoopbackAddress || addr.isLinkLocalAddress) return true
        if (addr.isMulticastAddress) return true
        if (addr is Inet4Address) {
            val b = addr.address
            val a = b[0].toInt() and 0xff
            val b1 = b[1].toInt() and 0xff
            // 10/8
            if (a == 10) return true
            // 172.16/12
            if (a == 172 && b1 in 16..31) return true
            // 192.168/16
            if (a == 192 && b1 == 168) return true
            // 169.254/16 link-local
            if (a == 169 && b1 == 254) return true
            // 100.64/10 CGNAT — optional block for dest; usually not dest
            // Cloud metadata 169.254.169.254 already link-local
            // 127 already loopback
            // 0.0.0.0
            if (a == 0) return true
        }
        if (addr is Inet6Address) {
            if (addr.isSiteLocalAddress) return true
            // unique local fc00::/7
            val first = addr.address[0].toInt() and 0xfe
            if (first == 0xfc) return true
        }
        return false
    }
}
