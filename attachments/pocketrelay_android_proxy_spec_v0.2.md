# PocketRelay: Android Mobile Egress Proxy
## Product, Architecture, Security, UX, and MVP Implementation Specification

**Document status:** Implementation-ready product and engineering specification; real-device and policy validation still required  
**Version:** 0.2  
**Date:** 30 July 2026  
**Working product name:** PocketRelay  
**Primary platform:** Android  
**Recommended first release:** Private, owner-controlled beta  
**Audience:** Product, Android, backend, infrastructure, security, legal/compliance, QA, and design teams

**Version 0.2 change:** Added normative Wi-Fi-only, prefer-Wi-Fi, fallback, validation, network-pinning, transition, API, and acceptance-test requirements.

---

## 1. Executive summary

PocketRelay is an Android application that lets a phone owner deliberately use the phone's network connection as an authenticated internet egress point. A customer-controlled computer, server, test environment, or compatible service connects to a proxy endpoint hosted by PocketRelay. Traffic is carried through an encrypted reverse tunnel to the Android device, and the Android device opens the destination connection through the user-selected Android network: cellular, Wi-Fi, or an explicitly selected fallback policy.

The product should be described as an **owner-controlled mobile egress relay**, not as a hidden “residential proxy” SDK or an open proxy marketplace.

### Feasibility verdict

The project is technically feasible, but the reliable architecture is **not** “open a public proxy port directly on the phone.” Most mobile networks place devices behind carrier-grade NAT, use dynamic addressing, block inbound connections, or change network paths frequently. The practical architecture is:

1. The Android app starts only after an explicit user action.
2. The app runs a visible foreground service.
3. The app establishes an outbound, authenticated, encrypted tunnel to a cloud relay.
4. The cloud relay exposes an authenticated HTTPS proxy endpoint and, optionally, a SOCKS5 endpoint.
5. An authorized client connects to that endpoint.
6. The relay multiplexes the client connection through the phone's tunnel.
7. The phone resolves and opens the destination socket on the selected Android `Network` (cellular or Wi-Fi).
8. Bytes flow bidirectionally without TLS interception or payload inspection.

### Recommended product boundary for version 1

Version 1 should be a closed, private system for the phone owner or a small authorized team. It should have all of the following characteristics:

- No open or anonymous proxy access.
- No hidden background operation.
- No bandwidth resale or passive-income marketplace.
- No embedded third-party proxy SDK.
- No traffic interception, certificate installation, or TLS decryption.
- No automatic traffic routing for unrelated users.
- No silent Wi-Fi fallback when “cellular only” is selected.
- No access to private, loopback, link-local, carrier-internal, or cloud metadata addresses.
- Default destination ports limited to TCP 80 and 443.
- Explicit user disclosure, persistent notification, usage counters, data cap, and one-tap stop.
- Revocable credentials, IP allowlists, concurrency limits, rate limits, and audit controls.

This boundary materially lowers abuse, app-store, privacy, legal, and reputational risk.

---

## 2. Product definition

### 2.1 Product statement

> PocketRelay turns an Android phone into a user-controlled, authenticated mobile internet egress node. Authorized clients connect through a secure relay endpoint, while the phone owner remains informed and in control of when the relay runs, which network it uses, how much data it consumes, and who may access it.

### 2.2 Core value

The product provides a stable proxy address while preserving the phone's mobile-network egress IP. It removes the need for inbound connectivity to the phone and gives the owner direct controls over credentials, sessions, limits, and network selection.

### 2.3 Intended legitimate uses

Examples suitable for the initial product:

- Testing how a customer-owned website behaves from the phone owner's mobile network.
- Accessing the phone owner's own home, development, or staging resources through a controlled mobile egress.
- QA of localization, carrier behavior, mobile-network routing, or content delivery.
- Secure remote browsing or API testing by the device owner.
- A private team using company-owned phones as controlled test egress nodes.
- Debugging network behavior when the user has permission to access the destination.

### 2.4 Explicitly unsupported uses

The product, documentation, backend, and commercial terms should prohibit:

- Credential stuffing, scraping against terms or without authorization, spam, fraud, account farming, ad manipulation, or evasion of security controls.
- Hiding automation intended to bypass rate limits, geographic restrictions, account restrictions, or anti-abuse systems.
- Scanning private networks, cloud metadata services, or arbitrary ports.
- Selling access to people the phone owner does not know or authorize.
- Installing the app deceptively or bundling it in another app without prominent disclosure.
- Operating as an open proxy or public exit node.
- Capturing or modifying user traffic.
- Routing child, employee, or household-member traffic without informed authorization.
- Any activity prohibited by applicable law, the carrier's terms, the destination service's terms, or Google Play policies.

### 2.5 “Any service” compatibility caveat

No single proxy format works with literally every service. PocketRelay should initially expose:

- **HTTPS proxy with HTTP CONNECT:** broad support in browsers, command-line tools, SDKs, operating systems, and many SaaS integrations.
- **SOCKS5 CONNECT:** useful for software that supports SOCKS5.
- **Optional API connector or local agent later:** for applications that do not natively support a proxy.

Applications that use certificate pinning, custom UDP protocols, QUIC-only paths, raw sockets, or no proxy settings may require a local connector, VPN profile, browser extension, or application-specific integration. This limitation must be explained in product copy rather than promising universal compatibility.

---

## 3. Goals, non-goals, and success criteria

### 3.1 Version 1 goals

1. Let a user pair one Android device with an account.
2. Let the user start and stop a visible relay session.
3. Bind tunnel and destination sockets to the explicitly selected cellular or Wi-Fi `Network`, including cellular egress while Wi-Fi remains connected.
4. Provide one authenticated HTTPS proxy endpoint.
5. Optionally provide SOCKS5 CONNECT after the HTTPS path is stable.
6. Show live status, selected transport, carrier or Wi-Fi label where available, public egress IP, active connections, bytes transferred, and per-transport estimated data usage.
7. Let the user create, revoke, and rotate access credentials.
8. Enforce safe destination, port, concurrency, bandwidth, and daily data policies.
9. Recover cleanly from cellular and Wi-Fi changes, validation loss, temporary disconnects, and explicit fallback transitions.
10. Produce enough telemetry to diagnose failures without retaining payloads or sensitive browsing content.
11. Meet Android foreground-service requirements and prepare a defensible Google Play policy submission.
12. Support a private beta before public distribution.

### 3.2 Non-goals for version 1

- UDP forwarding.
- SOCKS5 `BIND`.
- Transparent interception of the phone's own traffic.
- Android `VpnService`.
- Traffic decryption or content filtering through man-in-the-middle TLS.
- Public bandwidth marketplace.
- Automatic SIM selection across all dual-SIM devices.
- Guaranteed persistence after OEM task killers or a device reboot.
- Peer-to-peer inbound connectivity that bypasses the cloud relay.
- Full IPv6 client ingress.
- Anonymous payments or anonymous users.
- Browser automation, account creation, or platform-specific evasion features.
- A desktop GUI.
- Multi-hop routing.

### 3.3 Product success criteria

A healthy beta should demonstrate:

- At least 95% successful relay startup on supported test devices under normal network conditions.
- Successful cellular egress while Wi-Fi remains connected, and successful Wi-Fi egress while mobile data remains enabled.
- No successful connection to blocked private, loopback, link-local, metadata, multicast, or reserved destinations.
- Credential revocation reflected at relay ingress within seconds.
- A stopped Android relay rejects new proxy connections and terminates active streams promptly.
- No request or response body is logged.
- Clear owner disclosure and a persistent foreground notification during operation.
- Reliable recovery after cellular IP changes, Wi-Fi transitions, captive-portal/validation changes, brief signal loss, and app-process recreation.
- Controlled bandwidth and predictable cloud cost.

These percentages and timings are internal product targets, not guarantees to customers.

---

## 4. Feasibility analysis and architecture choices

### 4.1 Why a direct public proxy on the phone is not the main design

A direct server would require the phone to listen on a TCP port and be reachable from the public internet. In practice, mobile devices often have:

- Carrier-grade NAT.
- No public inbound route.
- Dynamic IP address changes.
- Carrier firewalls.
- IPv6-only or NAT64 environments.
- Network transitions between LTE, 5G, Wi-Fi, and roaming.
- Android background execution restrictions.
- OEM battery managers that terminate long-running work.

A direct server can still be useful in a **local LAN mode**, such as when a laptop is connected to the phone's hotspot. It is not a reliable remote product architecture.

### 4.2 Architecture options

| Option | How it works | Advantages | Problems | Decision |
|---|---|---|---|---|
| Direct public port on phone | Phone listens for inbound proxy connections | Minimal cloud data plane | Usually unreachable because of CGNAT/firewalls; changing IP; difficult TLS and discovery | Reject for remote use |
| Local LAN/hotspot proxy | Client reaches phone on local network | Simple, low cloud cost, useful offline | Only works on same LAN/hotspot; Android hotspot addressing varies | Optional later |
| Reverse tunnel through cloud relay | Phone creates outbound tunnel; relay exposes proxy endpoint | Works through NAT; stable endpoint; centralized authentication and policy | Cloud bandwidth and operational complexity | **Recommended** |
| Android `VpnService` | Captures traffic generated on the phone | Useful for routing phone apps | Wrong primitive for remote clients; added policy and UX burden | Do not use in MVP |
| P2P hole punching | Attempts direct paths after coordination | Potentially lowers relay cost | Unreliable across carriers and NAT types; complex fallback | Research only |

### 4.3 Recommended system topology

```mermaid
flowchart LR
    C[Authorized client or service]
    P[Public proxy ingress<br/>HTTPS CONNECT / SOCKS5]
    R[Relay data plane]
    D[Device directory and session router]
    A[Android PocketRelay agent]
    N[Selected Android Network<br/>Cellular or Wi-Fi]
    T[Destination service]

    C -->|TLS + proxy credentials| P
    P -->|Authenticated stream| R
    R <--> D
    A -->|Outbound TLS tunnel| R
    R <==>|Multiplexed encrypted streams| A
    A -->|Socket bound to selected Network| N
    N --> T
```

### 4.4 Control plane and data plane separation

**Control plane responsibilities**

- User authentication.
- Device enrollment and ownership.
- Device public keys.
- Proxy credential creation and revocation.
- Policy configuration.
- Relay-region assignment.
- Session metadata and usage aggregation.
- Admin abuse response.
- Billing, if introduced later.

**Data plane responsibilities**

- Accept HTTPS proxy or SOCKS5 connections.
- Authenticate proxy credentials.
- Find the active device tunnel.
- Open, multiplex, back-pressure, and close byte streams.
- Enforce destination and usage policy.
- Keep payload in memory only while forwarding.
- Export metrics without storing content.

Separating these planes allows the data path to scale independently and reduces the amount of sensitive state handled by the control API.

---

## 5. End-to-end connection flow

### 5.1 Device enrollment

1. User installs the Android app.
2. App presents a prominent disclosure before any tunnel can run.
3. User signs in or pairs using a one-time code or QR code.
4. App generates a non-exportable device private key in Android Keystore.
5. App sends the public key, device metadata, app version, and attestation result if enabled.
6. Server creates a device record and returns a device ID, assigned relay region, policy version, and short-lived enrollment token.
7. App completes a challenge-response proof using the Keystore key.
8. Server marks the device as paired.
9. User chooses:
   - Cellular only.
   - Wi-Fi only.
   - Prefer cellular, with explicit Wi-Fi fallback.
   - Prefer Wi-Fi, with explicit cellular fallback.
   - Any validated network.
10. User sets a daily data cap, active-hours preference, and roaming rule.
11. App requests notification permission where required.
12. App shows the ready screen but does not start automatically.

### 5.2 Relay startup

1. User taps **Start mobile relay**.
2. App checks:
   - Consent accepted.
   - Account and device key valid.
   - Notification state.
   - Cellular network available when required.
   - Roaming policy.
   - Daily cap not exceeded.
3. App starts a foreground service from the user-visible activity.
4. Service posts a persistent notification immediately.
5. App selects and retains a validated Android `Network` according to the user's network mode.
6. App creates a TLS tunnel socket bound to that selected `Network`; split tunnel/egress transports are outside the MVP.
7. App authenticates with the device key and a short-lived server challenge.
8. Relay registers `device_id -> relay_node_id` with a short TTL.
9. Heartbeats refresh the registration.
10. Control plane marks the device online.
11. App resolves an external IP-check endpoint through the same selected network and shows the observed egress IP.
12. Proxy endpoint becomes available to authorized clients.

### 5.3 Client proxy connection

1. Client opens TLS to `proxy.example.com:443`.
2. Client authenticates with a generated proxy username/key.
3. Proxy ingress verifies:
   - Credential status.
   - Expiration.
   - IP allowlist.
   - Device association.
   - Concurrent stream limit.
   - Daily data limit.
   - Account and device state.
4. Client sends `CONNECT destination.example:443`.
5. Ingress validates hostname, port, and policy.
6. Ingress locates the active phone tunnel.
7. Ingress sends an `OPEN` frame with stream ID, hostname, and port.
8. Phone resolves the hostname using the selected Android `Network`.
9. Phone validates every resolved address against denied CIDRs.
10. Phone creates a TCP socket and binds it to the selected Android `Network` before connecting.
11. Phone connects to the destination.
12. Phone replies `OPEN_OK` or a sanitized error.
13. Relay acknowledges the CONNECT request.
14. Bytes flow in both directions with per-stream flow control.
15. On close, both sides emit a `CLOSE` frame and update byte counters.

### 5.4 Network transition

