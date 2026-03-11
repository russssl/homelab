package com.homelab.app.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.homelab.app.domain.model.ServiceConnection
import com.homelab.app.util.ServiceType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsManager @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val json: Json
) {
    private object Keys {
        val INTERNAL_SSID = stringPreferencesKey("internal_ssid")
        val USE_BIOMETRICS = booleanPreferencesKey("use_biometrics")
        val SERVICE_INSTANCES_MIGRATED = booleanPreferencesKey("service_instances_v2_migrated")

        fun connectionKey(type: ServiceType) = stringPreferencesKey("connection_${type.name.lowercase()}")
        fun preferredInstanceKey(type: ServiceType) = stringPreferencesKey("preferred_instance_${type.name.lowercase()}")
    }

    val internalSsid: Flow<String?> = dataStore.data.map { it[Keys.INTERNAL_SSID] }
    val useBiometrics: Flow<Boolean> = dataStore.data.map { it[Keys.USE_BIOMETRICS] ?: false }
    val serviceInstancesMigrated: Flow<Boolean> = dataStore.data.map { it[Keys.SERVICE_INSTANCES_MIGRATED] ?: false }

    val preferredInstanceIds: Flow<Map<ServiceType, String?>> = dataStore.data.map { prefs ->
        ServiceType.entries
            .filter { it != ServiceType.UNKNOWN }
            .associateWith { prefs[Keys.preferredInstanceKey(it)] }
    }

    fun preferredInstanceId(type: ServiceType): Flow<String?> = dataStore.data.map { prefs ->
        prefs[Keys.preferredInstanceKey(type)]
    }

    fun legacyConnection(type: ServiceType): Flow<ServiceConnection?> = dataStore.data.map { prefs ->
        prefs[Keys.connectionKey(type)]?.let { decodeLegacyConnection(type, it) }
    }

    suspend fun getLegacyConnection(type: ServiceType): ServiceConnection? {
        val prefs = dataStore.data.first()
        return prefs[Keys.connectionKey(type)]?.let { decodeLegacyConnection(type, it) }
    }

    suspend fun removeLegacyConnection(type: ServiceType) {
        dataStore.edit { prefs ->
            prefs.remove(Keys.connectionKey(type))
        }
    }

    suspend fun setPreferredInstanceId(type: ServiceType, instanceId: String?) {
        dataStore.edit { prefs ->
            val key = Keys.preferredInstanceKey(type)
            if (instanceId.isNullOrBlank()) {
                prefs.remove(key)
            } else {
                prefs[key] = instanceId
            }
        }
    }

    suspend fun setServiceInstancesMigrated(migrated: Boolean) {
        dataStore.edit { prefs ->
            prefs[Keys.SERVICE_INSTANCES_MIGRATED] = migrated
        }
    }

    suspend fun setInternalSsid(ssid: String) {
        dataStore.edit { prefs ->
            prefs[Keys.INTERNAL_SSID] = ssid
        }
    }

    suspend fun setUseBiometrics(use: Boolean) {
        dataStore.edit { prefs ->
            prefs[Keys.USE_BIOMETRICS] = use
        }
    }

    private fun decodeLegacyConnection(type: ServiceType, jsonString: String): ServiceConnection? {
        return try {
            json.decodeFromString<ServiceConnection>(jsonString)
        } catch (error: Exception) {
            android.util.Log.e("SettingsManager", "Error decoding legacy connection for $type: ${error.message}")
            null
        }
    }
}
