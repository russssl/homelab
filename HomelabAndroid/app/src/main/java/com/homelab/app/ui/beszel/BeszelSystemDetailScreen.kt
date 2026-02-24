package com.homelab.app.ui.beszel

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.homelab.app.R
import com.homelab.app.data.remote.dto.beszel.BeszelRecordStats
import com.homelab.app.data.remote.dto.beszel.BeszelSystemDetails
import com.homelab.app.data.remote.dto.beszel.BeszelSystemInfo
import com.homelab.app.data.remote.dto.beszel.BeszelSystemRecord
import com.homelab.app.ui.theme.StatusPurple
import com.homelab.app.ui.theme.primaryColor
import com.homelab.app.util.ServiceType

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