When the selected cellular or Wi-Fi network is lost, invalidated, or replaced:

1. App marks state as **Reconnecting**.
2. New stream opens are paused.
3. Existing destination sockets are expected to fail or are drained briefly.
4. Tunnel is re-established on the new `Network`.
5. Device registration TTL is refreshed on the new relay connection.
6. Client applications receive normal connection failures for streams that could not survive and may retry.
7. App returns to **Online** and records a non-sensitive diagnostic event.

QUIC can improve the tunnel's resilience, but destination TCP sockets bound to an old mobile path can still fail. The UI and API should represent this honestly.

---

## 6. Recommended technical stack

### 6.1 Android

| Area | Recommendation |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |
| Architecture | Layered architecture, unidirectional data flow, ViewModels |
| Dependency injection | Hilt |
| Concurrency | Kotlin Coroutines and Flow |
| Local preferences | DataStore |
| Structured local history | Room, only if needed |
| HTTP/control API | OkHttp or Ktor client |
| MVP tunnel | TLS WebSocket or gRPC bidirectional stream over HTTP/2 |
| Production tunnel | QUIC/HTTP/3 custom multiplexing, with HTTP/2/WebSocket fallback |
| Cryptographic key | Android Keystore |
| Serialization | Protobuf for data plane; Kotlin serialization for control API if desired |
| Logging | Structured redacted logs, local bounded ring buffer |
| Minimum SDK | 26 recommended |
| Target SDK | API 36 for the near-term Play deadline; verify at release time |
| Test SDK | API 26 through current stable, including Android 16/API 36 and Android 17/API 37 |

`minSdk 26` is a pragmatic baseline because it includes notification channels and avoids substantial legacy behavior. A commercial decision can raise it if the target audience uses newer devices.

### 6.2 Backend

**Recommended production split**

- **Control API:** TypeScript with Fastify or NestJS.
- **Primary database:** PostgreSQL.
- **Ephemeral routing/cache:** Redis or a compatible highly available key-value store.
- **Relay/data plane:** Go or Rust.
- **Admin console:** React/Next.js or an internal tool.
- **Metrics:** Prometheus-compatible metrics.
- **Tracing:** OpenTelemetry.
- **Logs:** Structured JSON with strict redaction.
- **Deployment:** Containers on managed Kubernetes, Nomad, or a simpler regional VM setup for MVP.
- **Edge TLS:** Envoy, HAProxy, NGINX, Caddy, or native TLS in the relay.
- **Secrets:** Cloud KMS/secret manager; never source control.

**Why Go or Rust for the relay**

The relay has many concurrent sockets, long-lived connections, back-pressure, low-copy byte forwarding, and strict resource limits. Go provides a fast path to a reliable network service. Rust offers tighter memory guarantees with higher implementation cost. TypeScript is acceptable for a small proof of concept but should not be the default high-scale data plane.

### 6.3 MVP simplification

A first technical prototype can use:

- One regional relay VM.
- One process that handles both device WebSockets and HTTPS CONNECT ingress.
- PostgreSQL for durable records.
- Redis only if multiple relay processes are introduced.
- A small TypeScript control API.
- No billing.
- No SOCKS5 until HTTPS CONNECT is stable.
- TestFlight-equivalent private Android distribution through internal testing or a signed APK for controlled testers.

The prototype must still enforce authentication, destination blocks, limits, TLS, and visible consent.

---

## 7. Android platform design

### 7.1 Foreground service

A running relay is continuous, user-visible network work. The app should use a foreground service and display a persistent notification for the entire active period.

The most plausible foreground service classification is `specialUse`, because a persistent owner-controlled relay is not ordinary short-lived `dataSync`, media playback, location, or connected-device work. Google Play reviews `specialUse` declarations, so this is a product and policy risk rather than an automatic approval.

Do not classify the relay as `dataSync` merely because bytes are transferred. Recent Android versions impose time limits on some foreground-service types. The chosen type and declaration should be validated against the exact release and Play review guidance before submission.

### 7.2 Start rules

- Start only from a user-visible screen after the user taps Start.
- Post the foreground notification immediately.
- Do not silently start after installation.
- Do not silently restart after reboot in MVP.
- If a future restart-on-boot feature is added, make it separately opt-in, clearly disclosed, and tested against current Android and Play restrictions.
- Provide Stop in the app and as a notification action.
- Treat notification permission denial as a degraded state and explain where Android still surfaces the active task.

### 7.3 Suggested manifest

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".PocketRelayApplication"
        android:allowBackup="false"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.PocketRelay">

        <service
            android:name=".relay.RelayForegroundService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="User-initiated, visible, authenticated mobile egress relay for owner-authorized clients" />
        </service>

    </application>
</manifest>
```

Notes:

- Keep components `android:exported="false"` unless an exported interface is genuinely required.
- `POST_NOTIFICATIONS` is runtime-granted on Android versions where applicable.
- Add `RECEIVE_BOOT_COMPLETED` only if a later, explicitly enabled restart feature is approved.
- Avoid broad permissions unrelated to the core function.
- Do not request location merely to infer carrier or network details.
- Do not use accessibility services, device admin, overlay, or package visibility for this product.

### 7.4 Selecting and binding to cellular or Wi-Fi

The app must not rely on the process default network. Android normally changes the default network as Wi-Fi and mobile connectivity change. PocketRelay must instead select one concrete `Network` for the relay session and bind every tunnel and destination socket to it before connecting.

Supported network modes:

| Mode | Required behavior | Fallback behavior |
|---|---|---|
| `CELLULAR_ONLY` | Use a validated `TRANSPORT_CELLULAR` network | None; pause and show an actionable error |
| `WIFI_ONLY` | Use a validated `TRANSPORT_WIFI` network | None; pause and show an actionable error |
| `PREFER_CELLULAR` | Use cellular when available | Fall back to validated Wi-Fi because the user explicitly selected this mode |
| `PREFER_WIFI` | Use Wi-Fi when available | Fall back to validated cellular and warn that mobile data is being used |
| `ANY_VALIDATED_NETWORK` | Use the current validated default network and pin the session to it | Select another validated network only after the pinned network is lost or invalidated |

A network with `NET_CAPABILITY_INTERNET` is not necessarily usable: captive-portal Wi-Fi can advertise internet configuration without public connectivity. The selector must wait for or verify `NET_CAPABILITY_VALIDATED`, detect `NET_CAPABILITY_CAPTIVE_PORTAL`, track metered and roaming state, and react to capability changes through `NetworkCallback`.

Illustrative Kotlin structure:

```kotlin
enum class RequiredTransport { CELLULAR, WIFI, DEFAULT_VALIDATED }

data class SelectedNetwork(
    val network: Network,
    val transport: RequiredTransport,
    val metered: Boolean,
    val roaming: Boolean,
)

class AndroidNetworkController(
    private val connectivityManager: ConnectivityManager,
) {
    fun requestFor(transport: RequiredTransport): NetworkRequest =
        NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .apply {
                when (transport) {
                    RequiredTransport.CELLULAR ->
                        addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
                    RequiredTransport.WIFI ->
                        addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                    RequiredTransport.DEFAULT_VALIDATED -> Unit
                }
            }
            .build()

    fun bindSocket(network: Network, socket: Socket) {
        // Must be called before Socket.connect().
        network.bindSocket(socket)
    }

    fun resolve(network: Network, host: String): Array<InetAddress> =
        network.getAllByName(host)
}
```

The production selector must maintain callbacks instead of treating the first `onAvailable` event as permanent. It should score only networks whose latest capabilities satisfy the selected mode and validation rules, retain the exact `Network` handle for the session, and emit a state flow containing availability, validation, transport, metered state, roaming state, and loss reason.

Production requirements:

- Declare `INTERNET`, `ACCESS_NETWORK_STATE`, and `CHANGE_NETWORK_STATE`; the last is needed when asking Android to bring up a non-default network such as cellular while Wi-Fi is active.
- Use per-socket `Network.bindSocket` or the selected network's `SocketFactory`; do not bind the whole process unless a measured library limitation makes it unavoidable.
- Bind before `connect()` and resolve DNS through `Network.getAllByName` or another resolver explicitly tied to the same network.
- In MVP, bind both the device-to-relay tunnel and destination sockets to the same selected network. Do not introduce split-network routing until it has its own threat model and tests.
- Maintain the network request/callback while the relay is active; release it when stopped.
- Treat `onLost`, loss of `VALIDATED`, and a captive-portal transition as a relay-network failure.
- Do not migrate existing TCP streams between networks. Mark reconnecting, close or drain them briefly, establish a new tunnel, verify the new egress IP, and then accept new streams.
- Never fall back in `CELLULAR_ONLY` or `WIFI_ONLY`.
- Preference modes must display the current fallback transport in the app and notification.
- `PREFER_WIFI` must warn before start that cellular data can be used; apply the mobile-data cap whenever the active transport is cellular.
- `ANY_VALIDATED_NETWORK` must display that the public IP can change after a network transition.
- Reject Wi-Fi that is local-only, captive, or unvalidated for the remote relay path.
- Do not require SSID access or location permission for basic Wi-Fi transport selection.
- Test IPv4, dual-stack IPv4/IPv6, IPv6-only, NAT64, metered Wi-Fi, roaming, dual SIM, Data Saver, Battery Saver, and OEM-specific behavior.
- Verify the public egress IP after every tunnel establishment and transport change. Do not mark the relay online until the observed transport and IP match the policy.

### 7.5 `VpnService` decision

`VpnService` is designed to capture and route traffic generated by applications on the Android device. PocketRelay's initial requirement is the opposite: receive authorized remote streams through a reverse tunnel and create outbound destination sockets.

Therefore:

- Do not use `VpnService` for MVP.
- Do not install a local root certificate.
- Do not intercept other apps.
- Do not claim to be a VPN.
- Revisit `VpnService` only for a separate, clearly defined feature that routes the phone's own apps, with its own policy, privacy, and UX review.

### 7.6 Foreground service states

```mermaid
stateDiagram-v2
    [*] --> Offline
    Offline --> Preparing: User taps Start
    Preparing --> Connecting: Validation passed
    Preparing --> Blocked: Consent, network, or limit problem
    Connecting --> Online: Tunnel authenticated
    Connecting --> Reconnecting: Temporary failure
    Online --> Reconnecting: Network lost or relay disconnected
    Reconnecting --> Online: Tunnel restored
    Reconnecting --> Paused: Retry budget exceeded
    Online --> Paused: Data cap, roaming, or policy
    Paused --> Connecting: User resumes / condition clears
    Online --> Stopping: User or admin stops
    Reconnecting --> Stopping
    Paused --> Stopping
    Stopping --> Offline
    Blocked --> Offline
```

The state model should be represented by one immutable `RelayUiState` and exposed as a `StateFlow`.

### 7.7 Battery strategy

- Keep one multiplexed tunnel rather than one tunnel per proxy stream.
- Use heartbeats only as frequently as needed by the relay and common NAT timeouts.
- Avoid a continuous partial wake lock when no data is active.
- Acquire narrowly scoped wake behavior only while processing active streams if tests show it is needed.
- Pause when the user-configured data cap is reached.
- Offer “Stop when battery below X%” as an opt-in safety rule.
- Show current battery impact rather than promising negligible usage.
- Provide OEM-specific diagnostics only where verified; do not force users to disable all battery protections.
- Expect some vendors to terminate long-running services despite platform-compliant implementation and include this in the support model.

### 7.8 Roaming, metered data, and dual SIM

Defaults:

- Roaming disabled.
- Mobile data cap set during onboarding.
- System-default cellular subscription for cellular modes.
- No silent SIM switching.
- Pause if the selected no-fallback network disappears; reconnect through the declared fallback only in a preference mode.
- Show whether Android reports the network as metered and roaming.
- Count bytes at the app layer and label them as estimates because carrier accounting can differ.

Dual-SIM selection can be a later feature. Public Android APIs and OEM behavior should be validated on target devices before promising exact SIM control.

---

## 8. Tunnel and proxy protocol design

### 8.1 Public ingress protocol

#### HTTPS proxy

Recommended public endpoint:

```text
Host: proxy.eu.example.com
Port: 443
Type: HTTPS proxy
Username: prx_dev_01H...
Password: generated high-entropy token
```

The client establishes TLS to the relay before sending proxy authentication. This protects proxy credentials in transit.

An optional convenience URI can be generated:

```text
https://USERNAME:PASSWORD@proxy.eu.example.com:443
```

The app should show host, port, username, and password separately by default because full URIs are easily leaked into shell history, logs, screenshots, or configuration exports. The password should be reveal-on-demand and one-tap rotatable.

Example client test:

```bash
curl \
  --proxy https://proxy.eu.example.com:443 \
  --proxy-user 'USERNAME:PASSWORD' \
  https://example.com/
