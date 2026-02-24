package com.homelab.app.ui.beszel

internal enum class ExtraMetricType {
    TEMPERATURE, LOAD, NETWORK, DISK, BATTERY
}

internal enum class ResourceMetricType {
    CPU, MEMORY
}

internal data class BandwidthPoint(
    val rxBytesPerSec: Double,
    val txBytesPerSec: Double
)


