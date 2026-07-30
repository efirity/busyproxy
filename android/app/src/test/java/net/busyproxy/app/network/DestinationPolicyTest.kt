package net.busyproxy.app.network

import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.InetAddress

class DestinationPolicyTest {
    @Test
    fun blocksLoopbackAndPrivate() {
        assertTrue(DestinationPolicy.isBlocked(InetAddress.getByName("127.0.0.1")))
        assertTrue(DestinationPolicy.isBlocked(InetAddress.getByName("10.0.0.1")))
        assertTrue(DestinationPolicy.isBlocked(InetAddress.getByName("192.168.1.1")))
        assertTrue(DestinationPolicy.isBlocked(InetAddress.getByName("172.16.0.1")))
        assertTrue(DestinationPolicy.isBlocked(InetAddress.getByName("169.254.169.254")))
    }

    @Test
    fun allowsPublicAndPort80_443() {
        val public = InetAddress.getByName("1.1.1.1")
        assertFalse(DestinationPolicy.isBlocked(public))
        DestinationPolicy.assertAllowed("example.com", 443, listOf(public))
        DestinationPolicy.assertAllowed("example.com", 80, listOf(public))
    }

    @Test
    fun rejectsOtherPorts() {
        val public = InetAddress.getByName("8.8.8.8")
        assertThrows(IllegalArgumentException::class.java) {
            DestinationPolicy.assertAllowed("example.com", 22, listOf(public))
        }
    }
}