```

#### SOCKS5

SOCKS5 CONNECT can be added after HTTPS CONNECT. SOCKS5 authentication does not itself encrypt the connection, so a public deployment needs one of these controls:

- SOCKS5 over a TLS wrapper supported by a PocketRelay local connector.
- Private network access.
- Strict source-IP allowlisting and a strong credential, with clear residual-risk disclosure.
- A future desktop agent that presents local SOCKS5 and tunnels securely to the relay.

Do not expose an unauthenticated public SOCKS5 port.

### 8.2 TCP-only MVP

Support:

- HTTP proxy requests.
- HTTP CONNECT.
- TCP SOCKS5 CONNECT later.

Do not support in MVP:

- UDP ASSOCIATE.
- SOCKS5 BIND.
- Raw ICMP.
- Port forwarding to the phone.
- Reverse destination connections.
- Arbitrary listening sockets.
- Transparent packet tunneling.

TCP-only significantly simplifies abuse controls, flow control, accounting, compatibility, and mobile implementation.

### 8.3 Multiplexed device tunnel

The phone should maintain a single authenticated tunnel and carry multiple logical streams. A simple binary frame format:

```text
+---------+------+-------+-----------+----------------+---------+
| version | type | flags | stream_id | payload_length | payload |
| 1 byte  | 1 B  | 2 B   | 4 B       | 4 B            | N bytes |
+---------+------+-------+-----------+----------------+---------+
```

Suggested frame types:

| Type | Direction | Purpose |
|---|---|---|
| `HELLO` | Phone → Relay | Protocol version, device ID, app version, capabilities |
| `CHALLENGE` | Relay → Phone | Nonce and session parameters |
| `AUTH` | Phone → Relay | Signed challenge and ephemeral session proof |
| `AUTH_OK` | Relay → Phone | Tunnel ID, policy version, heartbeat interval |
| `OPEN` | Relay → Phone | Request TCP stream to host and port |
| `OPEN_OK` | Phone → Relay | Destination socket connected |
| `OPEN_ERROR` | Phone → Relay | Sanitized failure code |
| `DATA` | Both | Stream bytes |
| `WINDOW_UPDATE` | Both | Per-stream or connection flow-control credit |
| `HALF_CLOSE` | Both | One direction reached EOF |
| `CLOSE` | Both | Close stream with reason |
| `PING` / `PONG` | Both | Liveness and latency |
| `POLICY_UPDATE` | Relay → Phone | New signed policy version |
| `DRAIN` | Either | Stop accepting new streams |
| `GOAWAY` | Either | Tunnel shutdown |
| `ERROR` | Either | Protocol-level failure |

Suggested safety limits:

- Maximum frame payload: 64 KiB.
- Maximum streams per device: policy-controlled, with a conservative beta default.
- Maximum buffered bytes per stream: small bounded queue.
- Maximum total buffered bytes per tunnel: hard limit.
- Open timeout: bounded.
- Idle stream timeout: configurable.
- Header parse failure: close tunnel.
- Unknown frame type: protocol error unless explicitly negotiated.
- Monotonic stream IDs scoped to a tunnel.
- No stream ID reuse within a tunnel.
- Per-stream and connection-level back-pressure.

### 8.4 MVP transport

Two realistic MVP choices:

**TLS WebSocket**

- Easy support in Android and common infrastructure.
- Simple bidirectional stream.
- Works through most outbound networks.
- Requires custom stream multiplexing and flow control.
- WebSocket head-of-line behavior can affect multiple logical streams after packet loss.

**gRPC bidirectional streaming over HTTP/2**

- Protobuf schema and generated clients.
- Built-in stream semantics and robust tooling.
- Still needs application-level multiplexing if one gRPC stream carries many proxy streams.
- HTTP/2 transport can suffer connection-level head-of-line effects at TCP level.
- More operational complexity through some proxies/load balancers.

Recommendation: use TLS WebSocket for the fastest controlled proof of concept, or gRPC if the team already operates it well. Design the application framing so the outer transport can later change.

### 8.5 Production transport

QUIC/HTTP/3 is a strong production candidate because it provides:

- Multiple independent streams.
- Encryption through TLS 1.3.
- Better behavior under packet loss than multiplexing every logical flow over one TCP connection.
- Connection migration support.

However, QUIC is not magic:

- Some carrier or enterprise networks block UDP.
- Destination TCP sockets still fail when the phone's egress path changes.
- Android library maturity and operational observability must be validated.
- A TCP/TLS fallback remains necessary.

A production client should negotiate:

1. QUIC.
2. HTTP/2 or WebSocket fallback.
3. Region failover if the assigned relay is unavailable.

### 8.6 DNS behavior

Resolve the destination on the phone through the selected Android `Network`, not at the cloud relay, so DNS and destination routing match the chosen cellular or Wi-Fi egress.

Rules:

- Normalize internationalized domain names safely.
- Reject malformed, overlong, or ambiguous hostnames.
- For literal IP requests, validate the IP directly.
- For hostnames, resolve all answers on the selected network.
- Reject if every answer is blocked.
- Never connect to a blocked answer.
- Protect against DNS rebinding by validating the exact address immediately before connecting.
- Use bounded DNS timeouts.
- Avoid storing the hostname after the stream ends unless an explicitly justified security record is required.
- Return only sanitized DNS or connection errors to the client.

---

## 9. Security architecture

### 9.1 Security principles

1. No open proxy.
2. Explicit owner control.
3. Least privilege on Android and backend.
4. Payload opacity: forward encrypted application traffic without decryption.
5. Minimum metadata retention.
6. Strong device identity.
7. Short-lived sessions.
8. Revocable client credentials.
9. Deny private and dangerous destinations by default.
10. Bounded resources everywhere.
11. Fail closed.
12. Visible operation and immediate stop.
13. Separate control and data-plane trust.
14. Signed policy and versioned protocol.
15. Abuse response designed before public launch.

### 9.2 Device identity

On enrollment:

- Generate a signing key in Android Keystore.
- Prefer hardware-backed storage when available, but do not reject legitimate devices solely because hardware backing is absent unless the threat model requires it.
- Mark the key non-exportable.
- Store only the public key server-side.
- Authenticate each tunnel with a fresh server challenge.
- Include tunnel nonce, server audience, device ID, app version, timestamp, and protocol version in the signed message.
- Reject replayed or expired challenges.
- Rotate device certificates or session tokens independently of the long-term Keystore key.
- Provide “Remove device” and remote revoke.
- On logout, revoke the device session and delete app-local secrets that can be deleted.

Optional hardening:

- Play Integrity API to assess app authenticity and device risk.
- Root/debugger indicators as risk signals, not the sole authentication control.
- Certificate pinning with backup pins and a tested rotation plan.
- mTLS between app and relay.
- Binary hardening and obfuscation without treating obscurity as security.

### 9.3 Proxy credentials

Each credential should have:

- Random identifier.
- At least 128 bits of secret entropy.
- Device or device-group scope.
- Created time.
- Optional expiration.
- Optional source-IP allowlist.
- Maximum concurrent streams.
- Per-minute connection limit.
- Bandwidth limit.
- Daily or monthly byte limit.
- Allowed ports.
- Optional domain allowlist.
- Last-used time.
- Revoked time.
- Human-readable label.

Server storage:

- Never store a retrievable plaintext password unless there is a compelling product requirement.
- Prefer a credential ID plus a keyed HMAC lookup or secure verifier.
- Encrypt any recoverable secret with KMS and tightly restrict access.
- Show the full token once, then require rotation instead of recovery.
- Do not put secrets in analytics or crash reports.
- Redact Authorization and Proxy-Authorization headers.
- Revoke at ingress before a stream is routed to the phone.

### 9.4 Destination policy

Default allow:

- TCP 80.
- TCP 443.

Default deny:

- Loopback.
- RFC1918 private IPv4.
- Link-local.
- Carrier-grade NAT space.
- Multicast.
- Broadcast.
- Reserved and documentation ranges.
- Cloud metadata endpoints.
- IPv6 loopback.
- IPv6 unique local addresses.
- IPv6 link-local.
- IPv6 multicast.
- Unspecified addresses.
- Other non-global or special-use ranges.
- SMTP ports and other commonly abused ports.
- Any port not explicitly allowed.

Illustrative denied ranges include, but are not limited to:

```text
IPv4:
0.0.0.0/8
10.0.0.0/8
100.64.0.0/10
127.0.0.0/8
169.254.0.0/16
172.16.0.0/12
192.0.0.0/24
192.0.2.0/24
192.168.0.0/16
198.18.0.0/15
198.51.100.0/24
203.0.113.0/24
224.0.0.0/4
240.0.0.0/4

IPv6:
::/128
::1/128
fc00::/7
fe80::/10
ff00::/8
2001:db8::/32
```

Use a maintained special-purpose address library or generated table rather than copying this illustrative list as the only source of truth. Validate both at relay ingress and on the phone after DNS resolution.

### 9.5 No TLS interception

PocketRelay should tunnel HTTPS with CONNECT and never:

- Install a CA certificate.
- Decrypt destination TLS.
- Rewrite requests.
- Inject headers.
- Capture passwords.
- Analyze response bodies.
- Modify certificates.
- Present itself as the destination.

The relay sees connection metadata needed to route a stream. The phone sees destination socket information. Application payload remains encrypted end-to-end between the authorized client and destination whenever the destination protocol itself uses encryption.

### 9.6 Threat model

| Threat | Impact | Primary controls |
|---|---|---|
| Leaked proxy credential | Unauthorized traffic through user's mobile IP | Strong random key, one-time display, IP allowlist, expiration, concurrency limits, instant revoke, alerts |
| Open proxy misconfiguration | Abuse, carrier complaints, legal exposure | Authentication mandatory in code, deny startup without policy, automated external open-proxy test |
| DNS rebinding to local address | Phone or carrier-internal network access | Resolve on phone, validate every answer immediately before connect, no private fallback |
| Destination port scanning | Abuse and reputation harm | Ports 80/443 only by default, connection-rate limits, anomaly detection |
| SMTP spam | IP/carrier abuse | Block SMTP and arbitrary ports |
| Relay compromise | Session theft or traffic disruption | mTLS, short-lived session keys, least privilege, segmented data plane, patched hosts, no plaintext payload logs |
| Control API compromise | Credential/device takeover | MFA for admins, RBAC, audit logs, KMS, rate limits, secure SDLC |
| Stolen phone | Unauthorized relay operation | Device lock dependency, app re-auth for sensitive controls, remote revoke, notification, no stored proxy plaintext |
| Malicious paired client | Fraud or prohibited use | Per-key policy, allowlist mode, quotas, visible sessions, kill switch, abuse monitoring |
| Malicious phone app build | Hidden proxy behavior | Signed releases, Play Integrity where suitable, reproducible release process, explicit foreground UI |
| Tunnel replay | Unauthorized session | Nonces, timestamps, signed challenges, session binding, replay cache |
| MITM | Credential/session exposure | TLS 1.3 where available, certificate validation, optional pinning/mTLS |
| Resource exhaustion | Battery, data, memory, relay outage | Bounded queues, caps, connection and bandwidth limits, back-pressure, circuit breakers |
| OEM kills service | Reliability failure | Foreground service, diagnostics, tested vendors, state recovery, honest support matrix |
| Roaming surprise | User cost | Default-off roaming, clear indication, pause and notify |
| Silent Wi-Fi use | Product promise violation | Bind tunnel and destination sockets to selected `Network`; no fallback in cellular-only mode |
| Metadata overcollection | Privacy and regulatory risk | Data minimization, short retention, no payload, access control, deletion workflow |
| Admin misuse | Privacy/security harm | Least privilege, approvals, immutable audit, no content access |
| DDoS against ingress | Cost/outage | Edge rate limits, credential pre-auth, SYN protection, regional capacity, automated blocking |
| App-store rejection | Distribution failure | Early policy review, core user-facing purpose, transparent listing, prominent disclosure, private beta first |

### 9.7 Abuse prevention baseline

Before external beta:

- Terms of use and acceptable-use policy.
- Verified email and risk-based account controls.
- No anonymous trial with unrestricted traffic.
- Conservative default quotas.
- Per-key and per-device connection limits.
- Source-IP allowlist option.
- Destination and port restrictions.
- Automated credential-stuffing and scan pattern detection.
- User-visible active-client list.
- Security alerts for new source IPs.
- Abuse contact and incident runbook.
- Remote disable at credential, device, user, region, and service levels.
- Escalation path for carrier, hosting, destination, and law-enforcement requests.
- Evidence preservation process that is narrow, approved, and time-limited.
- No public “unlimited residential proxy” marketing.
- No affiliate SDK distribution.

If a public commercial proxy network is ever considered, it is a different risk class and requires a new legal, policy, trust-and-safety, carrier, security, and commercial review.

---

## 10. Privacy, legal, and policy requirements

This section is product guidance, not jurisdiction-specific legal advice. Qualified counsel should review the final service, disclosures, contracts, and data flows.

### 10.1 Prominent disclosure

Suggested onboarding disclosure:

> **Use your phone as a mobile egress relay**
>
> When PocketRelay is on, internet connections from clients you authorize will leave through this phone's selected network. This can use mobile data and battery, and activity may be associated with your mobile IP address. PocketRelay runs only with a visible Android status notification and can be stopped at any time.
>
> Only authorize clients and destinations you own or have permission to use. Do not use PocketRelay for fraud, spam, unauthorized access, evasion, or activity prohibited by law, your carrier, or a destination service.

Required actions:

- User must affirmatively accept.
- Link to privacy notice and acceptable-use policy.
- Do not pre-check consent.
- Record policy version and acceptance time.
- Repeat material disclosure before enabling any future sharing or marketplace feature.
- Make Start unavailable until the disclosure is accepted.

### 10.2 Google Play positioning

Google Play policy permits proxy functionality only when proxying is the app's primary, user-facing core purpose and the app does not facilitate unauthorized access or interference. The product must therefore be transparent in:

- App title and store description.
- Screenshots.
- In-app disclosure.
- Foreground notification.
- Data-safety form.
- Foreground-service declaration.
- Privacy policy.
- Help center.
- Support responses.

Avoid presenting a harmless utility while hiding proxy behavior. Do not bundle the relay as a background SDK in an unrelated app.

A Play submission should include reviewer instructions:

1. Test account.
2. Exact steps to start the relay.
3. Explanation of why continuous foreground operation is required.
4. Screenshot of persistent notification.
5. Explanation of `specialUse`.
6. Description of authentication and abuse controls.
7. Confirmation that no traffic is intercepted or monetized without consent.
8. How to stop and revoke.
9. Privacy-policy URL.
10. A test endpoint that does not violate third-party terms.

### 10.3 Data inventory

| Data | Purpose | Suggested retention |
|---|---|---|
| Account ID and email | Account access and support | While account exists, then deletion window |
| Device ID and public key | Pairing and tunnel authentication | Until device removed, plus short audit window |
| App/device version and OS | Compatibility and security | Current plus bounded diagnostic history |
| Proxy credential metadata | Access control | Until revoked plus short audit window |
| Proxy plaintext secret | Authentication | Prefer never retained after creation |
| Tunnel/session start and end | Reliability and accounting | Short, documented period |
| Bytes transferred | Data cap, billing, transparency | Daily aggregates; limited detail |
| Source IP | Security and abuse response | Minimize; consider truncated or short full-IP retention under access control |
| Destination hostname/IP | Routing and policy | Process in memory; avoid durable storage by default |
| Payload | Forwarding | Never persist |
| Crash diagnostics | Stability | Redacted, bounded |
| Consent and policy version | Compliance evidence | Account lifetime plus legally reviewed period |
| Admin audit log | Security and accountability | Bounded, tamper-resistant period |

### 10.4 Privacy principles

- Collect only what is required.
- Explain purposes plainly.
- Do not repurpose data without a compatible legal basis and updated notice.
- Use short retention periods.
- Provide account and device deletion.
- Provide data export where legally required.
- Restrict employee access.
- Encrypt at rest and in transit.
- Keep data-region and international-transfer requirements in scope.
- Review whether IP addresses, device identifiers, and destination metadata are personal data in relevant jurisdictions.
- Conduct a data-protection impact assessment before large-scale deployment.
- Maintain a subprocessor list if third-party cloud services are used.

### 10.5 Carrier and contract considerations

The phone owner may be subject to:

- Mobile-data limits.
- Tethering or server restrictions.
- Roaming charges.
- Fair-use restrictions.
- Prohibitions on resale.
- Carrier security controls.
- Dynamic or shared IP reputation.

The app should tell users to check their plan. The service should not promise that a carrier permits every use merely because the app works technically.

### 10.6 Distribution strategy

Recommended sequence:

1. Engineering-only APK.
2. Closed internal test.
3. Private beta with known, verified testers.
4. Google Play closed testing and policy feedback.
5. Limited production geography.
6. Broader release only after abuse metrics and store review are stable.

Do not design the business around guaranteed public Play approval. Maintain a compliant enterprise distribution option only where appropriate and legal; do not use sideloading to evade policy.

---

## 11. Initial UX and visual design

### 11.1 Design goals

- Calm, modern, and trustworthy.
- One primary action: Start or Stop.
- Make active proxying impossible to miss.
- Expose data, battery, network, and clients clearly.
- Keep technical details available without overwhelming new users.
- Use plain language before protocol terminology.
- Avoid “hacker,” “stealth,” “anonymous,” or “unblock everything” visual language.
- Support light and dark themes.
- Meet accessibility contrast, touch-target, and screen-reader requirements.

### 11.2 Design system

**Foundation**

- Material 3 components.
- 8 dp spacing grid.
- 20–24 dp card corner radius.
- 48 dp minimum interactive target.
- Dynamic color where appropriate, with a branded fallback.
- Large central status control.
- Monospaced text only for hostnames, ports, IDs, and tokens.

**Suggested fallback palette**

| Token | Light | Dark | Use |
|---|---:|---:|---|
| Primary | `#4F46E5` | `#A5B4FC` | Main action, links |
| On primary | `#FFFFFF` | `#1E1B4B` | Text on primary |
| Surface | `#F8FAFC` | `#0F172A` | App background |
| Surface card | `#FFFFFF` | `#172033` | Cards |
| Text primary | `#0F172A` | `#F8FAFC` | Primary text |
| Text secondary | `#64748B` | `#94A3B8` | Supporting text |
| Online | `#15803D` | `#4ADE80` | Healthy state |
| Reconnecting | `#B45309` | `#FBBF24` | Warning state |
| Error | `#B91C1C` | `#F87171` | Error state |
| Divider | `#E2E8F0` | `#334155` | Dividers |

