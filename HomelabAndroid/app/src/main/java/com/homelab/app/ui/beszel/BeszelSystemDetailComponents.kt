package com.homelab.app.ui.beszel

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryStd
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.homelab.app.R
import com.homelab.app.data.remote.dto.beszel.BeszelContainer
import com.homelab.app.data.remote.dto.beszel.BeszelRecordStats
import com.homelab.app.data.remote.dto.beszel.BeszelSystem
import com.homelab.app.data.remote.dto.beszel.BeszelSystemDetails
import com.homelab.app.data.remote.dto.beszel.BeszelSystemInfo
import com.homelab.app.ui.theme.StatusGreen
import com.homelab.app.ui.theme.StatusOrange
import com.homelab.app.ui.theme.StatusPurple
import com.homelab.app.ui.theme.StatusRed
import com.homelab.app.ui.theme.isThemeDark
import com.homelab.app.ui.theme.primaryColor
import com.homelab.app.util.ServiceType

@Composable
internal fun BeszelHeaderCard(system: BeszelSystem) {
    val isUp = system.isOnline
    val statusColor = if (isUp) StatusGreen else StatusRed

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
    ) {
        Row(
            modifier = Modifier.padding(18.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = statusColor.copy(alpha = 0.1f),
                modifier = Modifier.size(52.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (isUp) Icons.Default.Wifi else Icons.Default.WifiOff,
                        contentDescription = null,
                        tint = statusColor,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(system.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    "${system.host}:${system.portValue ?: 80}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Surface(shape = RoundedCornerShape(14.dp), color = statusColor.copy(alpha = 0.1f)) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(statusColor))
                    Text(
                        if (isUp) stringResource(R.string.beszel_online) else stringResource(R.string.beszel_offline),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }
        }
    }
}

@Composable
internal fun SystemInfoSection(info: BeszelSystemInfo?, details: BeszelSystemDetails?) {
    if (info == null && details == null) return

    var expanded by remember { mutableStateOf(false) }

    val osText = details?.osName ?: info?.os
    val kernelText = details?.kernel ?: info?.k
    val hostnameText = details?.hostname ?: info?.h
    val cpuText = details?.cpu ?: info?.cm
    val coresValue = details?.cores ?: info?.c
    val memoryDisplay = details?.memory?.let { bytes ->
        val gb = bytes / (1024.0 * 1024.0 * 1024.0)
        formatGB(gb)
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded },
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = ServiceType.BESZEL.primaryColor.copy(alpha = 0.08f),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = ServiceType.BESZEL.primaryColor, modifier = Modifier.size(18.dp))
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.beszel_info_title),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        hostnameText?.takeIf { it.isNotEmpty() }?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                AnimatedVisibility(
                    visible = expanded,
                    enter = expandVertically() + fadeIn(),
                    exit = shrinkVertically() + fadeOut()
                ) {
                    Column {
                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        Column(modifier = Modifier.padding(top = 4.dp)) {
                            osText?.takeIf { it.isNotEmpty() }?.let {
                                InfoRow(stringResource(R.string.beszel_os), it)
                            }
                            kernelText?.takeIf { it.isNotEmpty() }?.let {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                )
                                InfoRow(stringResource(R.string.beszel_kernel), it)
                            }
                            cpuText?.takeIf { it.isNotEmpty() }?.let {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                )
                                InfoRow(stringResource(R.string.beszel_cpu), it)
                            }
                            coresValue?.takeIf { it > 0 }?.let {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                )
                                InfoRow(stringResource(R.string.beszel_cores), "$it")
                            }
                            memoryDisplay?.takeIf { it.isNotEmpty() }?.let {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                )
                                InfoRow(stringResource(R.string.beszel_memory), it)
                            }
                            if (details?.podman == true) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                )
                                InfoRow(stringResource(R.string.beszel_podman), "true")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun ResourcesSection(
    cpu: Double,
    mp: Double,
    dp: Double,
    cpuHistory: List<Double> = emptyList(),
    memHistory: List<Double> = emptyList(),
    onCpuClick: () -> Unit = {},
    onMemClick: () -> Unit = {}
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader(icon = Icons.Default.Layers, title = stringResource(R.string.beszel_resources_title))

        ResourceCard(
            icon = Icons.Default.Memory,
            iconColor = ServiceType.BESZEL.primaryColor,
            title = stringResource(R.string.beszel_cpu),
            percent = cpu,
            history = cpuHistory,
            onClick = onCpuClick
        )

        ResourceCard(
            icon = Icons.Default.Dns,
            iconColor = StatusPurple,
            title = stringResource(R.string.beszel_memory),
            percent = mp,
            history = memHistory,
            onClick = onMemClick
        )

        ResourceCard(
            icon = Icons.Default.Storage,
            iconColor = StatusOrange,
            title = stringResource(R.string.beszel_disk),
            percent = dp
        )
    }
}

