package com.homelab.app.util

import androidx.annotation.Keep
import androidx.compose.ui.graphics.Color
import kotlinx.serialization.Serializable

@Keep
@Serializable
enum class ServiceType(val displayName: String) {
    PORTAINER("Portainer"),
    PIHOLE("Pi-hole"),
    BESZEL("Beszel"),
    GITEA("Gitea"),
    UNKNOWN("Unknown")
}