Use semantic colors through theme tokens rather than hard-coding them in screens. Test contrast in both themes.

**Typography**

- Display small: relay status.
- Headline small: screen titles.
- Title medium: card titles.
- Body large: primary descriptions.
- Body medium: secondary details.
- Label large: buttons.
- Monospace body: endpoint fields.

### 11.3 Navigation

Bottom navigation with four destinations:

1. **Home**
2. **Access**
3. **Activity**
4. **Settings**

The foreground service and relay state live above navigation in a shared state holder. The current state must remain visible on every top-level screen through a compact status banner when online.

### 11.4 Onboarding flow

#### Screen 1 — Welcome

```text
┌──────────────────────────────────────┐
│              PocketRelay             │
│                                      │
│       [ simple phone + cloud icon ]  │
│                                      │
│  Use this phone as a secure,         │
│  owner-controlled mobile egress.     │
│                                      │
│  • Stable proxy endpoint             │
│  • Mobile-network exit               │
│  • You control access and limits     │
│                                      │
│             [ Continue ]             │
│                                      │
│       Privacy     How it works       │
└──────────────────────────────────────┘
```

#### Screen 2 — How traffic flows

Show a simple diagram:

```text
Your client → Secure relay → This phone → Internet
```

Copy:

- The relay solves inbound mobile-network limitations.
- Traffic is not decrypted by PocketRelay.
- Mobile data and battery can be used.

#### Screen 3 — Responsibility and consent

Use the prominent disclosure from section 10.1. Require:

- Checkbox: “I understand that authorized traffic will use this phone's network and IP.”
- Checkbox: “I will use the relay only where I have permission.”
- Button: **Accept and continue**.

#### Screen 4 — Sign in or pair

Options:

- Sign in with email and passkey/verified link.
- Scan a QR code from a trusted web dashboard.
- Enter a short-lived pairing code.

Do not put long-lived credentials in the QR payload.

#### Screen 5 — Connection policy

```text
Network
(●) Cellular only — recommended for mobile IP
( ) Wi-Fi only
( ) Prefer cellular — may fall back to Wi-Fi
( ) Prefer Wi-Fi — may use mobile data
( ) Any validated network

Roaming
[off] Allow while roaming

Daily mobile-data cap
[ 1.0 GB            v ]

Low-battery rule
[on] Pause below [15%]
```

#### Screen 6 — Notifications

Explain that a persistent notification is a safety and Android requirement. Request permission in context.

#### Screen 7 — Ready

Summarize:

- Device name.
- Selected network rule.
- Daily cap.
- No access keys yet, or one initial key to create.
- **Go to Home**.

### 11.5 Home screen

#### Offline state

```text
┌──────────────────────────────────────┐
│ PocketRelay                    [⚙]   │
│                                      │
│            ○  OFFLINE               │
│                                      │
│  This phone is not accepting relay   │
│  traffic.                            │
│                                      │
│      [ Start mobile relay ]          │
│                                      │
│  Network                             │
│  Cellular only        SIM default    │
│  Signal               5G • Good      │
│  Data today           0 MB / 1 GB    │
│                                      │
│  Safety                              │
│  ✓ Authentication required          │
│  ✓ Private networks blocked         │
│  ✓ Ports limited to 80 and 443      │
│                                      │
│ Home   Access   Activity   Settings  │
└──────────────────────────────────────┘
```

#### Starting state

- Animated status ring.
- “Securing cellular connection…”
- Step list:
  - Selecting cellular network.
  - Connecting to relay.
  - Verifying egress.
- Cancel action.

#### Online state

```text
┌──────────────────────────────────────┐
│ PocketRelay                    [⚙]   │
│                                      │
│            ●  ONLINE                │
│          Mobile relay active         │
│                                      │
│        [ Stop relay ]                │
│                                      │
│  Egress                              │
│  5G • Cellular only                  │
│  Public IP     203.0.113.24  [copy]  │
│  Relay         Europe Central        │
│  Latency       48 ms                 │
│                                      │
│  Live                                  │
│  Connections   2 / 10                │
│  Today         248 MB / 1 GB         │
│  Up / down     1.2 / 7.8 Mbps        │
│                                      │
│  Proxy endpoint                      │
│  proxy.eu.example.com:443    [copy]  │
│  Credential  “Laptop”        [view]  │
│                                      │
│ Home   Access   Activity   Settings  │
└──────────────────────────────────────┘
```

#### Degraded state

Examples:

- Mobile network available but tunnel reconnecting.
- Daily cap near limit.
- Notification permission disabled.
- Relay reachable but egress check failed.

Use amber, not red, when automatic recovery is possible. Show one direct action.

#### Error state

Use a clear title, plain-language cause, diagnostic code, and next action:

> **Cellular network unavailable**  
> PocketRelay is set to cellular only. Turn on mobile data or change the network rule.  
> `[Open network settings]` `[Stop relay]`

Do not expose stack traces or internal hostnames.

### 11.6 Access screen

Purpose: manage who can use the phone.

```text
Access
──────────────────────────────────────
[ + Create access key ]

Laptop
Active • IP restricted
Created 25 Jul 2026
Last used 2 min ago
2 active connections
[Details] [Revoke]

QA server
Expired
[Rotate] [Delete]
```

Create-key flow:

- Label.
- Expiration: 1 day, 7 days, 30 days, custom.
- Source IP allowlist: recommended.
- Concurrent streams.
- Daily data limit.
- Allowed ports.
- Optional destination allowlist.
- Create.
- Show secret once.
- Buttons: Copy fields, copy URI, download a configuration snippet.
- Warning: “Anyone with this secret can use your phone's mobile data until it expires or is revoked.”

Credential detail:

- Host.
- Port.
- Type.
- Username.
- Secret status.
- Limits.
- Source IPs.
- Last use.
- Active sessions.
- Rotate.
- Revoke.
- Never show an old plaintext secret if it was not retained.

### 11.7 Activity screen

Tabs:

- Live.
- History.
- Security.

**Live session row**

```text
Laptop
HTTPS CONNECT
Started 12:14:08
84 MB • 2 streams
Source: 198.51.100.xxx
[Disconnect]
```

Default privacy behavior:

- Do not show or retain full destination browsing history.
- Show a destination only if the product has a justified, disclosed, user-controlled diagnostic mode.
- Prefer high-level rule events such as “Blocked private address” or “Blocked disallowed port.”

**History**

- Session start/end.
- Credential label.
- Bytes.
- Disconnect reason.
- Network changes.
- Data-cap event.
- No request path, headers, body, or response content.

**Security**

- New source IP used credential.
- Failed authentication count.
- Credential rotated.
- Blocked destination policy event.
- Device revoked from web dashboard.
- Admin action, where relevant.

### 11.8 Settings screen

Sections:

**Relay**

- Network rule.
- Roaming.
- Daily cap.
- Low-battery pause.
- Idle auto-stop.
- Relay region: automatic by default.
- Protocol preference: automatic; advanced users may see fallback state.

**Privacy**

- Data collected.
- Diagnostic log level.
- Export local diagnostics.
- Delete local history.
- Delete account.

**Security**

- Device name.
- Re-authentication for sensitive actions.
- Certificate/pairing status.
- Revoke all access keys.
- Unpair device.

**Notifications**

- Active status.
- Reconnect warning.
- New source IP.
- Data-cap warnings.
- Security alerts.

**About**

- Version.
- Protocol version.
- Privacy policy.
- Acceptable-use policy.
- Open-source notices.
- Support.
- Legal.

### 11.9 Foreground notification

Online:

```text
PocketRelay is online
2 connections • 248 MB today • Cellular 5G
[Stop] [Open]
```

Reconnecting:

```text
PocketRelay is reconnecting
Waiting for cellular network
[Stop] [Open]
```

Paused:

```text
PocketRelay paused
Daily data cap reached
[Open] [Stop]
```

The notification must not hide the fact that external traffic is using the phone.

### 11.10 Accessibility and localization

- TalkBack labels for status, metrics, copy, reveal, and stop actions.
- Never communicate state by color alone.
- 48 dp touch targets.
- Support system font scaling without clipped endpoint values.
- Mask secrets but make reveal state explicit to screen readers.
- Confirm destructive actions.
- Support right-to-left layouts.
- Keep copy translatable; do not concatenate phrases.
- Use local units and clear GB/MB definitions.
- Provide Romanian and English early if those are initial markets, while keeping legal text professionally reviewed in each language.

---

## 12. Android application architecture

### 12.1 Module layout

```text
android/
├── app/
├── core/
│   ├── common/
│   ├── model/
│   ├── designsystem/
│   ├── datastore/
│   ├── database/
│   ├── networking/
│   ├── security/
│   ├── telemetry/
│   └── testing/
├── relay/
│   ├── service/
│   ├── tunnel/
│   ├── protocol/
│   ├── cellular/
│   ├── destination/
│   └── policy/
├── feature/
│   ├── onboarding/
│   ├── home/
│   ├── access/
│   ├── activity/
│   ├── settings/
│   └── diagnostics/
└── benchmark/
```

### 12.2 Layering

**UI layer**

- Compose screens.
- ViewModels.
- Immutable UI state.
- User action events.
- No socket or cryptographic implementation.

**Domain layer**

- `StartRelayUseCase`.
- `StopRelayUseCase`.
- `CreateCredentialUseCase`.
- `ObserveRelayStatusUseCase`.
- `EnforceLocalSafetyRuleUseCase`.
- `ExportDiagnosticsUseCase`.

