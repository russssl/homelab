package com.homelab.app.ui.portainer

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.homelab.app.data.remote.dto.portainer.PortainerContainer
import com.homelab.app.data.remote.dto.portainer.PortainerEndpoint
import com.homelab.app.data.repository.PortainerRepository
import com.homelab.app.data.repository.ServicesRepository
import com.homelab.app.domain.model.ServiceInstance
import com.homelab.app.util.ErrorHandler
import com.homelab.app.util.Logger
import com.homelab.app.util.ServiceType
import com.homelab.app.util.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class PortainerViewModel @Inject constructor(
    private val repository: PortainerRepository,
    private val servicesRepository: ServicesRepository,
    savedStateHandle: SavedStateHandle,
    @param:ApplicationContext private val context: Context
) : ViewModel() {

    val instanceId: String = checkNotNull(savedStateHandle["instanceId"])

    private val _uiState = MutableStateFlow<UiState<Unit>>(UiState.Loading)
    val uiState: StateFlow<UiState<Unit>> = _uiState

    private val _endpoints = MutableStateFlow<List<PortainerEndpoint>>(emptyList())
    val endpoints: StateFlow<List<PortainerEndpoint>> = _endpoints

    private val _selectedEndpoint = MutableStateFlow<PortainerEndpoint?>(null)
    val selectedEndpoint: StateFlow<PortainerEndpoint?> = _selectedEndpoint

    private val _containers = MutableStateFlow<List<PortainerContainer>>(emptyList())
    val containers: StateFlow<List<PortainerContainer>> = _containers

    val instances: StateFlow<List<ServiceInstance>> = servicesRepository.instancesByType
        .map { it[ServiceType.PORTAINER].orEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        _uiState.onEach { Logger.stateTransition("PortainerViewModel", "uiState", it) }.launchIn(viewModelScope)
    }

    fun fetchAll() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            try {
                val endpoints = repository.getEndpoints(instanceId)
                _endpoints.value = endpoints
                if (_selectedEndpoint.value == null || endpoints.none { it.id == _selectedEndpoint.value?.id }) {
                    _selectedEndpoint.value = endpoints.firstOrNull()
                }
                fetchContainers()
                _uiState.value = UiState.Success(Unit)
            } catch (error: Exception) {
                val message = ErrorHandler.getMessage(context, error)
                _uiState.value = UiState.Error(message, retryAction = { fetchAll() })
            }
        }
    }

    fun selectEndpoint(endpoint: PortainerEndpoint) {
        _selectedEndpoint.value = endpoint
        viewModelScope.launch {
            fetchContainers()
        }
    }

    fun setPreferredInstance(newInstanceId: String) {
        viewModelScope.launch {
            servicesRepository.setPreferredInstance(ServiceType.PORTAINER, newInstanceId)
        }
    }

    private suspend fun fetchContainers() {
        val endpoint = _selectedEndpoint.value ?: return
        try {
            _containers.value = repository.getContainers(instanceId, endpoint.id)
        } catch (error: Exception) {
            if (_containers.value.isEmpty()) {
                val message = ErrorHandler.getMessage(context, error)
                _uiState.value = UiState.Error(message, retryAction = { fetchAll() })
            }
        }
    }
}