@Composable
internal fun ExtraMetricsSection(
    latest: BeszelRecordStats,
    history: List<BeszelRecordStats>,
    onMetricClick: (ExtraMetricType) -> Unit
) {
    val hasTemp = latest.maxTempCelsius != null
    val hasLoad = latest.loadAvgValues.isNotEmpty()
    val hasNet = latest.netRxBytes != null || latest.netTxBytes != null
    val hasDisk = latest.diskReadIO != null || latest.diskWriteIO != null
    val hasBattery = latest.batteryLevel != null

    if (!hasTemp && !hasLoad && !hasNet && !hasDisk && !hasBattery) return

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader(icon = Icons.Default.Insights, title = stringResource(R.string.beszel_extra_title))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
        ) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (hasTemp || hasLoad) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (hasTemp) {
                            val temp = latest.maxTempCelsius!!
                            val tempColor = when {
                                temp >= 80 -> StatusRed
                                temp >= 65 -> StatusOrange
                                else -> StatusGreen
                            }
                            ExtraMetricChip(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Thermostat,
                                accentColor = tempColor,
                                label = stringResource(R.string.beszel_temps),
                                value = String.format("%.1f°C", temp),
                                onClick = { onMetricClick(ExtraMetricType.TEMPERATURE) }
                            )
                        }
                        if (hasLoad) {
                            val loadValues = latest.loadAvgValues
                            val loadText = when (loadValues.size) {
                                0 -> ""
                                1 -> String.format("%.2f", loadValues[0])
                                2 -> String.format("%.2f / %.2f", loadValues[0], loadValues[1])
                                else -> String.format("%.2f / %.2f / %.2f", loadValues[0], loadValues[1], loadValues[2])
                            }
                            ExtraMetricChip(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Timeline,
                                accentColor = ServiceType.BESZEL.primaryColor,
                                label = stringResource(R.string.beszel_load_avg),
                                value = loadText,
                                onClick = { onMetricClick(ExtraMetricType.LOAD) }
                            )
                        }
                    }
                }

                if (hasNet || hasDisk) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (hasNet) {
                            // ns/nr are precomputed Beszel rates in MB/s
                            val rxRateBytes = (latest.nr ?: 0.0) * 1024 * 1024
                            val txRateBytes = (latest.ns ?: 0.0) * 1024 * 1024
                            ExtraMetricChip(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.NetworkCheck,
                                accentColor = StatusPurple,
                                label = stringResource(R.string.beszel_network_io),
                                value = "↓ ${formatNetRateBytesPerSec(rxRateBytes)}  ↑ ${formatNetRateBytesPerSec(txRateBytes)}",
                                onClick = { onMetricClick(ExtraMetricType.NETWORK) }
                            )
                        }
                        if (hasDisk) {
                            val read = latest.diskReadIO ?: 0.0
                            val write = latest.diskWriteIO ?: 0.0
                            ExtraMetricChip(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Speed,
                                accentColor = StatusOrange,
                                label = stringResource(R.string.beszel_disk_io),
                                value = "R ${read.toLong()}  W ${write.toLong()}",
                                onClick = { onMetricClick(ExtraMetricType.DISK) }
                            )
                        }
                    }
                }

                if (hasBattery) {
                    val level = latest.batteryLevel ?: 0
                    val minutes = latest.batteryMinutes
                    val value = if (minutes != null && minutes > 0) "$level% · ${minutes}m" else "$level%"
                    val batteryColor = when {
                        level <= 15 -> StatusRed
                        level <= 35 -> StatusOrange
                        else -> StatusGreen
                    }
                    ExtraMetricChip(
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Default.BatteryStd,
                        accentColor = batteryColor,
                        label = stringResource(R.string.beszel_battery),
                        value = value,
                        showProgress = true,
                        progress = level / 100.0,
                        onClick = { onMetricClick(ExtraMetricType.BATTERY) }
                    )
                }
            }
        }
    }
}

