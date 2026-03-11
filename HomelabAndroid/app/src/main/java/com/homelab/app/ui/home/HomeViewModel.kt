package com.homelab.app.ui.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.homelab.app.data.repository.BeszelRepository
import com.homelab.app.data.repository.GiteaRepository
import com.homelab.app.data.repository.LocalPreferencesRepository
import com.homelab.app.data.repository.PiholeRepository
import com.homelab.app.data.repository.PortainerRepository
import com.homelab.app.data.repository.ServicesRepository
import com.homelab.app.domain.model.ServiceInstance
import com.homelab.app.util.ServiceType
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val servicesRepository: ServicesRepository,
    private val portainerRepository: PortainerRepository,
    private val piholeRepository: PiholeRepository,
    private val beszelRepository: BeszelRepository,
    private val giteaRepository: GiteaRepository,
    private val localPreferencesRepository: LocalPreferencesRepository
) : ViewModel() {

    data class PortainerSummary(val running: Int, val total: Int)
    data class PiholeSummary(val totalQueries: Int)
    data class BeszelSummary(val online: Int, val total: Int)
    data class GiteaSummary(val totalRepos: Int)

    val reachability: StateFlow<Map<String, Boolean?>> = servicesRepository.reachability
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val pinging: StateFlow<Map<String, Boolean>> = servicesRepository.pinging
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val instancesByType: StateFlow<Map<ServiceType, List<ServiceInstance>>> = servicesRepository.instancesByType
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val preferredInstancesByType: StateFlow<Map<ServiceType, ServiceInstance?>> = servicesRepository.preferredInstancesByType
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val preferredInstanceIdByType: StateFlow<Map<ServiceType, String?>> = servicesRepository.preferredInstanceIdByType
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val connectionStatus: StateFlow<Map<ServiceType, Boolean>> = instancesByType
        .map { grouped -> grouped.mapValues { it.value.isNotEmpty() } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val connectedCount: StateFlow<Int> = servicesRepository.allInstances
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val isTailscaleConnected: StateFlow<Boolean> = servicesRepository.isTailscaleConnected
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val hiddenServices: StateFlow<Set<String>> = localPreferencesRepository.hiddenServices
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    val serviceOrder: StateFlow<List<ServiceType>> = localPreferencesRepository.serviceOrder
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            ServiceType.entries.filter { it != ServiceType.UNKNOWN }
        )

    private val _portainerSummary = MutableStateFlow<PortainerSummary?>(null)
    val portainerSummary: StateFlow<PortainerSummary?> = _portainerSummary

    private val _piholeSummary = MutableStateFlow<PiholeSummary?>(null)
    val piholeSummary: StateFlow<PiholeSummary?> = _piholeSummary

    private val _beszelSummary = MutableStateFlow<BeszelSummary?>(null)
    val beszelSummary: StateFlow<BeszelSummary?> = _beszelSummary

    private val _giteaSummary = MutableStateFlow<GiteaSummary?>(null)
    val giteaSummary: StateFlow<GiteaSummary?> = _giteaSummary

    private var summaryJob: Job? = null

    fun checkReachability(instanceId: String) {
        viewModelScope.launch {
            servicesRepository.checkReachability(instanceId)
        }
    }

    fun checkAllReachability() {
        viewModelScope.launch {
            servicesRepository.checkAllReachability()
        }
    }

    fun fetchSummaryData() {
        if (summaryJob?.isActive == true) return
        Log.d("HomeViewModel", "Fetching summary data...")
        val instancesMap = instancesByType.value
        val preferredIds = preferredInstanceIdByType.value
        val preferredInstances = ServiceType.entries
            .filter { it != ServiceType.UNKNOWN }
            .associateWith { type ->
                val insts = instancesMap[type].orEmpty()
                val preferredId = preferredIds[type]
                insts.firstOrNull { it.id == preferredId } ?: insts.firstOrNull()
            }

        summaryJob = viewModelScope.launch {
            try {
                val portainerInstance = preferredInstances[ServiceType.PORTAINER]
                if (portainerInstance != null) {
                    try {
                        val endpoints = portainerRepository.getEndpoints(portainerInstance.id)
                        val first = endpoints.firstOrNull()
                        _portainerSummary.value = if (first != null) {
                            val containers = portainerRepository.getContainers(portainerInstance.id, first.id)
                            val running = containers.count { it.state == "running" || it.status.contains("Up") }
                            PortainerSummary(running, containers.size)
                        } else {
                            PortainerSummary(0, 0)
                        }
                    } catch (error: Exception) {
                        Log.e("HomeViewModel", "Portainer summary error: ${error.message}")
                        _portainerSummary.value = null
                    }
                }

                val piholeInstance = preferredInstances[ServiceType.PIHOLE]
                if (piholeInstance != null) {
                    try {
                        val stats = piholeRepository.getStats(piholeInstance.id)
                        _piholeSummary.value = PiholeSummary(stats.queries.total)
                    } catch (error: Exception) {
                        Log.e("HomeViewModel", "Pihole summary error: ${error.message}")
                        _piholeSummary.value = null
                    }
                }

                val beszelInstance = preferredInstances[ServiceType.BESZEL]
                if (beszelInstance != null) {
                    try {
                        val systems = beszelRepository.getSystems(beszelInstance.id)
                        _beszelSummary.value = BeszelSummary(
                            online = systems.count { it.isOnline },
                            total = systems.size
                        )
                    } catch (error: Exception) {
                        Log.e("HomeViewModel", "Beszel summary error: ${error.message}")
                        _beszelSummary.value = null
                    }
                }

                val giteaInstance = preferredInstances[ServiceType.GITEA]
                if (giteaInstance != null) {
                    try {
                        val repos = giteaRepository.getUserRepos(giteaInstance.id, 1, 100)
                        _giteaSummary.value = GiteaSummary(repos.size)
                    } catch (error: Exception) {
                        Log.e("HomeViewModel", "Gitea summary error: ${error.message}")
                        _giteaSummary.value = null
                    }
                }
            } finally {
                summaryJob = null
            }
        }
    }

    fun moveService(serviceType: ServiceType, offset: Int) {
        viewModelScope.launch {
            localPreferencesRepository.moveService(serviceType, offset)
        }
    }
}