**Data layer**

- Control API repository.
- Device identity repository.
- Credential repository.
- Local settings repository.
- Activity repository.
- Relay service controller.

**Relay runtime**

- Foreground service.
- Network selector.
- Tunnel client.
- Frame codec.
- Stream registry.
- Destination connector.
- Flow controller.
- Usage counter.
- Policy evaluator.
- State machine.
- Diagnostics ring buffer.

### 12.3 Core models

```kotlin
enum class RelayStatus {
    OFFLINE,
    PREPARING,
    CONNECTING,
    ONLINE,
    RECONNECTING,
    PAUSED,
    STOPPING,
    BLOCKED,
    ERROR,
}

enum class NetworkMode {
    CELLULAR_ONLY,
    WIFI_ONLY,
    PREFER_CELLULAR,
    PREFER_WIFI,
    ANY_VALIDATED_NETWORK,
}

data class RelayPolicy(
    val version: Long,
    val allowedTcpPorts: Set<Int>,
    val maxConcurrentStreams: Int,
    val maxBytesPerDay: Long,
    val maxBytesPerSecond: Long?,
    val roamingAllowed: Boolean,
    val blockedCidrs: List<String>,
    val destinationAllowlist: List<String>,
)

data class RelayUiState(
    val status: RelayStatus,
    val networkMode: NetworkMode,
    val transportLabel: String?,
    val carrierLabel: String?,
    val egressIp: String?,
    val relayRegion: String?,
    val latencyMs: Long?,
    val activeStreams: Int,
    val bytesToday: Long,
    val dailyCapBytes: Long,
    val userMessage: String?,
    val recoverable: Boolean,
)
```

### 12.4 Foreground service responsibilities

The service should:

- Own the relay lifecycle.
- Create the notification channel.
- Call `startForeground` immediately.
- Validate stored consent and policy before connecting.
- Select and retain the intended network.
- Establish the tunnel.
- Maintain stream registry and usage counters.
- Apply server and local policy.
- Publish state through a repository/Flow.
- Close streams and tunnel deterministically on Stop.
- Persist only minimal counters and state needed for recovery.
- Never expose an exported Binder unless explicitly designed and permission-protected.

Illustrative skeleton:

```kotlin
@AndroidEntryPoint
class RelayForegroundService : LifecycleService() {

    @Inject lateinit var relayRuntime: RelayRuntime
    @Inject lateinit var notificationFactory: RelayNotificationFactory

    override fun onCreate() {
        super.onCreate()
        startForeground(
            NOTIFICATION_ID,
            notificationFactory.startingNotification()
        )

        lifecycleScope.launch {
            relayRuntime.states.collect { state ->
                val notification = notificationFactory.forState(state)
                NotificationManagerCompat.from(this@RelayForegroundService)
                    .notify(NOTIFICATION_ID, notification)
            }
        }
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        when (intent?.action) {
            ACTION_START -> lifecycleScope.launch { relayRuntime.start() }
            ACTION_STOP -> lifecycleScope.launch {
                relayRuntime.stop()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        relayRuntime.closeImmediately()
        super.onDestroy()
    }
}
```

Use `START_NOT_STICKY` for MVP so Android does not silently recreate a relay after the user has lost context. Revisit only after explicit product and policy review.

### 12.5 Stream handling

Each logical stream should have:

- Unique stream ID.
- Bounded inbound channel.
- Bounded outbound channel.
- Destination socket.
- Coroutine job.
- Byte counters.
- Open and idle timeouts.
- Cancellation tied to tunnel/service lifecycle.
- State transitions validated centrally.

Avoid one coroutine per byte chunk without limits. Use pooled buffers or bounded reusable byte arrays. Benchmark allocations and GC under many concurrent streams.

### 12.6 Local policy as defense in depth

The phone must enforce a signed policy even if the relay already checked it:

1. Validate protocol version.
2. Validate stream ID.
3. Validate hostname or literal IP syntax.
4. Validate port.
5. Resolve on selected network.
6. Validate all candidate IP addresses.
7. Reject private/special-use addresses.
8. Enforce stream and byte caps.
9. Bind socket to selected network.
10. Connect with timeout.
11. Emit only sanitized error code.

The relay cannot command the phone to connect to an arbitrary local address simply because the relay is trusted.

---

## 13. Backend architecture

### 13.1 Services

```mermaid
flowchart TB
    UI[Web dashboard]
    API[Control API]
    AUTH[Identity provider / passkeys]
    PG[(PostgreSQL)]
    REDIS[(Redis routing + revocation)]
    ADMIN[Admin / Trust & Safety]
    INGRESS[Proxy ingress]
    RELAY[Device tunnel relay]
    METRICS[Metrics / tracing]
    ANDROID[Android device]
    CLIENT[Authorized client]

    UI --> API
    API --> AUTH
    API --> PG
    API --> REDIS
    ADMIN --> API
    CLIENT --> INGRESS
    INGRESS --> REDIS
    INGRESS <--> RELAY
    ANDROID <--> RELAY
    INGRESS --> METRICS
    RELAY --> METRICS
    API --> METRICS
```

### 13.2 Device routing

When a phone connects:

```text
Key: device_route:{device_id}
Value: {
  relay_node_id,
  tunnel_id,
  region,
  protocol_version,
  connected_at
}
TTL: slightly longer than heartbeat interval
```

The tunnel renews this entry. If it expires, proxy ingress treats the device as offline.

MVP choices:

- Proxy ingress and device relay are the same process.
- A device is assigned to one hostname/region.
- Sticky routing keeps client and tunnel on the same node.

Scale-out choices:

- Proxy ingress authenticates, then forwards an internal stream to the owning relay node over mTLS.
- A regional service mesh routes by device ID.
- Consistent hashing assigns device tunnels and ingress requests.
- Redis or a strongly consistent directory tracks ownership with fencing tokens.

Use fencing tokens or tunnel generations so an old connection cannot overwrite a newer device registration.

### 13.3 High availability

- At least two control API instances.
- PostgreSQL backups and point-in-time recovery.
- Redis high availability or graceful fallback.
- Multiple relay nodes per region.
- Health checks that distinguish accepting new tunnels from draining.
- Graceful relay deploy:
  1. Stop accepting new device tunnels.
  2. Send `DRAIN`.
  3. Let active streams finish within a deadline.
  4. Reconnect devices to another node.
- Regional DNS with controlled TTL.
- Capacity admission control.
- Separate credentials and network segments for control and data planes.

### 13.4 Relay resource controls

Per connection and globally:

- Handshake timeout.
- Header size limit.
- Authentication attempt limit.
- Max streams per device/key/account.
- Max connection opens per second.
- Max buffered bytes.
- Max idle duration.
- Max stream lifetime if required.
- Bandwidth token bucket.
- Daily byte cap.
- File descriptor limit and alert.
- Memory watermark.
- CPU/load shedding.
- Queue timeout.
- Per-source IP rate limit.
- Circuit breaker for unavailable device.
- Immediate reject when device route is absent.

Do not queue client streams for long periods while a phone is offline; fail clearly so clients can retry.

---

## 14. Control API design

Use versioned HTTPS JSON APIs. Authenticate users with modern account security. Android device tunnel authentication should be separate from user web sessions.

### 14.1 Suggested endpoints

#### Authentication and account

```text
POST   /v1/auth/pairing-codes
POST   /v1/auth/pairing-codes/{code}/complete
GET    /v1/me
DELETE /v1/me
```

#### Devices

```text
GET    /v1/devices
POST   /v1/devices/enroll
GET    /v1/devices/{deviceId}
PATCH  /v1/devices/{deviceId}
POST   /v1/devices/{deviceId}/revoke
POST   /v1/devices/{deviceId}/stop
GET    /v1/devices/{deviceId}/status
GET    /v1/devices/{deviceId}/usage
```

#### Proxy credentials

```text
GET    /v1/devices/{deviceId}/credentials
POST   /v1/devices/{deviceId}/credentials
GET    /v1/credentials/{credentialId}
PATCH  /v1/credentials/{credentialId}
POST   /v1/credentials/{credentialId}/rotate
POST   /v1/credentials/{credentialId}/revoke
DELETE /v1/credentials/{credentialId}
```

#### Sessions and activity

```text
GET    /v1/devices/{deviceId}/sessions
GET    /v1/devices/{deviceId}/events
POST   /v1/sessions/{sessionId}/disconnect
```

#### Policy and diagnostics

```text
GET    /v1/devices/{deviceId}/policy
PUT    /v1/devices/{deviceId}/policy
POST   /v1/devices/{deviceId}/diagnostics
GET    /v1/service/regions
```

### 14.2 Create credential example

Request:

```json
{
  "label": "Laptop",
  "expires_at": "2026-08-06T21:00:00Z",
  "source_ip_allowlist": ["198.51.100.42/32"],
  "max_concurrent_streams": 5,
  "max_bytes_per_day": 1073741824,
  "allowed_tcp_ports": [80, 443],
  "destination_allowlist": []
}
```

Response:

```json
{
  "id": "cred_01K...",
  "label": "Laptop",
  "proxy": {
    "type": "https",
    "host": "proxy.eu.example.com",
    "port": 443,
    "username": "prx_01K...",
    "password": "one-time-secret",
    "uri": "https://prx_01K...:one-time-secret@proxy.eu.example.com:443"
  },
  "secret_display": "one_time",
  "expires_at": "2026-08-06T21:00:00Z",
  "created_at": "2026-07-30T21:00:00Z"
}
```

Never return the plaintext password again after this response.

### 14.3 Device status example

```json
{
  "device_id": "dev_01K...",
  "state": "online",
  "network_mode": "cellular_only",
  "transport": "cellular",
  "radio_label": "5G",
  "roaming": false,
  "relay_region": "eu-central",
  "egress_ip": "203.0.113.24",
  "tunnel_latency_ms": 48,
  "active_streams": 2,
  "bytes_today": 260046848,
  "daily_cap_bytes": 1073741824,
  "connected_at": "2026-07-30T20:41:22Z",
  "app_version": "0.1.0"
}
```

Consider whether returning the full egress IP to every dashboard role is necessary. Scope it to the owner and authorized team roles.

### 14.4 Error model

```json
{
  "error": {
    "code": "DEVICE_OFFLINE",
    "message": "The selected phone is not currently online.",
    "request_id": "req_01K..."
  }
}
```

Use stable error codes. Do not expose database errors, stack traces, internal IPs, or relay topology.

---

## 15. Data model

### 15.1 Core tables

#### `users`

```text
id
email_normalized
email_verified_at
status
created_at
updated_at
deleted_at
```

#### `organizations`

```text
id
name
status
created_at
updated_at
```

#### `organization_members`

```text
organization_id
user_id
role
created_at
```

#### `devices`

```text
id
organization_id
owner_user_id
display_name
platform
app_version
os_version
manufacturer
model
status
network_mode
relay_region
policy_version
last_seen_at
revoked_at
created_at
updated_at
```

Avoid retaining precise hardware identifiers such as IMEI. Use app-generated IDs.

#### `device_keys`

```text
id
device_id
algorithm
public_key
key_version
attestation_summary
active
created_at
revoked_at
```

#### `proxy_credentials`

```text
id
device_id
label
public_identifier
secret_verifier_or_hmac
expires_at
source_ip_allowlist
max_concurrent_streams
max_bytes_per_day
allowed_tcp_ports
destination_allowlist
last_used_at
revoked_at
created_at
updated_at
```

#### `relay_sessions`

```text
id
device_id
tunnel_generation
relay_node_id
region
protocol_version
transport
started_at
ended_at
end_reason
bytes_up
bytes_down
network_change_count
```

#### `client_sessions`

```text
id
device_id
credential_id
started_at
ended_at
end_reason
source_ip_protected
bytes_up
bytes_down
stream_count
```

`source_ip_protected` may be a truncated, encrypted, or keyed representation according to the approved security/privacy design.

#### `usage_daily`

```text
device_id
usage_date
bytes_up
bytes_down
connection_count
active_seconds
updated_at
```

#### `security_events`

```text
id
organization_id
device_id
credential_id
event_type
severity
rule_id
metadata_redacted
created_at
```

#### `consents`

```text
id
user_id
device_id
policy_type
policy_version
accepted_at
withdrawn_at
```

#### `admin_audit_log`

```text
id
actor_user_id
action
target_type
target_id
reason
metadata_redacted
created_at
```

### 15.2 Indexes

At minimum:

- `devices(owner_user_id, status)`.
- `devices(organization_id, status)`.
- Unique active `device_keys(device_id, key_version)`.
- Unique `proxy_credentials(public_identifier)`.
- `proxy_credentials(device_id, revoked_at, expires_at)`.
- `relay_sessions(device_id, started_at desc)`.
- `client_sessions(device_id, started_at desc)`.
- `usage_daily(device_id, usage_date)`.
- `security_events(organization_id, created_at desc)`.
- `admin_audit_log(created_at desc)`.

Partition high-volume session/event tables by time if scale requires it.

### 15.3 Retention jobs

Implement explicit jobs for:

- Expired pairing code deletion.
- Expired credential cleanup.
- Fine-grained session deletion or aggregation.
- Security event expiration according to severity.
- Crash/diagnostic log deletion.
- Account deletion.
- Orphan key and route cleanup.
- Audit record lifecycle approved by legal/security.
- Backup expiration consistent with deletion commitments.

Deletion must include replicas, search indexes, logs, object storage, and backups according to the documented schedule.

---

## 16. Observability

