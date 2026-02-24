package com.homelab.app.ui.beszel

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.homelab.app.R
import com.homelab.app.data.remote.dto.beszel.BeszelContainer
import com.homelab.app.data.remote.dto.beszel.BeszelRecordStats
import com.homelab.app.data.remote.dto.beszel.BeszelSystem
import com.homelab.app.data.remote.dto.beszel.BeszelSystemDetails
import com.homelab.app.data.remote.dto.beszel.BeszelSystemInfo
import com.homelab.app.data.remote.dto.beszel.BeszelSystemRecord
import com.homelab.app.ui.theme.StatusBlue
import com.homelab.app.ui.theme.StatusGreen
import com.homelab.app.ui.theme.StatusOrange
import com.homelab.app.ui.theme.StatusPurple
import com.homelab.app.ui.theme.StatusRed
import com.homelab.app.ui.theme.isThemeDark
import com.homelab.app.ui.theme.primaryColor
import com.homelab.app.util.ServiceType
import java.util.*
import kotlin.math.roundToInt
import android.graphics.Paint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeszelSystemDetailScreen(
    systemId: String,
    onNavigateBack: () -> Unit,
    viewModel: BeszelViewModel = hiltViewModel()
) {
    val system by viewModel.selectedSystem.collectAsStateWithLifecycle()
    val systemDetails by viewModel.systemDetails.collectAsStateWithLifecycle()
    val records by viewModel.records.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    
    LaunchedEffect(systemId) {
        viewModel.fetchSystemDetail(systemId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(system?.name ?: stringResource(R.string.beszel_system_details), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.fetchSystemDetail(systemId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.refresh))
                    }
                }
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        if (isLoading && system == null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = ServiceType.BESZEL.primaryColor)
            }
        } else if (system == null) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Text(error ?: stringResource(R.string.beszel_system_not_found), color = MaterialTheme.colorScheme.error)
            }
        } else {
            val s = system!!
            val info = s.info
            val details = systemDetails
            val latestStats = records.firstOrNull()?.stats
            val statsHistory = records.map { it.stats }

            val cpuHistory = records.takeLast(30).map { it.stats.cpuValue }
            val memHistory = records.takeLast(30).map { it.stats.mpValue }

            val expandedMetric = remember { mutableStateOf<ExtraMetricType?>(null) }
            val expandedResourceMetric = remember { mutableStateOf<ResourceMetricType?>(null) }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Card
                item { BeszelHeaderCard(s) }

                if (info != null || details != null) {
                    // System Info
                    item { SystemInfoSection(info = info, details = details) }
                }

                if (info != null) {
                    // Resources
                    item {
                        ResourcesSection(
                            cpu = info.cpuValue,
                            mp = info.mpValue,
                            dp = info.dpValue,
                            cpuHistory = cpuHistory,
                            memHistory = memHistory,
                            onCpuClick = { expandedResourceMetric.value = ResourceMetricType.CPU },
                            onMemClick = { expandedResourceMetric.value = ResourceMetricType.MEMORY }
                        )
                    }

                    // Containers
                    val containers = latestStats?.dc ?: emptyList()
                    if (containers.isNotEmpty()) {
                        item { ContainersSection(containers) }
                    }

                    // Extra metrics from latest stats
                    if (latestStats != null) {
                        item {
                            ExtraMetricsSection(
                                latest = latestStats,
                                history = statsHistory,
                                onMetricClick = { expandedMetric.value = it }
                            )
                        }
                    }

                    // Uptime
                    item { UptimeCard(info.uValue) }
                }
            }

            expandedMetric.value?.let { metric ->
                ExtraMetricDetailsSheet(
                    metric = metric,
                    history = statsHistory,
                    onDismiss = { expandedMetric.value = null }
                )
            }

            expandedResourceMetric.value?.let { metric ->
                val title: String
                val data: List<Double>
                val accent: Color
                val formatter: (Double) -> String

                when (metric) {
                    ResourceMetricType.CPU -> {
                        title = stringResource(R.string.beszel_cpu)
                        data = cpuHistory
                        accent = ServiceType.BESZEL.primaryColor
                        formatter = { v: Double -> String.format("%.1f%%", v) }
                    }
                    ResourceMetricType.MEMORY -> {
                        title = stringResource(R.string.beszel_memory)
                        data = memHistory
                        accent = StatusPurple
                        formatter = { v: Double -> String.format("%.1f%%", v) }
                    }
                }
                ResourceMetricDetailsSheet(
                    title = title,
                    data = data,
                    accent = accent,
                    unitFormatter = formatter,
                    onDismiss = { expandedResourceMetric.value = null }
                )
            }

        }
    }
}

