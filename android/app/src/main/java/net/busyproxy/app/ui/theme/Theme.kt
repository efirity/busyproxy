package net.busyproxy.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Match BusyProxy web tokens (dark-first product)
private val Teal = Color(0xFF14B8A6)
private val Bg = Color(0xFF0B0B0F)
private val Surface = Color(0xFF16161D)
private val Fg = Color(0xFFE7E7EA)
private val Muted = Color(0xFFA0A0AB)
private val Border = Color(0xFF26262F)
private val Danger = Color(0xFFF87171)
private val Success = Color(0xFF34D399)

private val DarkColors =
    darkColorScheme(
        primary = Teal,
        onPrimary = Color(0xFF042F2E),
        background = Bg,
        onBackground = Fg,
        surface = Surface,
        onSurface = Fg,
        onSurfaceVariant = Muted,
        outline = Border,
        error = Danger,
        secondary = Success,
    )

private val LightColors =
    lightColorScheme(
        primary = Color(0xFF0F766E),
        background = Color(0xFFFAFAFB),
        surface = Color.White,
        onBackground = Color(0xFF111113),
        onSurface = Color(0xFF111113),
    )

@Composable
fun BusyProxyTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme() || true // product default dark
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content,
    )
}