### 16.1 Metrics

Android-visible metrics:

- Current relay state.
- Tunnel latency.
- Active streams.
- Bytes up/down.
- Bytes today.
- Daily cap.
- Reconnect count.
- Last successful heartbeat.
- Selected transport.
- Selected network.
- Battery percentage.
- Roaming and metered state.

Backend metrics:

- Active device tunnels by region and protocol.
- Proxy authentication success/failure.
- Stream open success rate.
- Stream open latency.
- Tunnel reconnect rate.
- Bytes by region, account tier, and direction.
- Blocked policy events by rule.
- Relay CPU, memory, file descriptors, queue depth, and buffer use.
- Redis route age.
- PostgreSQL latency and errors.
- TLS handshake errors.
- Data-cap rejects.
- Device-offline rejects.
- Abuse automation alerts.
- Admin actions.

### 16.2 Logs

Allowed examples:

```json
{
  "event": "stream_open_failed",
  "request_id": "req_...",
  "device_id": "dev_...",
  "credential_id": "cred_...",
  "rule_id": "blocked_private_ip",
  "duration_ms": 18
}
```

Do not log:

- Proxy passwords.
- Authorization headers.
- Full URL paths.
- Request or response bodies.
- Cookies.
- Destination credentials.
- Raw TLS application data.
- Full stack traces containing secrets.
- Unbounded device logs.

### 16.3 Tracing

Trace:

- Proxy ingress authentication.
- Device route lookup.
- Internal relay routing.
- `OPEN` request.
- Destination connection result.
- Stream close reason.

Do not attach sensitive payload or unreviewed full destination data to trace attributes.

### 16.4 Suggested service objectives

Initial internal objectives:

- Control API availability: 99.9% monthly.
- Relay ingress availability: 99.9% monthly per supported region.
- Active device route lookup: p99 below 50 ms inside a region.
- Tunnel handshake: p95 below 3 seconds under healthy connectivity.
- Stream open overhead: p95 below 500 ms beyond destination-connect time.
- Credential revocation propagation: p95 below 5 seconds.
- Stop action closes new access immediately and active streams within a short bounded period.
- Zero known open-proxy exposure.

Do not publish these as contractual SLAs until measured in production.

---

## 17. Testing strategy

### 17.1 Unit tests

Android:

- State-machine transitions.
- Policy parser and signature verification.
- CIDR and special-address blocking.
- Hostname validation and IDN normalization.
- Port restrictions.
- Frame encoding/decoding.
- Stream ID lifecycle.
- Back-pressure logic.
- Byte and data-cap accounting.
- Credential redaction.
- Notification state mapping.
- Reconnect backoff.
- Consent gate.

Backend:

- Credential verification.
- Expiration/revocation.
- Source-IP allowlists.
- Route generation fencing.
- Quotas and token buckets.
- Destination policy.
- API authorization.
- Data-retention jobs.
- Audit creation.
- Error redaction.

### 17.2 Integration tests

- Android emulator/device ↔ relay tunnel.
- HTTPS CONNECT client ↔ relay ↔ phone ↔ controlled destination.
- Wi-Fi connected while destination exits cellular.
- DNS resolution through the selected cellular or Wi-Fi network.
- Credential rotate/revoke.
- Phone offline.
- Tunnel interrupted mid-stream.
- Relay drain and reconnect.
- Data cap reached.
- Source-IP not allowlisted.
- Private address through literal IP.
- Private address through DNS rebinding.
- IPv6-only carrier simulation.
- NAT64.
- TLS certificate rotation.
- Redis route expiry.
- Multiple relay nodes.
- Back-pressure under slow destination.
- Large response with bounded memory.

### 17.3 Device matrix

Include:

- Google Pixel on current Android.
- Samsung current flagship and mid-range.
- Xiaomi/Redmi.
- OnePlus/Oppo.
- Motorola.
- At least one older Android 8/9 device if `minSdk 26` remains.
- Android 16/API 36.
- Android 17/API 37.
- Devices with dual SIM.
- eSIM.
- IPv6/NAT64 carrier.
- Roaming scenario.
- Aggressive OEM battery manager.
- Low RAM.
- Battery saver.
- Data saver.
- Notification permission denied.
- Screen locked for extended periods.

### 17.4 Network scenarios

Each scenario must assert three things separately: the transport selected by Android, the public IP observed by a controlled destination, and the transport/data-use label shown to the user.

- LTE only.
- 5G NSA/SA where available.
- Weak signal.
- Cellular handover.
- Wi-Fi on with cellular-only mode.
- Mobile data on with Wi-Fi-only mode.
- Prefer-Wi-Fi fallback to cellular with visible warning.
- Prefer-cellular fallback to Wi-Fi with visible status.
- Wi-Fi off/on during session.
- Airplane mode.
- Mobile data disabled.
- Captive portal on Wi-Fi.
- Roaming.
- Carrier blocks UDP.
- DNS failure.
- Relay region failure.
- High packet loss and latency.
- MTU issues.
- Client behind corporate proxy.
- Multiple clients.
- Long idle stream.
- Bursty many short streams.

### 17.5 Security tests

- External open-proxy scan.
- Authentication brute force.
- Credential enumeration.
- Replay of device challenge.
- Old tunnel-generation takeover.
- Malformed frames.
- Oversized frame.
- Stream ID collision.
- Compression bomb if compression is ever enabled.
- DNS rebinding.
- IPv4-in-IPv6 representations.
- Obscure IP-number formats.
- Unicode hostname confusion.
- Private address via redirect is not directly relevant to raw CONNECT, but hostname resolution paths must be tested.
- Port-smuggling parser inconsistencies.
- Request splitting.
- HTTP CONNECT parser differential.
- SOCKS parser fuzzing.
- Admin RBAC bypass.
- Log-secret scanning.
- Android exported-component scan.
- Backup extraction.
- Keystore fallback behavior.
- TLS downgrade.
- Certificate expiration/rotation.
- Dependency and container scanning.
- Mobile app assessment against OWASP MASVS.

### 17.6 Load tests

Measure:

- 1, 10, 50, and policy maximum streams per phone.
- Thousands of simultaneously connected phones per relay cluster.
- Many idle tunnels.
- Large sustained downloads.
- Slow clients and slow destinations.
- Reconnect storm after regional outage.
- Credential attack against ingress.
- Redis outage.
- Database degraded mode.
- Relay deployment drain.
- Memory under bounded buffers.
- File descriptor exhaustion.
- Bandwidth shaper correctness.

### 17.7 Acceptance tests

Minimum MVP acceptance:

- [ ] User cannot start without disclosure acceptance.
- [ ] Foreground notification appears immediately and remains visible.
- [ ] Stop action works from app and notification.
- [ ] Cellular-only egress verified while Wi-Fi is active.
- [ ] Wi-Fi-only egress verified while mobile data is enabled.
- [ ] Preference-mode fallback occurs only as disclosed and reconnects with a newly verified egress IP.
- [ ] Captive-portal or unvalidated Wi-Fi is not used as an internet relay.
- [ ] HTTPS proxy authentication is mandatory.
- [ ] Full proxy secret shown only once.
- [ ] Revoked credential fails promptly.
- [ ] Private and special-use destinations are blocked after DNS resolution.
- [ ] Only allowed ports work.
- [ ] No payload appears in app, relay, proxy, or observability logs.
- [ ] Data cap stops new streams and clearly informs the user.
- [ ] Roaming is blocked by default.
- [ ] App recovers from brief cellular and Wi-Fi interruptions according to the selected fallback policy.
- [ ] Relay restart does not create a stale route takeover.
- [ ] External scan confirms no anonymous access.
- [ ] Account deletion and device revoke work.
- [ ] Privacy and acceptable-use links are available before activation.

---

## 18. Deployment and infrastructure

### 18.1 Domain layout

Example:

```text
api.example.com            Control API
dashboard.example.com      User dashboard
proxy.eu.example.com       HTTPS proxy ingress
relay.eu.example.com       Android tunnel ingress
status.example.com         Public service status
```

Separate control and data-plane certificates and network policies.

### 18.2 MVP infrastructure

- One EU relay VM close to initial users.
- One control API service.
- Managed PostgreSQL.
- Managed Redis or no Redis if a single combined relay process is used.
- Object storage only for approved diagnostic exports.
- TLS certificates with automated renewal.
- Cloud firewall:
  - Public 443 for API, relay tunnel, and HTTPS proxy.
  - No public database or Redis.
  - Admin access through a secure management path.
- Daily backups.
- Central metrics and alerts.
- Infrastructure as code.
- Staging environment separated from production.

### 18.3 Production regions

Select regions based on:

- User geography.
- Phone-to-relay latency.
- Data-transfer cost.
- Regulatory requirements.
- Provider abuse support.
- Carrier routing.
- Operational capacity.

The relay does not change the final mobile egress location. It does affect the first encrypted leg between client/phone and relay, latency, and cloud cost.

### 18.4 TLS

- TLS 1.3 preferred, with carefully justified compatibility fallback.
- Strong certificate validation.
- Automated renewal with alerting before expiry.
- mTLS for internal relay traffic.
- Separate certificate trust for device tunnels and public proxy ingress if useful.
- No custom cryptography.
- Test clock skew and expired certificates.
- Pinning only with backup pins and emergency rotation; a bad pinning rollout can disable every device.

### 18.5 Secrets

Store in cloud secret manager/KMS:

- Database credentials.
- Redis credentials.
- Internal CA keys.
- Signing keys.
- API encryption keys.
- Proxy-verifier peppers/HMAC keys.
- Third-party credentials.

Requirements:

- Per-environment separation.
- Rotation.
- Least-privilege access.
- Audit.
- No secrets in container images, CI logs, app source, or analytics.
- Android app contains only public configuration and certificate trust, not server secrets.

### 18.6 CI/CD

Android:

- Static analysis.
- Unit tests.
- Instrumented tests.
- Dependency scanning.
- Secret scan.
- Signed build with protected release key.
- Software bill of materials.
- Reproducible versioning.
- Internal track before staged rollout.

Backend:

- Format/lint/type checks.
- Unit/integration/security tests.
- Container scan.
- Infrastructure plan review.
- Database migration checks.
- Canary relay.
- Graceful drain.
- Automatic rollback based on health.
- Signed artifacts and provenance.

---

## 19. Capacity and cost model

Avoid selecting a commercial price before measuring real traffic. Build a model around bytes, concurrent streams, and active device hours.

### 19.1 Phone data

Approximate phone mobile data consumed:

```text
phone_mobile_bytes ≈ proxied_payload_bytes
                   + tunnel/protocol overhead
                   + TLS overhead
                   + heartbeats
```

The carrier may count retransmissions and framing differently. Label app values as estimates.

### 19.2 Relay bandwidth

For a relayed byte, the relay receives it on one connection and sends it on another. Cloud billing varies by provider and direction. Model:

```text
billable_cloud_egress =
    client-facing egress
  + phone-facing egress
  + cross-zone/cross-region traffic
  + observability/export overhead
```

Do not assume traffic is charged only once. Keep client ingress, phone ingress, and both egress directions separate in the financial model.

### 19.3 Compute

Relay compute is driven by:

- Concurrent tunnels.
- Concurrent streams.
- TLS handshakes.
- Encryption.
- Byte-copy efficiency.
- Buffer memory.
- Connection-open rate.
- Metrics and logs.

Benchmark before estimating. A low-throughput idle tunnel is cheap in bandwidth but still uses a socket, memory, heartbeat, routing state, and file descriptor.

### 19.4 Storage

Storage should remain modest if payload is never retained:

- Accounts and devices.
- Credential metadata.
- Daily usage aggregates.
- Short-lived sessions.
- Security events.
- Audit records.
- Metrics.

High-cardinality per-stream logging can become expensive quickly and should be avoided for privacy and cost.

### 19.5 Example planning formula

```text
monthly_mobile_GB =
    active_devices
  × average_active_days
  × average_GB_per_active_day

monthly_relay_data_cost =
    sum(provider_rate_for_each_billed_direction × bytes_in_that_direction)

monthly_compute_cost =
    relay_nodes
  + control_api
  + database
  + cache
  + observability
  + backups
  + support/security overhead
```

Run three scenarios:

- Conservative private beta.
- Expected limited production.
- Abuse/reconnect spike.

Add hard account and infrastructure caps so one leaked key cannot create an unbounded bill.

---

## 20. Product roadmap

### Phase 0 — Feasibility and policy validation

Deliverables:

- Android proof that a socket can be bound to cellular while Wi-Fi is active.
- Controlled destination test.
- One outbound TLS/WebSocket tunnel.
- One HTTP CONNECT stream.
- Initial Google Play policy memo.
- Carrier and legal issue list.
- Threat model.
- No public users.

Exit criteria:

- Demonstrated cellular egress on representative devices.
- Private-address blocking tested.
- Foreground service survives normal screen-off test.
- Architecture review approved.

### Phase 1 — Engineering prototype

Deliverables:

- Kotlin app with Start/Stop.
- Persistent notification.
- Single region.
- One device per account.
- One generated proxy credential.
- HTTPS CONNECT.
- TCP 80/443.
- Basic byte counters.
- Device key in Keystore.
- Minimal control API.
- No polished dashboard.

Exit criteria:

- End-to-end test passes repeatedly.
- No open proxy.
- Clean stop and reconnect.
- Logs contain no payload/secrets.

### Phase 2 — Secure MVP

Deliverables:

