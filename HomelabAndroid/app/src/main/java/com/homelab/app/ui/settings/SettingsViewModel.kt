package com.homelab.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.homelab.app.data.repository.LanguageMode
import com.homelab.app.data.repository.LocalPreferencesRepository
import com.homelab.app.data.repository.ServicesRepository
import com.homelab.app.data.repository.ThemeMode
import com.homelab.app.domain.model.ServiceInstance
import com.homelab.app.util.ServiceType
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val servicesRepository: ServicesRepository,
    private val localPreferencesRepository: LocalPreferencesRepository
) : ViewModel() {

    val instancesByType: StateFlow<Map<ServiceType, List<ServiceInstance>>> = servicesRepository.instancesByType
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val preferredInstanceIdByType: StateFlow<Map<ServiceType, String?>> = servicesRepository.preferredInstanceIdByType
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val themeMode: StateFlow<ThemeMode> = localPreferencesRepository.themeMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ThemeMode.SYSTEM)

    val languageMode: StateFlow<LanguageMode> = localPreferencesRepository.languageMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LanguageMode.ENGLISH)

    val hiddenServices: StateFlow<Set<String>> = localPreferencesRepository.hiddenServices
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    val serviceOrder: StateFlow<List<ServiceType>> = localPreferencesRepository.serviceOrder
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            ServiceType.entries.filter { it != ServiceType.UNKNOWN }
        )

    val biometricEnabled: StateFlow<Boolean> = localPreferencesRepository.biometricEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val isPinSet: StateFlow<Boolean> = localPreferencesRepository.appPin
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
        .let { flow ->
            kotlinx.coroutines.flow.combine(flow, kotlinx.coroutines.flow.flowOf(Unit)) { pin, _ -> pin != null }
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
        }

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch {
            localPreferencesRepository.setThemeMode(mode)
        }
    }

    fun setLanguageMode(mode: LanguageMode) {
        viewModelScope.launch {
            localPreferencesRepository.setLanguageMode(mode)
            androidx.appcompat.app.AppCompatDelegate.setApplicationLocales(
                androidx.core.os.LocaleListCompat.forLanguageTags(mode.code)
            )
        }
    }

    fun toggleServiceVisibility(type: ServiceType) {
        viewModelScope.launch {
            localPreferencesRepository.toggleServiceVisibility(type.name)
        }
    }

    fun moveService(type: ServiceType, offset: Int) {
        viewModelScope.launch {
            localPreferencesRepository.moveService(type, offset)
        }
    }

    fun deleteInstance(instanceId: String) {
        viewModelScope.launch {
            servicesRepository.disconnectInstance(instanceId)
        }
    }

    fun setPreferredInstance(type: ServiceType, instanceId: String) {
        viewModelScope.launch {
            servicesRepository.setPreferredInstance(type, instanceId)
        }
    }

    fun setBiometricEnabled(enabled: Boolean) {
        viewModelScope.launch {
            localPreferencesRepository.setBiometricEnabled(enabled)
        }
    }

    fun savePin(pin: String) {
        viewModelScope.launch {
            localPreferencesRepository.savePin(pin)
        }
    }

    fun verifyPin(pin: String): Boolean {
        val currentPin = kotlinx.coroutines.runBlocking {
            localPreferencesRepository.appPin.firstOrNull()
        }
        return currentPin == pin
    }

    fun clearSecurity() {
        viewModelScope.launch {
            localPreferencesRepository.clearSecurity()
        }
    }
}
