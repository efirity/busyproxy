package net.busyproxy.app.relay

import org.json.JSONObject

/**
 * Frame protocol between phone agent and edge (BusyProxy + PocketRelay-inspired).
 * Transport: WebSocket text JSON for MVP (binary/protobuf later).
 *
 * Server → phone:
 *   {"type":"open","streamId":"...","host":"example.com","port":443}
 *   {"type":"data","streamId":"...","b64":"..."}
 *   {"type":"close","streamId":"...","reason":"client"}
 *   {"type":"ping","t":123}
 *
 * Phone → server:
 *   {"type":"hello","deviceId":"...","deviceSecret":"...","network":"cellular","generation":1}
 *   {"type":"open_ok","streamId":"..."}
 *   {"type":"open_err","streamId":"...","code":"..."}
 *   {"type":"data","streamId":"...","b64":"..."}
 *   {"type":"close","streamId":"..."}
 *   {"type":"stats","bytesUp":0,"bytesDown":0,"streams":0,"egressIp":"..."}
 *   {"type":"pong","t":123}
 */
object TunnelProtocol {
    fun hello(
        deviceId: String,
        deviceSecret: String,
        network: String,
        generation: Long,
        country: String?,
        userId: String?,
    ): String =
        JSONObject()
            .put("type", "hello")
            .put("deviceId", deviceId)
            .put("deviceSecret", deviceSecret)
            .put("network", network)
            .put("generation", generation)
            .put("platform", "android")
            .put("userId", userId ?: JSONObject.NULL)
            .put("country", country ?: JSONObject.NULL)
            .toString()

    fun openOk(streamId: String): String =
        JSONObject().put("type", "open_ok").put("streamId", streamId).toString()

    fun openErr(streamId: String, code: String): String =
        JSONObject()
            .put("type", "open_err")
            .put("streamId", streamId)
            .put("code", code)
            .toString()

    fun close(streamId: String, reason: String = "local"): String =
        JSONObject()
            .put("type", "close")
            .put("streamId", streamId)
            .put("reason", reason)
            .toString()

    fun data(streamId: String, b64: String): String =
        JSONObject()
            .put("type", "data")
            .put("streamId", streamId)
            .put("b64", b64)
            .toString()

    fun stats(bytesUp: Long, bytesDown: Long, streams: Int, egressIp: String?): String =
        JSONObject()
            .put("type", "stats")
            .put("bytesUp", bytesUp)
            .put("bytesDown", bytesDown)
            .put("streams", streams)
            .put("egressIp", egressIp ?: JSONObject.NULL)
            .toString()

    fun pong(t: Long): String =
        JSONObject().put("type", "pong").put("t", t).toString()
}