- Full onboarding and disclosure.
- Home, Access, Activity, Settings screens.
- Credential rotation/revoke.
- IP allowlists.
- Daily data cap.
- Roaming off by default.
- Signed policy.
- Redis route directory or equivalent.
- Admin disable.
- Security alerts.
- Privacy/deletion workflows.
- Closed beta.

Exit criteria:

- Security test suite passes.
- Abuse runbook exists.
- Device matrix meets target.
- Store submission package prepared.

### Phase 3 — Limited beta

Deliverables:

- Google Play closed testing.
- Two relay nodes.
- Staged rollout.
- Support dashboard.
- Observability and SLO dashboards.
- Data retention jobs.
- App performance monitoring with redaction.
- User feedback and UX fixes.

Exit criteria:

- Stable crash-free sessions.
- Measured relay success and reconnect rate.
- No unresolved abuse incidents.
- Cost per active GB understood.
- Policy feedback addressed.

### Phase 4 — Production hardening

Deliverables:

- Multiple regions.
- Data-plane service in Go/Rust if not already.
- Graceful drain and failover.
- Strong admin RBAC.
- Independent penetration test.
- Disaster recovery exercise.
- Play Integrity risk signals if justified.
- SOCKS5 through a secure connector or constrained endpoint.
- Team roles.

### Future research

- QUIC tunnel.
- Local LAN/hotspot mode.
- Desktop local connector.
- Domain allowlist templates.
- Enterprise fleet enrollment.
- Device health attestation.
- Multiple phones in a failover pool.
- Customer-managed relay.
- IPv6 ingress.
- UDP only after a separate abuse and protocol review.

---

## 21. MVP backlog with acceptance criteria

### Epic A — Android onboarding

**Stories**

- Present welcome and traffic-flow explanation.
- Capture versioned disclosure acceptance.
- Pair device.
- Configure network mode and data cap.
- Request notification permission.
- Show ready state.

**Acceptance**

- Start disabled before consent.
- Consent version stored server-side.
- No proxy secret in pairing QR.
- Back navigation does not bypass disclosure.

### Epic B — Relay lifecycle

**Stories**

- Start foreground service.
- Select and retain the requested cellular or Wi-Fi network.
- Connect and authenticate tunnel.
- Publish status.
- Stop from app and notification.
- Reconnect with bounded exponential backoff.

**Acceptance**

- Notification appears immediately.
- Cellular-only mode never uses Wi-Fi.
- Stop closes route and streams.
- Backoff has jitter and a retry ceiling.
- Offline route TTL expires.

### Epic C — HTTPS proxy ingress

**Stories**

- TLS listener.
- Proxy authentication.
- CONNECT parser.
- Route lookup.
- Stream open.
- Bidirectional copy.
- Error mapping.

**Acceptance**

- Anonymous request always rejected.
- Malformed CONNECT rejected.
- Secret not logged.
- Offline device returns clear proxy error.
- Byte buffers are bounded.

### Epic D — Destination safety

**Stories**

- Host and port parser.
- Cellular DNS.
- CIDR block list.
- Port allowlist.
- DNS rebinding defense.
- Connection timeout.

**Acceptance**

- Literal and resolved private addresses blocked.
- IPv4 and IPv6 special representations covered.
- Default ports only 80/443.
- Local policy remains effective if relay sends invalid `OPEN`.

### Epic E — Access credentials

**Stories**

- Create.
- One-time reveal.
- Rotate.
- Revoke.
- Expire.
- IP allowlist.
- Connection and byte limits.

**Acceptance**

- Plaintext secret not recoverable.
- Revocation propagates promptly.
- Expired key cannot connect.
- Source IP outside allowlist rejected.

### Epic F — Usage and activity

**Stories**

- Live stream count.
- Byte counters.
- Daily aggregate.
- Data-cap enforcement.
- Session history.
- Security events.

**Acceptance**

- Payload never stored.
- App and server counters reconcile within documented tolerance.
- Cap prevents new streams and closes or drains existing streams according to policy.
- User sees which credential is active.

### Epic G — Operations and trust

**Stories**

- Admin revoke.
- Abuse contact.
- Alerting.
- Audit log.
- Data retention.
- Account deletion.
- Reviewer test instructions.

**Acceptance**

- Admin action requires reason and is audited.
- Deletion job verified.
- External open-proxy scan passes.
- Incident runbook exercised before public launch.

---

## 22. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google Play rejects `specialUse` or proxy positioning | Medium–High | High | Engage policy review early, make proxy core and visible, private beta, reviewer documentation |
| App is associated with abusive residential-proxy ecosystems | Medium | High | Owner-controlled branding, no marketplace/SDK, strict limits, transparent operation, abuse program |
| Carrier terms prohibit or throttle use | Medium | High | Clear disclosure, country/carrier research, conservative usage, no resale promise |
| Credential leak causes abuse and data cost | High without controls | High | One-time secret, IP allowlist, cap, alerts, revoke, conservative defaults |
| OEM kills service | High on some vendors | Medium | FGS, tested support matrix, diagnostics, reconnect, honest limitations |
| Cloud relay cost is higher than planned | Medium | High | Hard quotas, regional accounting, load test, billing alerts, no unlimited plan |
| CGNAT prevents direct mode | High | Medium | Reverse tunnel architecture |
| Cellular handover breaks streams | High | Medium | Reconnect, client retry guidance, later QUIC, no false continuity promise |
| Metadata creates privacy obligations | High | Medium–High | Minimize collection, short retention, legal review, access control |
| Relay compromise | Low–Medium | High | Segmentation, mTLS, patching, no payload storage, short-lived credentials |
| DNS/parser bypass reaches local networks | Medium if naive | Critical | Mature parsing, dual enforcement, fuzzing, maintained special-range table |
| Dual-SIM behavior varies | High | Low–Medium | Use default SIM in MVP, do not promise selection |
| Background-start behavior changes in new Android version | Medium | High | User-initiated start, target current SDK, continuous compatibility testing |
| Public SOCKS5 credential exposed | Medium | High | Delay feature, TLS/local connector, IP allowlist |
| User misunderstands legal responsibility | Medium | High | Prominent disclosure, AUP, visible sessions, simple stop |
| Reconnect storm overwhelms region | Medium | High | Jittered backoff, admission control, regional failover, load test |
| Data deletion incomplete across backups/logs | Medium | High | Data map, retention automation, deletion tests, backup policy |

The Play-policy risk and abuse-reputation risk are first-class product risks, not documentation details.

---

## 23. Key product decisions and recommended defaults

| Decision | Recommended default |
|---|---|
| Product category | Owner-controlled mobile egress relay |
| Remote architecture | Cloud reverse tunnel |
| Phone's own traffic interception | No |
| Android `VpnService` | No for MVP |
| Public client protocol | HTTPS proxy with CONNECT |
| SOCKS5 | Later, constrained |
| UDP | No |
| Tunnel MVP | TLS WebSocket or gRPC/HTTP2 |
| Tunnel production | QUIC with fallback |
| Egress network | User-selected; cellular only is the mobile-proxy default |
| Network fallback | Never silent; only preference modes permit the disclosed fallback |
| Roaming | Off |
| Destination ports | TCP 80 and 443 |
| Private/special addresses | Always blocked |
| Device authentication | Keystore key + challenge; mTLS/session token |
| Client authentication | High-entropy per-key credentials |
| Secret display | Once |
| Source IP allowlist | Recommended during creation |
| Concurrent streams | Conservative, configurable |
| Data cap | Required during onboarding |
| Auto-start after reboot | Off |
| Service restart mode | Not sticky |
| Payload logging | Never |
| Durable destination history | Off by default |
| App distribution | Closed beta first |
| Marketplace/resale | Out of scope |
| Minimum Android | API 26 |
| Near-term target | API 36, verify before submission |
| UI | Compose Material 3 |
| Relay implementation | Go or Rust for production |
| Control API | TypeScript + PostgreSQL |
| Route directory | Redis with TTL and fencing |

---

## 24. Development repository structure

```text
pocketrelay/
├── android/
│   ├── app/
│   ├── core/
│   ├── relay/
│   ├── feature/
│   ├── benchmark/
│   └── build-logic/
├── backend/
│   ├── control-api/
│   ├── relay/
│   ├── proxy-ingress/
│   ├── shared-protocol/
│   ├── admin-console/
│   └── migrations/
├── protocol/
│   ├── protobuf/
│   ├── test-vectors/
│   └── specification/
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   ├── monitoring/
│   └── runbooks/
├── security/
│   ├── threat-model/
│   ├── abuse-controls/
│   ├── data-flow/
│   └── release-checklists/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── android/
│   ├── backend/
│   ├── operations/
│   ├── privacy/
│   └── support/
└── .github-or-gitlab/
```

Keep the shared protocol specification language-neutral. Generate codec types where practical, but keep safety validation implementation-specific and independently tested.

---

## 25. Operational runbooks required before launch

### 25.1 Leaked credential

1. Revoke key.
2. Terminate active client sessions.
3. Notify owner.
4. Show source-IP and byte summary permitted by privacy policy.
5. Review blocked events.
6. Rotate related secrets if needed.
7. Preserve minimum evidence under approved procedure.
8. Check cloud cost and carrier complaints.

### 25.2 Lost or stolen phone

1. Remote revoke device.
2. Remove route immediately.
3. Revoke all device-scoped proxy credentials.
4. Notify owner.
5. Mark Keystore key revoked.
6. Require fresh enrollment on replacement device.

### 25.3 Relay compromise

1. Drain or isolate node.
2. Revoke node identity.
3. Move devices to healthy nodes.
4. Rotate internal credentials/certificates.
5. Preserve forensic evidence.
6. Assess metadata exposure.
7. Notify affected parties according to incident plan.
8. Publish a status update when appropriate.

### 25.4 Abuse complaint

1. Validate complaint and timestamps.
2. Map to account/device/key using approved metadata.
3. Suspend the narrowest entity needed.
4. Preserve approved evidence.
5. Notify owner and request explanation where appropriate.
6. Escalate repeated or severe abuse.
7. Tune rules without collecting unnecessary content.
8. Document decision and appeal path.

### 25.5 Region outage

1. Stop new assignments.
2. Mark region degraded.
3. Redirect reconnecting devices.
4. Reject client connections clearly during transition.
5. Monitor reconnect storm.
6. Restore gradually.
7. Review capacity and root cause.

### 25.6 Data-cap anomaly

1. Freeze new streams if accounting is uncertain.
2. Compare phone and relay counters.
3. Check duplicated tunnel generations.
4. Review retries/retransmissions.
5. Correct display and billing only through auditable process.

---

## 26. Launch checklist

### Product and UX

- [ ] Core purpose is described plainly.
- [ ] Disclosure reviewed.
- [ ] AUP and privacy policy linked before activation.
- [ ] Persistent online status visible.
- [ ] Start and Stop are obvious.
- [ ] Mobile data, roaming, and battery impacts shown.
- [ ] Endpoint setup instructions tested with common clients.
- [ ] “Any service” is not claimed.
- [ ] Accessibility review complete.
- [ ] Localizations professionally reviewed.

### Android

- [ ] Current target SDK requirement verified.
- [ ] Foreground-service type and Play declaration reviewed.
- [ ] User-initiated service start.
- [ ] Notification permission handling.
- [ ] `android:exported` audit.
- [ ] Cleartext disabled.
- [ ] Keystore keys.
- [ ] Cellular bind verified.
- [ ] Doze, battery saver, and OEM tests.
- [ ] Roaming disabled by default.
- [ ] No hidden restart.
- [ ] Signed release and protected key.
- [ ] Dependency and MASVS review.

### Backend

- [ ] TLS and internal mTLS.
- [ ] Proxy authentication mandatory.
- [ ] Route fencing.
- [ ] Strong credential generation.
- [ ] Secret redaction.
- [ ] Private/special address blocks.
- [ ] Port allowlist.
- [ ] Bounded buffers.
- [ ] Rate, stream, and byte caps.
- [ ] Admin revoke.
- [ ] Backups and recovery.
- [ ] Graceful relay drain.
- [ ] Cost alerts.
- [ ] External open-proxy scan.

### Privacy and trust

- [ ] Data inventory approved.
- [ ] Retention jobs active.
- [ ] Account/device deletion tested.
- [ ] No payload logging.
- [ ] Employee RBAC and audit.
- [ ] Abuse contact monitored.
- [ ] Incident response exercised.
- [ ] Carrier/market review.
- [ ] Store data-safety form accurate.
- [ ] Reviewer instructions prepared.

### Release

- [ ] Closed beta first.
- [ ] Staged rollout.
- [ ] Crash and reconnect dashboards.
- [ ] Rollback plan.
- [ ] Public status page.
- [ ] Support scripts and known limitations.
- [ ] On-call ownership.

---

## 27. Open questions to resolve during product discovery

Recommended defaults are included so work can proceed without blocking.

1. **Who is the first user?**  
   Default: individual owner or small internal QA team using its own phones.

2. **Will users access only their own destinations?**  
   Default: yes; optional destination allowlists should be supported.

3. **Is public Google Play distribution mandatory?**  
   Default: plan for it, but validate through closed testing before depending on approval.

4. **What countries and carriers are first?**  
   Default: one country and a small carrier matrix before expansion.

5. **How much data is expected?**  
   Default: conservative 1 GB/day cap during beta.

6. **What client software must work first?**  
   Default: Chrome/Firefox system proxy where supported, `curl`, Python HTTP clients, Node.js, and one user-selected SaaS integration.

7. **Is SOCKS5 required at launch?**  
   Default: no; ship HTTPS CONNECT first.

8. **Does the business require recoverable proxy passwords?**  
   Default: no; one-time display and rotation.

9. **Does the phone have to run after reboot without interaction?**  
   Default: no.

