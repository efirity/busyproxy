package net.busyproxy.app.locale

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import net.busyproxy.app.R

/**
 * In-app language: English + 4 high-reach locales.
 * Uses [AppCompatDelegate.setApplicationLocales] so Compose resources refresh.
 */
object AppLocale {
    data class Option(
        /** BCP-47 tag stored in prefs / AppCompat (e.g. "pt-BR", "zh-CN"). */
        val tag: String,
        val labelRes: Int,
    )

    /** Empty tag = follow system. */
    const val SYSTEM = ""

    val OPTIONS: List<Option> =
        listOf(
            Option("en", R.string.lang_en),
            Option("es", R.string.lang_es),
            Option("zh-CN", R.string.lang_zh),
            Option("hi", R.string.lang_hi),
            Option("pt-BR", R.string.lang_pt),
        )

    private const val PREFS = "busyproxy_locale"
    private const val KEY = "app_locale_tag"

    fun getSavedTag(context: Context): String {
        return context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY, SYSTEM)
            .orEmpty()
    }

    /** Map any saved/system tag to a known option (default English). */
    fun resolveOptionTag(raw: String): String {
        val tag = raw.ifBlank { currentAppliedTag() }.ifBlank { "en" }
        OPTIONS.firstOrNull { it.tag.equals(tag, ignoreCase = true) }?.let { return it.tag }
        OPTIONS.firstOrNull {
            tag.startsWith(it.tag.substringBefore('-'), ignoreCase = true)
        }?.let { return it.tag }
        return "en"
    }

    fun isSupported(tag: String): Boolean =
        tag == SYSTEM || OPTIONS.any { it.tag.equals(tag, ignoreCase = true) }

    /** Call from [android.app.Application.onCreate] and before UI. */
    fun applyStored(context: Context) {
        val tag = getSavedTag(context)
        applyLocales(tag)
    }

    fun setAndApply(context: Context, tag: String) {
        val normalized =
            when {
                tag.isBlank() -> SYSTEM
                OPTIONS.any { it.tag.equals(tag, ignoreCase = true) } ->
                    OPTIONS.first { it.tag.equals(tag, ignoreCase = true) }.tag
                else -> SYSTEM
            }
        context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, normalized)
            .apply()
        applyLocales(normalized)
    }

    private fun applyLocales(tag: String) {
        val list =
            if (tag.isBlank()) {
                LocaleListCompat.getEmptyLocaleList()
            } else {
                LocaleListCompat.forLanguageTags(tag)
            }
        AppCompatDelegate.setApplicationLocales(list)
    }

    /** Currently applied app locale tag, or "" if following system. */
    fun currentAppliedTag(): String {
        val locales = AppCompatDelegate.getApplicationLocales()
        if (locales.isEmpty) return SYSTEM
        return locales.toLanguageTags().substringBefore(',')
    }
}
