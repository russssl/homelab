package com.homelab.app.ui.beszel

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.homelab.app.data.remote.dto.beszel.BeszelSystem
import com.homelab.app.data.remote.dto.beszel.BeszelSystemRecord
import com.homelab.app.data.repository.BeszelRepository
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
class BeszelViewModel @Inject constructor(
    private val repository: BeszelRepository,
    private val servicesRepository: ServicesRepository,
    savedStateHandle: SavedStateHandle,
    @param:ApplicationContext private val context: Context
) : ViewModel() {

    val instanceId: String = checkNotNull(savedStateHandle["instanceId"])

    private val _systemsState = MutableStateFlow<UiState<List<BeszelSystem>>>(UiState.Loading)
    val systemsState: StateFlow<UiState<List<BeszelSystem>>> = _systemsState

    private val _systemDetailState = MutableStateFlow<UiState<BeszelSystem>>(UiState.Loading)
    val systemDetailState: StateFlow<UiState<BeszelSystem>> = _systemDetailState

    private val _records = MutableStateFlow<List<BeszelSystemRecord>>(emptyList())
    val records: StateFlow<List<BeszelSystemRecord>> = _records

    val instances: StateFlow<List<ServiceInstance>> = servicesRepository.instancesByType
        .map { it[ServiceType.BESZEL].orEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        _systemsState.onEach { Logger.stateTransition("BeszelViewModel", "systemsState", it) }.launchIn(viewModelScope)
        _systemDetailState.onEach { Logger.stateTransition("BeszelViewModel", "systemDetailState", it) }.launchIn(viewModelScope)
    }

    fun fetchSystems() {
        viewModelScope.launch {
            _systemsState.value = UiState.Loading
            try {
                _systemsState.value = UiState.Success(repository.getSystems(instanceId))
            } catch (error: Exception) {
                val message = ErrorHandler.getMessage(context, error)
                _systemsState.value = UiState.Error(message, retryAction = { fetchSystems() })
            }
        }
    }

    fun fetchSystemDetail(systemId: String) {
        viewModelScope.launch {
            _systemDetailState.value = UiState.Loading
            try {
                _systemDetailState.value = UiState.Success(repository.getSystem(instanceId, systemId))
                try {
                    _records.value = repository
                        .getSystemRecords(instanceId, systemId, limit = 60)
                        .sortedBy { it.created }
                } catch (_: Exception) {
                }
            } catch (error: Exception) {
                val message = ErrorHandler.getMessage(context, error)
                _systemDetailState.value = UiState.Error(message, retryAction = { fetchSystemDetail(systemId) })
            }
        }
    }

    fun setPreferredInstance(newInstanceId: String) {
        viewModelScope.launch {
            servicesRepository.setPreferredInstance(ServiceType.BESZEL, newInstanceId)
        }
    }
}
