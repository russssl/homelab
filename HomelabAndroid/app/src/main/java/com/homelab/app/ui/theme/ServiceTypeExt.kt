package com.homelab.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import com.homelab.app.util.ServiceType

@Composable
fun isThemeDark(): Boolean = MaterialTheme.colorScheme.background.luminance() < 0.5f

val ServiceType.primaryColor: Color
    @Composable
    get() = when (this) {
        ServiceType.PORTAINER -> Color(0xFF13B5EA)
        ServiceType.PIHOLE -> Color(0xFFCD2326)
        ServiceType.BESZEL -> Color(0xFF0EA5E9)
        ServiceType.GITEA -> Color(0xFF609926)
        ServiceType.UNKNOWN -> if (isThemeDark()) Color.LightGray else Color.Gray
    }

val ServiceType.backgroundColor: Color
    @Composable
    get() = when (this) {
        ServiceType.PORTAINER -> Color(0xFF13B5EA).copy(alpha = 0.12f)
        ServiceType.PIHOLE -> Color(0xFFCD2326).copy(alpha = 0.12f)
        ServiceType.BESZEL -> Color(0xFF0EA5E9).copy(alpha = 0.12f)
        ServiceType.GITEA -> Color(0xFF609926).copy(alpha = 0.12f)
        ServiceType.UNKNOWN -> if (isThemeDark()) Color(0xFF334155) else Color(0xFFF1F5F9)
    }

val ServiceType.iconUrl: String
    get() = when (this) {
        ServiceType.PORTAINER -> "https://cdn.jsdelivr.net/gh/selfhst/icons/png/portainer.png"
        ServiceType.PIHOLE -> "https://cdn.jsdelivr.net/gh/selfhst/icons/png/pi-hole.png"
        ServiceType.BESZEL -> "https://cdn.jsdelivr.net/gh/selfhst/icons/png/beszel.png"
        ServiceType.GITEA -> "https://cdn.jsdelivr.net/gh/selfhst/icons/png/gitea.png"
        ServiceType.UNKNOWN -> ""
    }