10. **Will organizations manage fleets?**  
    Default: data model supports organizations, but UI launches for one owner.

11. **Is billing required?**  
    Default: no billing in first beta; collect usage aggregates only.

12. **Is destination history a desired feature?**  
    Default: no durable destination history.

13. **What relay language does the team know?**  
    Default: Go for data plane, TypeScript for control plane.

14. **Is QUIC required immediately?**  
    Default: no; keep protocol transport-neutral and add later.

15. **What threat level is acceptable on rooted devices?**  
    Default: show a warning/risk signal and allow private beta use; stricter enterprise policy later.

---

## 28. Recommended first 12 engineering tasks

1. Build a tiny Android test that requests a cellular `Network`, resolves a controlled hostname with it, binds a socket, and confirms the mobile public IP while Wi-Fi is active.
2. Implement CIDR/special-address validation with exhaustive unit tests before any general proxy forwarding.
3. Build a TLS WebSocket echo tunnel from Android to one relay VM.
4. Add binary frame codec and fuzz tests.
5. Implement one authenticated HTTPS CONNECT ingress.
6. Route one CONNECT stream through the phone to a controlled HTTPS test server.
7. Add bounded buffers, timeouts, flow control, and clean cancellation.
8. Add Keystore enrollment and challenge-response authentication.
9. Add foreground service, persistent notification, and explicit Start/Stop.
10. Add credentials, source-IP allowlist, ports 80/443, and daily cap.
11. Add the Home and Access Compose screens from this specification.
12. Run an external open-proxy test and a focused security review before adding more features.

Do not start with branding, billing, a public marketplace, or UDP. The hardest product risks are secure routing, Android lifecycle, abuse prevention, and policy acceptance.

---

## 29. Definition of done for the initial prototype

The prototype is complete only when all statements below are true:

- A user knowingly starts the relay.
- Android shows a persistent notification.
- The phone maintains an outbound encrypted tunnel.
- An authorized client can use an HTTPS proxy credential.
- The destination observes the public IP of the selected phone transport: cellular in cellular mode or Wi-Fi in Wi-Fi mode.
- Wi-Fi can remain active without becoming the egress in cellular-only mode, and mobile data can remain enabled without becoming the egress in Wi-Fi-only mode.
- Authentication cannot be bypassed.
- Private and special addresses are blocked.
- Only TCP 80/443 are allowed.
- The proxy stops immediately when the user requests it.
- Credentials can be revoked.
- Byte usage is shown.
- No payload or proxy secret appears in logs.
- The system survives a brief mobile-network interruption.
- The prototype has a documented threat model and external open-proxy test.
- It is used only against controlled destinations during development.

---

## 30. Glossary

**CGNAT** — Carrier-grade network address translation; many phones share public addresses and cannot receive arbitrary inbound connections.

**Control plane** — APIs and services that manage users, devices, policy, credentials, and configuration.

**Data plane** — Services that move proxy bytes between client, relay, phone, and destination.

**Egress IP** — The public IP observed by the destination. In PocketRelay, it must match the selected cellular or Wi-Fi transport and be re-verified after every network change.

**Foreground service** — An Android service for ongoing user-noticeable work, accompanied by a visible notification.

**HTTP CONNECT** — An HTTP method used by a proxy to create a bidirectional TCP tunnel, commonly for HTTPS.

**Multiplexing** — Carrying many logical streams through one physical tunnel.

**mTLS** — Mutual TLS, where both sides authenticate with certificates.

**NAT64** — Translation used by IPv6-only networks to reach IPv4 destinations.

**Proxy ingress** — The public relay endpoint to which an authorized client connects.

**Reverse tunnel** — A connection initiated outbound by the phone, allowing the cloud relay to send authorized logical streams back through it.

**SOCKS5** — A proxy protocol supporting TCP connections and, in its full form, other commands such as UDP association.

**Stream** — One logical proxied TCP connection carried through the device tunnel.

**Tunnel generation** — A monotonically changing identifier used to ensure an old phone connection cannot replace a newer active route.

---

## 31. Primary references

The technical and policy details in this document should be rechecked before each release because Android and Google Play requirements change.

### Android platform and architecture

1. Android foreground-service types:  
   https://developer.android.com/develop/background-work/services/fgs/service-types

2. Android foreground services overview:  
   https://developer.android.com/develop/background-work/services/fgs

3. Restrictions on starting foreground services from the background:  
   https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start

4. Android network state and requesting a network:  
   https://developer.android.com/develop/connectivity/network-ops/reading-network-state

5. Android `Network` API, including socket binding and DNS on a selected network:  
   https://developer.android.com/reference/android/net/Network

6. Android Keystore:  
   https://developer.android.com/privacy-and-security/keystore

7. Network Security Configuration:  
   https://developer.android.com/privacy-and-security/security-config

8. Android architecture recommendations:  
   https://developer.android.com/topic/architecture/recommendations

9. Doze and App Standby:  
   https://developer.android.com/training/monitoring-device-state/doze-standby

10. Notification runtime permission:  
    https://developer.android.com/develop/ui/views/notifications/notification-permission

11. gRPC on Android:  
    https://developer.android.com/guide/topics/connectivity/grpc

12. Play Integrity API overview:  
    https://developer.android.com/google/play/integrity/overview

13. Google Play target API requirements:  
    https://support.google.com/googleplay/android-developer/answer/11926878

### Google Play policy and ecosystem risk

14. Google Play Device and Network Abuse policy:  
    https://support.google.com/googleplay/android-developer/answer/16559646

15. Google Play `VpnService` policy:  
    https://support.google.com/googleplay/android-developer/answer/12564964

16. Google Threat Intelligence: disruption of residential proxy networks, 2 July 2026:  
    https://cloud.google.com/blog/topics/threat-intelligence/google-continued-disruption-residential-proxy-networks

### Protocols

17. RFC 1928 — SOCKS Protocol Version 5:  
    https://www.rfc-editor.org/info/rfc1928

18. RFC 9110 — HTTP Semantics, including CONNECT:  
    https://www.rfc-editor.org/rfc/rfc9110.html

19. RFC 9000 — QUIC:  
    https://www.rfc-editor.org/info/rfc9000

20. RFC 8446 — TLS 1.3:  
    https://www.rfc-editor.org/rfc/rfc8446

21. RFC 9298 — CONNECT-UDP, relevant only to possible future UDP work:  
    https://www.rfc-editor.org/info/rfc9298

### Security and privacy

22. OWASP Mobile Application Security Verification Standard:  
    https://mas.owasp.org/MASVS/

23. European Commission, data-protection principles:  
    https://commission.europa.eu/law/law-topic/data-protection/data-protection-explained_en

---


## 32. Wi-Fi and cellular operational contract

This section is normative for implementation. Earlier product copy may emphasize mobile egress, but the app must implement the following network behavior exactly.

### 32.1 What “works on Wi-Fi and mobile data” means

The public proxy hostname is always the cloud ingress, for example `proxy.example.com:443`. The phone does not need a public inbound IP. The phone initiates the reverse tunnel over the selected Android network, so the design works behind home-router NAT, enterprise Wi-Fi NAT, carrier NAT, IPv6-only access, and changing public addresses, subject to normal outbound-internet access.

The destination must observe the public IP of the selected egress transport:

- Cellular mode: the carrier/mobile public IP.
- Wi-Fi mode: the public IP of the Wi-Fi internet connection.
- Preference/any mode: the public IP of the currently displayed active transport.

A successful connection to the cloud relay alone is insufficient. Before publishing the proxy endpoint as ready, the app must call a controlled IP-check service through the selected `Network`, compare the result with the selected transport, and show that IP in the UI.

### 32.2 Session pinning and network changes

One relay session is pinned to one concrete Android `Network`. The MVP does not move established TCP connections from Wi-Fi to cellular or vice versa. On loss or invalidation:

1. Stop accepting new streams.
2. Move to `RECONNECTING` or `WAITING_FOR_NETWORK`.
3. Close or briefly drain old streams.
4. Select a network according to the configured mode.
5. Create a new authenticated tunnel bound to that network.
6. Re-run DNS and public-IP verification through that network.
7. Publish the new device route and resume new streams.

Client software must tolerate ordinary connection failure and retry. The product must not advertise seamless TCP continuity across transport changes.

### 32.3 Mode-by-mode user contract

#### Cellular only

- Wi-Fi may remain connected for other phone apps.
- PocketRelay tunnel, DNS, and destination sockets use the selected cellular network.
- No Wi-Fi fallback.
- Pause when mobile data is off, the cellular network is unavailable, roaming is disallowed, or the data cap is reached.
- Show carrier/radio information only when Android exposes it without unnecessary permissions.

#### Wi-Fi only

- Mobile data may remain enabled for other phone apps.
- PocketRelay tunnel, DNS, and destination sockets use validated Wi-Fi.
- No cellular fallback and therefore no unexpected mobile-data consumption.
- Reject captive-portal, local-only, or unvalidated Wi-Fi for remote proxy operation.
- Wi-Fi SSID display is optional and must not be required for correct routing.

#### Prefer cellular

- Start on validated cellular.
- When cellular cannot be used, reconnect on validated Wi-Fi.
- The UI and persistent notification must clearly state `Fallback: Wi-Fi`.
- Revert to cellular only at a controlled reconnect boundary, not by silently moving live streams.

#### Prefer Wi-Fi

- Start on validated Wi-Fi.
- When Wi-Fi cannot be used, reconnect on validated cellular.
- Warn during configuration and display `Using mobile data` whenever fallback is active.
- Enforce roaming rules and the mobile-data cap during cellular fallback.

#### Any validated network

- Use Android's current validated default network at session start.
- Pin the session to that `Network` until it is lost or invalidated.
- Do not switch merely because another network appears unless a future user setting explicitly enables proactive switching.
- State clearly that the egress IP can change after reconnection.

### 32.4 Required state model

The state machine must distinguish at least:

```text
OFFLINE
PREPARING
WAITING_FOR_CELLULAR
WAITING_FOR_WIFI
WAITING_FOR_VALIDATION
CAPTIVE_PORTAL
CONNECTING_TUNNEL
VERIFYING_EGRESS
ONLINE_CELLULAR
ONLINE_WIFI
RECONNECTING
PAUSED_ROAMING
PAUSED_DATA_CAP
PAUSED_LOW_BATTERY
STOPPING
BLOCKED_POLICY
ERROR
```

The app, notification, and API must derive their labels from one source of truth so they cannot disagree about the active network.

### 32.5 Required API representation

Accepted `network_mode` values:

```json
[
  "cellular_only",
  "wifi_only",
  "prefer_cellular",
  "prefer_wifi",
  "any_validated_network"
]
```

Device status must include:

```json
{
  "network_mode": "cellular_only",
  "active_transport": "cellular",
  "fallback_active": false,
  "validated": true,
  "metered": true,
  "roaming": false,
  "egress_ip": "203.0.113.24",
  "network_generation": 18,
  "connected_at": "2026-07-30T20:41:22Z"
}
```

`network_generation` increments whenever the selected `Network` or verified egress IP changes. Relay routing must reject frames from an older generation after the new one is active.

### 32.6 Required tests before claiming full support

The product may claim support for both Wi-Fi and cellular only after all of these pass on representative real devices:

- Wi-Fi connected, cellular-only selected, destination sees cellular IP.
- Mobile data enabled, Wi-Fi-only selected, destination sees Wi-Fi IP.
- Wi-Fi captive portal is rejected until validated.
- Loss of Wi-Fi in Wi-Fi-only mode pauses without mobile fallback.
- Loss of Wi-Fi in prefer-Wi-Fi mode reconnects through cellular and warns the user.
- Loss of cellular in cellular-only mode pauses without Wi-Fi fallback.
- Loss of cellular in prefer-cellular mode reconnects through Wi-Fi and updates the displayed IP.
- DNS is resolved on the same network as the destination socket.
- IPv6-only/NAT64 carrier reaches controlled IPv4 and IPv6 destinations where the platform/network supports it.
- Metered Wi-Fi is identified correctly where Android reports it.
- Roaming block works before opening tunnel or destination sockets.
- Network transition invalidates old tunnel generation and cannot create a stale route takeover.
- Screen-off, Data Saver, Battery Saver, and major OEM battery managers are tested and documented.
- Stop from notification immediately closes tunnel and destination sockets on either transport.

### 32.7 Honest readiness statement

This specification is complete enough to begin implementation for both Wi-Fi and cellular operation. It is not evidence that every Android model and carrier already works. The team must complete the Phase 0 proof, integration tests, real-device matrix, security review, and Play-distribution review before describing the application as production-ready.

---

## 33. Final recommendation

Build PocketRelay first as a **private, consent-driven, authenticated Android egress relay** with a visible foreground service and a cloud reverse tunnel. Use HTTPS CONNECT, TCP only, explicit per-socket binding to the user-selected cellular or Wi-Fi `Network`, owner-created credentials, strict destination controls, conservative quotas, and no payload logging.

The most important engineering proof is not the UI or a generic proxy server. It is this exact chain:

```text
Authorized HTTPS proxy client
→ authenticated cloud ingress
→ encrypted multiplexed reverse tunnel
→ Android socket bound to selected cellular or Wi-Fi Network
→ validated public destination
```

The most important product proof is that a user always understands when it is active, who can access it, how much data it uses, and how to stop it. The most important launch proof is that the system cannot become an open proxy or a hidden residential-proxy node.

Treat public marketplace features, UDP, automatic boot operation, silent sharing, and broad third-party access as separate future products requiring a new review rather than incremental MVP features.