private enum class ExtraMetricType {
    TEMPERATURE, LOAD, NETWORK, DISK, BATTERY
}

private enum class ResourceMetricType {
    CPU, MEMORY
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraMetricDetailsSheet(
    metric: ExtraMetricType,
    history: List<BeszelRecordStats>,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        val title = when (metric) {
            ExtraMetricType.TEMPERATURE -> stringResource(R.string.beszel_temps)
            ExtraMetricType.LOAD -> stringResource(R.string.beszel_load_avg)
            ExtraMetricType.NETWORK -> stringResource(R.string.beszel_network_io)
            ExtraMetricType.DISK -> stringResource(R.string.beszel_disk_io)
            ExtraMetricType.BATTERY -> stringResource(R.string.beszel_battery)
        }

        val data: List<Double> = when (metric) {
            ExtraMetricType.TEMPERATURE -> history.mapNotNull { it.maxTempCelsius }
            ExtraMetricType.LOAD -> history.mapNotNull { it.loadAvgValues.firstOrNull() }
            ExtraMetricType.NETWORK -> history.mapNotNull { it.netRxBytes }
            ExtraMetricType.DISK -> history.mapNotNull { it.diskReadIO }
            ExtraMetricType.BATTERY -> history.mapNotNull { it.batteryLevel?.toDouble() }
        }

        val accent = when (metric) {
            ExtraMetricType.TEMPERATURE -> StatusOrange
            ExtraMetricType.LOAD -> ServiceType.BESZEL.primaryColor
            ExtraMetricType.NETWORK -> StatusPurple
            ExtraMetricType.DISK -> StatusOrange
            ExtraMetricType.BATTERY -> StatusGreen
        }

        val unitFormatter: (Double) -> String = when (metric) {
            ExtraMetricType.TEMPERATURE -> { v -> String.format("%.1f°C", v) }
            ExtraMetricType.LOAD -> { v -> String.format("%.2f", v) }
            ExtraMetricType.NETWORK -> { v -> formatBytes(v) }
            ExtraMetricType.DISK -> { v -> String.format("%.0f ops", v) }
            ExtraMetricType.BATTERY -> { v -> String.format("%.0f%%", v) }
        }

        val min = data.minOrNull()
        val max = data.maxOrNull()
        val avg = if (data.isNotEmpty()) data.sum() / data.size else null
        val latest = data.lastOrNull()
        val selectedIndex = remember { mutableStateOf<Int?>(null) }
        val cursorValue = selectedIndex.value?.let { idx -> data.getOrNull(idx) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(text = title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

            if (data.size >= 2) {
                // Compact stats row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val leftParts = buildList {
                        min?.let { add("Min: ${unitFormatter(it)}") }
                        avg?.let { add("Avg: ${unitFormatter(it)}") }
                    }
                    if (leftParts.isNotEmpty()) {
                        Text(
                            text = leftParts.joinToString("   "),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                SmoothLineGraph(
                    data = data,
                    graphColor = accent,
                    enableScrub = true,
                    selectedIndex = selectedIndex.value,
                    onSelectedIndexChange = { selectedIndex.value = it },
                    labelFormatter = unitFormatter
                )

                Text(
                    text = "Oldest \u2192 Latest",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    text = stringResource(R.string.beszel_background_update_info),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResourceMetricDetailsSheet(
    title: String,
    data: List<Double>,
    accent: Color,
    unitFormatter: (Double) -> String,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val selectedIndex = remember { mutableStateOf<Int?>(null) }
    val cursorValue = selectedIndex.value?.let { idx -> data.getOrNull(idx) }
    val min = data.minOrNull()
    val avg = if (data.isNotEmpty()) data.sum() / data.size else null

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(text = title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

            if (data.size >= 2) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val leftParts = buildList {
                        min?.let { add("Min: ${unitFormatter(it)}") }
                        avg?.let { add("Avg: ${unitFormatter(it)}") }
                    }
                    if (leftParts.isNotEmpty()) {
                        Text(
                            text = leftParts.joinToString("   "),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                SmoothLineGraph(
                    data = data,
                    graphColor = accent,
                    enableScrub = true,
                    selectedIndex = selectedIndex.value,
                    onSelectedIndexChange = { selectedIndex.value = it },
                    labelFormatter = unitFormatter
                )

                Text(
                    text = "Oldest \u2192 Latest",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    text = stringResource(R.string.beszel_background_update_info),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DiskDetailsSheet(
    latest: BeszelRecordStats?,
    history: List<BeszelRecordStats>,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val data = history.map { it.dpValue }
    val selectedIndex = remember { mutableStateOf<Int?>(null) }
    val unitFormatter: (Double) -> String = { v -> String.format("%.1f%%", v) }

    val drives = latest?.efs?.entries.orEmpty()

    // System/root disk (usually SSD)
    val ssdUsed = latest?.dValue?.takeIf { it > 0.0 } ?: 0.0
    val ssdTotal = latest?.dtValue?.takeIf { it > 0.0 } ?: 0.0
    val ssdHasData = ssdTotal > 0.0

    // Other drives (HDDs etc.)
    val drivesUsed = drives.mapNotNull { it.value.du }.sum()
    val drivesTotal = drives.mapNotNull { it.value.d }.sum()

    val allUsed = ssdUsed + drivesUsed
    val allTotal = ssdTotal + drivesTotal
    val allPct = if (allTotal > 0.0) allUsed / allTotal * 100.0 else null
    val allFree = if (allTotal > 0.0) (allTotal - allUsed).coerceAtLeast(0.0) else null

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = stringResource(R.string.beszel_disk),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            // All drives summary (graph matches this)
            if (allTotal > 0.0 && allPct != null) {
                Text(
                    text = "All drives: ${formatGB(allUsed)} / ${formatGB(allTotal)}  (${unitFormatter(allPct)})",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                allFree?.let {
                    Text(
                        text = "Free: ${formatGB(it)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // System disk (SSD) detail, if available
            if (ssdHasData) {
                val ssdPct = if (ssdTotal > 0.0) ssdUsed / ssdTotal * 100.0 else null
                val systemLine = buildString {
                    append("System: ${formatGB(ssdUsed)} / ${formatGB(ssdTotal)}")
                    ssdPct?.let { value ->
                        val pctText = String.format(Locale.getDefault(), "%.1f%%", value)
                        append("  ($pctText)")
                    }
                }
                Text(
                    text = systemLine,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (drives.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    drives.forEach { (name, fs) ->
                        val totalDrive = fs.d ?: 0.0
                        val usedDrive = fs.du ?: 0.0
                        val pct = if (totalDrive > 0.0) (usedDrive / totalDrive * 100.0) else null
                        val line = buildString {
                            append("$name: ${formatGB(usedDrive)} / ${formatGB(totalDrive)}")
                            pct?.let { value ->
                                val pctText = String.format(Locale.getDefault(), "%.1f%%", value)
                                append("  ($pctText)")
                            }
                        }
                        Text(
                            text = line,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            if (data.size >= 2) {
                SmoothLineGraph(
                    data = data,
                    graphColor = StatusOrange,
                    enableScrub = true,
                    selectedIndex = selectedIndex.value,
                    onSelectedIndexChange = { selectedIndex.value = it },
                    labelFormatter = unitFormatter
                )

                Text(
                    text = "Oldest \u2192 Latest",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    text = stringResource(R.string.beszel_background_update_info),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun BeszelHeaderCard(system: BeszelSystem) {
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
                Text("${system.host}:${system.portValue ?: 80}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Surface(
                shape = RoundedCornerShape(14.dp),
                color = statusColor.copy(alpha = 0.1f)
            ) {
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
private fun SystemInfoSection(info: BeszelSystemInfo?, details: BeszelSystemDetails?) {
    if (info == null && details == null) return

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
        SectionHeader(icon = Icons.Default.Info, title = stringResource(R.string.beszel_info_title))
        
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                osText?.let {
                    if (it.isNotEmpty()) InfoRow(stringResource(R.string.beszel_os), it)
                }
                kernelText?.let {
                    if (it.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                        InfoRow(stringResource(R.string.beszel_kernel), it)
                    }
                }
                hostnameText?.let {
                    if (it.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                        InfoRow(stringResource(R.string.beszel_hostname), it)
                    }
                }
                cpuText?.let {
                    if (it.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                        InfoRow(stringResource(R.string.beszel_cpu), it)
                    }
                }
                coresValue?.let {
                    if (it > 0) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                        InfoRow(stringResource(R.string.beszel_cores), "$it")
                    }
                }
                memoryDisplay?.let {
                    if (it.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                        InfoRow(stringResource(R.string.beszel_memory), it)
                    }
                }
                details?.podman?.let {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
                    InfoRow(stringResource(R.string.beszel_podman), if (it) "true" else "false")
                }
            }
        }
    }
}

@Composable
private fun ResourcesSection(
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
private fun ExtraMetricsSection(
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
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Row 1: Temp + Load (or single)
                if (hasTemp || hasLoad) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
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
                // Row 2: Net + Disk (or single)
                if (hasNet || hasDisk) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (hasNet) {
                            val rx = latest.netRxBytes ?: 0.0
                            val tx = latest.netTxBytes ?: 0.0
                            ExtraMetricChip(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.NetworkCheck,
                                accentColor = StatusPurple,
                                label = stringResource(R.string.beszel_network_io),
                                value = "↓ ${formatBytes(rx)}  ↑ ${formatBytes(tx)}",
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
                // Row 3: Battery (full width)
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
private fun ExtraMetricChip(
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
                    haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
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
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
                            .fillMaxHeight()
                            .fillMaxWidth((progress.coerceIn(0.0, 1.0)).toFloat())
                            .background(accentColor, RoundedCornerShape(2.dp))
                    )
                }
            }
        }
    }
}

@Composable
private fun ResourceCard(
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
                Text(String.format("%.1f%%", percent), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = progressColor)
            }

            // Progress Bar
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
                        .fillMaxHeight()
                        .fillMaxWidth(animatedProgress)
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
private fun SmoothLineGraph(
    data: List<Double>,
    graphColor: Color,
    enableScrub: Boolean = false,
    selectedIndex: Int? = null,
    onSelectedIndexChange: ((Int?) -> Unit)? = null,
    labelFormatter: ((Double) -> String)? = null
) {
    if (data.size < 2) return
    
    val maxVal = (data.maxOrNull() ?: 1.0).coerceAtLeast(1.0)
    val minVal = (data.minOrNull() ?: 0.0).coerceAtMost(maxVal - 0.1) // Ensure small gap
    val range = (maxVal - minVal).coerceAtLeast(0.1) // Prevent division by zero when stats are stagnant
    
    // Scale up animation
    val animationProgress by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "graph_appear"
    )

    val haptic = LocalHapticFeedback.current

    Column(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
        Spacer(modifier = Modifier.height(16.dp))
        
        androidx.compose.foundation.Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .pointerInput(enableScrub, data.size) {
                    if (!enableScrub || onSelectedIndexChange == null || data.isEmpty()) return@pointerInput
                    var lastIndex: Int? = null
                    detectDragGestures(
                        onDragStart = { offset ->
                            val widthPx = size.width.toFloat().coerceAtLeast(1f)
                            val fraction = (offset.x / widthPx).coerceIn(0f, 1f)
                            val idx = ((fraction * (data.size - 1)).roundToInt()).coerceIn(0, data.size - 1)
                            if (idx != lastIndex) {
                                lastIndex = idx
                                onSelectedIndexChange(idx)
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            }
                        },
                        onDrag = { change, _ ->
                            val widthPx = size.width.toFloat().coerceAtLeast(1f)
                            val fraction = (change.position.x / widthPx).coerceIn(0f, 1f)
                            val idx = ((fraction * (data.size - 1)).roundToInt()).coerceIn(0, data.size - 1)
                            if (idx != lastIndex) {
                                lastIndex = idx
                                onSelectedIndexChange(idx)
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            }
                        },
                        onDragEnd = { },
                        onDragCancel = { }
                    )
                }
        ) {
            val width = size.width
            val height = size.height
            val stepX = width / (data.size - 1).coerceAtLeast(1)

            val path = androidx.compose.ui.graphics.Path()
            val fillPath = androidx.compose.ui.graphics.Path()

            var previousX = 0f
            var previousY = height - ((data.first() - minVal) / range * height).toFloat() * animationProgress

            path.moveTo(previousX, previousY)
            fillPath.moveTo(0f, height)
            fillPath.lineTo(0f, previousY)

            for (i in 1 until data.size) {
                val x = i * stepX
                val y = height - ((data[i] - minVal) / range * height).toFloat() * animationProgress

                val controlX1 = previousX + (x - previousX) / 2f
                val controlY1 = previousY
                val controlX2 = previousX + (x - previousX) / 2f
                val controlY2 = y

                path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y)
                fillPath.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y)

                previousX = x
                previousY = y
            }

            fillPath.lineTo(width, height)
            fillPath.close()

            // Draw Area
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(graphColor.copy(alpha = 0.4f), Color.Transparent),
                    startY = 0f,
                    endY = height
                )
            )

            // Draw Line
            drawPath(
                path = path,
                color = graphColor,
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = 2.dp.toPx(),
                    cap = androidx.compose.ui.graphics.StrokeCap.Round,
                    join = androidx.compose.ui.graphics.StrokeJoin.Round
                )
            )

            if (enableScrub && selectedIndex != null && selectedIndex in data.indices) {
                val idx = selectedIndex.coerceIn(0, data.size - 1)
                val x = idx * stepX
                val y = height - ((data[idx] - minVal) / range * height).toFloat() * animationProgress

                drawLine(
                    color = Color.White.copy(alpha = 0.5f),
                    start = androidx.compose.ui.geometry.Offset(x, 0f),
                    end = androidx.compose.ui.geometry.Offset(x, height),
                    strokeWidth = 1.dp.toPx()
                )

                drawCircle(
                    color = graphColor,
                    radius = 3.dp.toPx(),
                    center = androidx.compose.ui.geometry.Offset(x, y)
                )

                labelFormatter?.let { format ->
                    val text = format(data[idx])
                    val textSizePx = 14.sp.toPx()
                    val paddingX = 6.dp.toPx()
                    val paddingY = 4.dp.toPx()

                    val paint = Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.WHITE
                        textSize = textSizePx
                    }

                    val textWidth = paint.measureText(text)
                    val boxWidth = textWidth + paddingX * 2
                    val boxHeight = textSizePx + paddingY * 2

                    val rawX = x - boxWidth / 2f
                    val rawY = y - 32.dp.toPx() - boxHeight
                    val boxLeft = rawX.coerceIn(0f, width - boxWidth)
                    val boxTop = rawY.coerceAtLeast(4.dp.toPx())
                    val boxRight = boxLeft + boxWidth
                    val boxBottom = boxTop + boxHeight

                    // Background pill
                    drawRoundRect(
                        color = Color.Black.copy(alpha = 0.7f),
                        topLeft = androidx.compose.ui.geometry.Offset(boxLeft, boxTop),
                        size = androidx.compose.ui.geometry.Size(boxWidth, boxHeight),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx(), 8.dp.toPx())
                    )

                    // Text
                    val textX = boxLeft + paddingX
                    val textY = boxTop + paddingY + textSizePx * 0.85f
                    drawContext.canvas.nativeCanvas.drawText(text, textX, textY, paint)
                }
            }
        }
    }
}



@Composable
private fun ContainersSection(containers: List<BeszelContainer>) {
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
                                Icon(Icons.Default.Inventory2, contentDescription = null, tint = ServiceType.BESZEL.primaryColor, modifier = Modifier.size(16.dp))
                            }
                        }

                        Text(container.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))

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
private fun ContainerStat(icon: ImageVector, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
    }
}

@Composable
private fun UptimeCard(seconds: Double) {
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
                Text(formatUptimeHours(seconds), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun SectionHeader(icon: ImageVector, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, contentDescription = null, tint = ServiceType.BESZEL.primaryColor, modifier = Modifier.size(16.dp))
        Text(title, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
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

// --- Formatters ---

private fun formatMB(valMB: Double): String {
    if (valMB == 0.0) return "0 MB"
    if (valMB > 10_000_000) return formatBytes(valMB)
    val gb = valMB / 1024.0
    if (gb >= 1.0) return String.format("%.2f GB", gb)
    return String.format("%.0f MB", valMB)
}

private fun formatGB(valGB: Double): String {
    if (valGB == 0.0) return "0 GB"
    if (valGB > 10_000_000) return formatBytes(valGB)
    if (valGB >= 1000.0) return String.format("%.2f TB", valGB / 1000.0)
    if (valGB >= 1.0) return String.format("%.1f GB", valGB)
    return String.format("%.0f MB", valGB * 1024)
}

private fun formatBytes(bytes: Double): String {
    if (bytes <= 0) return "0 B"
    val units = arrayOf("B", "KB", "MB", "GB", "TB")
    val digitGroups = (Math.log10(bytes) / Math.log10(1024.0)).toInt()
    return String.format("%.1f %s", bytes / Math.pow(1024.0, digitGroups.toDouble()), units[digitGroups])
}

private fun formatNetRate(valBytesPerSec: Double): String {
    if (valBytesPerSec == 0.0) return "0 B/s"
    return "${formatBytes(valBytesPerSec)}/s"
}

private fun formatUptimeHours(seconds: Double): String {
    val d = (seconds / 86400).toInt()
    val h = (seconds % 86400 / 3600).toInt()
    if (d > 0) return "${d}d ${h}h"
    val m = (seconds % 3600 / 60).toInt()
    if (h > 0) return "${h}h ${m}m"
    return "${m}m"
}