@Composable
internal fun ExtraMetricChip(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    accentColor: Color,
    label: String,
    value: String,
    showProgress: Boolean = false,
    progress: Double = 0.0,
    onClick: () -> Unit = {}
) {
    val haptic = LocalHapticFeedback.current

    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = accentColor.copy(alpha = 0.06f)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.clickable {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onClick()
                }
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = accentColor.copy(alpha = 0.12f),
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(18.dp))
                    }
                }
                Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = accentColor.copy(alpha = 0.9f),
                    modifier = Modifier.size(16.dp)
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (showProgress) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth((progress.coerceIn(0.0, 1.0)).toFloat())
                            .height(4.dp)
                            .background(accentColor, RoundedCornerShape(2.dp))
                    )
                }
            }
        }
    }
}

@Composable
internal fun ResourceCard(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    percent: Double,
    detailLeft: String? = null,
    detailRight: String? = null,
    history: List<Double> = emptyList(),
    onClick: (() -> Unit)? = null
) {
    val progressColor = when {
        percent > 90 -> StatusRed
        percent > 70 -> StatusOrange
        else -> StatusGreen
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = iconColor.copy(alpha = 0.1f),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(20.dp))
                    }
                }

                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    String.format("%.1f%%", percent),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = progressColor
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (isThemeDark()) MaterialTheme.colorScheme.surfaceContainerHigh else MaterialTheme.colorScheme.surfaceVariant)
            ) {
                val animatedProgress by animateFloatAsState(
                    targetValue = (percent.toFloat() / 100f).coerceIn(0f, 1f),
                    animationSpec = spring(stiffness = Spring.StiffnessLow),
                    label = "resource_progress"
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(animatedProgress)
                        .height(8.dp)
                        .background(Brush.horizontalGradient(listOf(progressColor.copy(alpha = 0.7f), progressColor)))
                )
            }

            if (detailLeft != null && detailRight != null) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(detailLeft, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(detailRight, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (history.isNotEmpty()) {
                SmoothLineGraph(data = history, graphColor = iconColor)
            }
        }
    }
}

@Composable
internal fun ContainersSection(containers: List<BeszelContainer>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader(icon = Icons.Default.Inventory2, title = stringResource(R.string.beszel_containers_title).format(containers.count()))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
        ) {
            Column {
                containers.forEachIndexed { index, container ->
                    Row(
                        modifier = Modifier.padding(14.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = ServiceType.BESZEL.primaryColor.copy(alpha = 0.08f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Inventory2,
                                    contentDescription = null,
                                    tint = ServiceType.BESZEL.primaryColor,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }

                        Text(
                            container.name,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            ContainerStat(icon = Icons.Default.Memory, value = String.format("%.1f%%", container.cpuValue))
                            ContainerStat(icon = Icons.Default.Dns, value = formatMB(container.mValue))
                        }
                    }
                    if (index < containers.size - 1) {
                        HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = MaterialTheme.colorScheme.outlineVariant)
                    }
                }
            }
        }
    }
}

@Composable
internal fun ContainerStat(icon: ImageVector, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
    }
}

@Composable
internal fun UptimeCard(seconds: Double) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Column {
                Text(stringResource(R.string.beszel_uptime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(formatUptimeShort(seconds), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
internal fun SectionHeader(icon: ImageVector, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, contentDescription = null, tint = ServiceType.BESZEL.primaryColor, modifier = Modifier.size(16.dp))
        Text(title, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
internal fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 16.dp)
        )
    }
}

