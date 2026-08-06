package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = GeoDarkPrimary,
    primaryContainer = GeoDarkPrimaryContainer,
    onPrimary = GeoDarkOnPrimary,
    onPrimaryContainer = GeoDarkOnPrimaryContainer,
    background = GeoDarkBackground,
    surface = GeoDarkSurface,
    onBackground = GeoDarkOnSurface,
    onSurface = GeoDarkOnSurface,
    outline = GeoDarkOutline
  )

private val LightColorScheme =
  lightColorScheme(
    primary = GeoPrimary,
    primaryContainer = GeoPrimaryContainer,
    onPrimary = GeoOnPrimary,
    onPrimaryContainer = GeoOnPrimaryContainer,
    background = GeoBackground,
    surface = GeoSurface,
    surfaceVariant = GeoSurfaceVariant,
    onBackground = GeoOnBackground,
    onSurface = GeoOnSurface,
    onSurfaceVariant = GeoOnSurfaceVariant,
    outline = GeoOutline,
    secondary = GeoSecondary,
    secondaryContainer = GeoSecondaryContainer,
    onSecondaryContainer = GeoOnSecondaryContainer,
    tertiary = GeoAccentBlue,
    onTertiary = GeoOnAccentBlue
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Dynamic color is available on Android 12+ (disable by default to guarantee Geometric Balance design)
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }

      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
