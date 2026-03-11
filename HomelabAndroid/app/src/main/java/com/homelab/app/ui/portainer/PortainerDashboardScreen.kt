package com.homelab.app.ui.portainer

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.homelab.app.R
import com.homelab.app.data.remote.dto.portainer.PortainerEndpoint
import com.homelab.app.data.remote.dto.portainer.DockerSnapshotRaw
import com.homelab.app.ui.components.M3ExpressiveButtonCard
import com.homelab.app.ui.components.ServiceInstancePicker
import com.homelab.app.ui.theme.primaryColor
import com.homelab.app.util.ServiceType
import com.homelab.app.util.UiState
import com.homelab.app.ui.common.ErrorScreen
import com.homelab.app.util.ResourceFormatters
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PortainerDashboardScreen(
    onNavigateBack: () -> Unit,
    onNavigateToInstance: (String) -> Unit,
    onNavigateToContainers: (endpointId: Int) -> Unit,
    viewModel: PortainerViewModel = hiltViewModel()
) {
    val haptic = LocalHapticFeedback.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val instances by viewModel.instances.collectAsStateWithLifecycle()
    val endpoints by viewModel.endpoints.collectAsStateWithLifecycle()
    val selectedEndpoint by viewModel.selectedEndpoint.collectAsStateWithLifecycle()
    val containers by viewModel.containers.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.fetchAll()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.service_portainer), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onNavigateBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                actions = {
                    IconButton(onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        viewModel.fetchAll()
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.refresh))
                    }
                }
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        when (val state = uiState) {
            is UiState.Loading, is UiState.Idle -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ServiceType.PORTAINER.primaryColor)
                }
            }
            is UiState.Error -> {
                ErrorScreen(
                    message = state.message,
                    onRetry = { state.retryAction?.invoke() ?: viewModel.fetchAll() },
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is UiState.Offline -> {
                ErrorScreen(
                    message = "",
                    onRetry = { viewModel.fetchAll() },
                    isOffline = true,
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is UiState.Success -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        ServiceInstancePicker(
                            instances = instances,
                            selectedInstanceId = viewModel.instanceId,
                            onInstanceSelected = { instance ->
                                viewModel.setPreferredInstance(instance.id)
                                onNavigateToInstance(instance.id)
                            }
                        )
                    }

                    // Endpoint Picker if > 1
                    if (endpoints.size > 1) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                text = stringResource(R.string.portainer_endpoints),
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                items(endpoints) { ep ->
                                    EndpointCard(
                                        endpoint = ep,
                                        isSelected = selectedEndpoint?.id == ep.id,
                                        onClick = { viewModel.selectEndpoint(ep) }
                                    )
                                }
                            }
                        }
                    }

                    if (selectedEndpoint != null) {
                        val raw = selectedEndpoint?.snapshots?.firstOrNull()?.dockerSnapshotRaw
                        val hasInfo = (raw?.operatingSystem?.isNotBlank() == true && raw.operatingSystem != "N/A") ||
                                      (raw?.serverVersion?.isNotBlank() == true && raw.serverVersion != "N/A") ||
                                      (raw?.architecture?.isNotBlank() == true && raw.architecture != "N/A")

                        if (hasInfo) {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Text(
                                    text = stringResource(R.string.portainer_info_title),
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                ServerInfoSection(endpoint = selectedEndpoint!!, raw = raw!!)
                            }
                        }

                        val snapshot = selectedEndpoint?.snapshots?.firstOrNull()
                        val total = containers.size
                        val running = containers.count { it.state == "running" }
                        val stopped = containers.count { it.state == "exited" || it.state == "dead" }
                        val paused = containers.count { it.state == "paused" }
                        val stackCount = snapshot?.stackCount ?: 0

                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                text = stringResource(R.string.portainer_containers).uppercase(),
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(modifier = Modifier.weight(1f)) {
                                    MiniStatCard(label = stringResource(R.string.portainer_total), value = total, color = MaterialTheme.colorScheme.primary)
                                }
                                Box(modifier = Modifier.weight(1f)) {
                                    MiniStatCard(label = stringResource(R.string.portainer_running), value = running, color = Color(0xFF4CAF50))
                                }
                                Box(modifier = Modifier.weight(1f)) {
                                    MiniStatCard(label = stringResource(R.string.portainer_stopped), value = stopped, color = Color(0xFFF44336))
                                }
                                Box(modifier = Modifier.weight(1f)) {
                                    MiniStatCard(label = stringResource(R.string.portainer_stacks), value = stackCount, color = ServiceType.PORTAINER.primaryColor)
                                }
                            }
                        }

                        item(span = { GridItemSpan(maxLineSpan) }) {
                            ContainerStatusBar(total = total, running = running, paused = paused, stopped = stopped)
                        }

                        item(span = { GridItemSpan(maxLineSpan) }) {
                            M3ExpressiveButtonCard(
                                text = stringResource(R.string.portainer_all_containers),
                                icon = Icons.Default.ChevronRight,
                                color = ServiceType.PORTAINER.primaryColor,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { onNavigateToContainers(selectedEndpoint!!.id) }
                            )
                        }

                        if (snapshot != null) {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Text(
                                    text = stringResource(R.string.beszel_resources_title),
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            item { ResourceCard(icon = Icons.Default.Image, value = "${snapshot.imageCount}", label = stringResource(R.string.portainer_images), color = Color(0xFFFF9800)) }
                            item { ResourceCard(icon = Icons.Default.SdStorage, value = "${snapshot.volumeCount}", label = stringResource(R.string.portainer_volumes), color = ServiceType.PORTAINER.primaryColor) }
                            item {
                                ResourceCard(
                                    icon = Icons.Default.Memory,
                                    value = "${snapshot.totalCpu}",
                                    label = stringResource(R.string.portainer_cpu_label),
                                    color = Color(0xFF2196F3)
                                )
                            }
                            item {
                                val context = LocalContext.current
                                ResourceCard(
                                    icon = Icons.Default.Storage,
                                    value = ResourceFormatters.formatBytes(snapshot.totalMemory.toDouble(), context),
                                    label = stringResource(R.string.beszel_memory),
                                    color = Color(0xFF9C27B0)
                                )
                            }

                            if (snapshot.healthyContainerCount > 0 || snapshot.unhealthyContainerCount > 0) {
                                item(span = { GridItemSpan(maxLineSpan) }) {
                                    Text(
                                        text = stringResource(R.string.portainer_health),
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (snapshot.healthyContainerCount > 0) {
                                    item(span = { GridItemSpan(maxLineSpan) }) { MiniStatCard(label = stringResource(R.string.portainer_healthy), value = snapshot.healthyContainerCount, color = Color(0xFF4CAF50)) }
                                }
                                if (snapshot.unhealthyContainerCount > 0) {
                                    item(span = { GridItemSpan(maxLineSpan) }) { MiniStatCard(label = stringResource(R.string.portainer_unhealthy), value = snapshot.unhealthyContainerCount, color = Color(0xFFF44336)) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EndpointCard(
    endpoint: PortainerEndpoint,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessLow),
        label = "BouncyScale"
    )
    val haptic = LocalHapticFeedback.current

    Surface(
        modifier = Modifier
            .width(200.dp)
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onClick()
                }
            ),
        shape = RoundedCornerShape(16.dp),
        color = if (isSelected) ServiceType.PORTAINER.primaryColor.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surfaceContainer,
        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (endpoint.isOnline) Color(0xFF4CAF50) else Color(0xFFF44336))
                )
                Spacer(modifier = Modifier.width(8.dp))
                if (isSelected) {
                    Surface(
                        color = ServiceType.PORTAINER.primaryColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.portainer_active),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = ServiceType.PORTAINER.primaryColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = endpoint.name,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = endpoint.url,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun ServerInfoSection(endpoint: PortainerEndpoint, raw: DockerSnapshotRaw) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = ServiceType.PORTAINER.primaryColor.copy(alpha = 0.1f),
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        Icons.Default.Dns,
                        contentDescription = stringResource(R.string.portainer_info_title),
                        tint = ServiceType.PORTAINER.primaryColor,
                        modifier = Modifier.padding(12.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = endpoint.name,
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (endpoint.isOnline) Icons.Default.Wifi else Icons.Default.WifiOff,
                            contentDescription = stringResource(if (endpoint.isOnline) R.string.home_status_online else R.string.home_status_offline),
                            tint = if (endpoint.isOnline) Color(0xFF4CAF50) else Color(0xFFF44336),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(if (endpoint.isOnline) R.string.home_status_online else R.string.home_status_offline),
                            style = MaterialTheme.typography.bodySmall,
                            color = if (endpoint.isOnline) Color(0xFF4CAF50) else Color(0xFFF44336)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    val os = raw.operatingSystem?.takeIf { it.isNotBlank() && it != "N/A" } ?: stringResource(R.string.not_available)
                    val docker = raw.serverVersion?.takeIf { it.isNotBlank() && it != "N/A" } ?: stringResource(R.string.not_available)
                    val arch = raw.architecture?.takeIf { it.isNotBlank() && it != "N/A" } ?: stringResource(R.string.not_available)
                    
                    val snapshot = endpoint.snapshots?.firstOrNull()
                    val cpuCores = snapshot?.totalCpu?.toString() ?: stringResource(R.string.not_available)
                    
                    InfoRow(label = stringResource(R.string.portainer_os_label), value = os)
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                    
                    InfoRow(label = stringResource(R.string.portainer_docker_label), value = docker)
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                    
                    InfoRow(label = stringResource(R.string.portainer_arch_label), value = arch)
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                    
                    InfoRow(label = stringResource(R.string.portainer_cpu_label), value = "$cpuCores ${stringResource(R.string.beszel_cores)}")
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                    
                    val context = LocalContext.current
                    InfoRow(label = stringResource(R.string.portainer_ram_label), value = snapshot?.totalMemory?.let { ResourceFormatters.formatBytes(it.toDouble(), context) } ?: stringResource(R.string.not_available))
                }
            }
        }
    }
}

// --- Formatters moved to ResourceFormatters ---

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 1)
    }
}

@Composable
private fun MiniStatCard(label: String, value: Int, color: Color) {
    Surface(
        modifier = Modifier.height(70.dp),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = "$value", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold), color = color)
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

@Composable
private fun ResourceCard(icon: androidx.compose.ui.graphics.vector.ImageVector, value: String, label: String, color: Color) {
    Surface(
        modifier = Modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = color.copy(alpha = 0.1f),
                modifier = Modifier.size(36.dp)
            ) {
                Icon(icon, contentDescription = label, tint = color, modifier = Modifier.padding(8.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = value, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ContainerStatusBar(total: Int, running: Int, paused: Int, stopped: Int) {
    if (total <= 0) return
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest,
        modifier = Modifier.fillMaxWidth().height(8.dp)
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            if (running > 0) {
                Box(modifier = Modifier.weight(running.toFloat()).fillMaxHeight().background(Color(0xFF4CAF50)))
            }
            if (paused > 0) {
                Box(modifier = Modifier.weight(paused.toFloat()).fillMaxHeight().background(Color(0xFFFF9800)))
            }
            if (stopped > 0) {
                Box(modifier = Modifier.weight(stopped.toFloat()).fillMaxHeight().background(Color(0xFFF44336)))
            }
        }
    }
}
