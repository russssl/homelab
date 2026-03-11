package com.homelab.app.data.remote

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import com.homelab.app.data.local.SettingsManager
import com.homelab.app.data.repository.ServiceInstancesRepository
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmartFallbackInterceptor @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val settingsManager: SettingsManager,
    private val serviceInstancesRepository: ServiceInstancesRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()

        val instanceIdHeader = request.header("X-Homelab-Instance-Id")
        val bypassHeader = request.header("X-Homelab-Bypass")

        if (bypassHeader == "true" || instanceIdHeader.isNullOrBlank()) {
            return chain.proceed(request)
        }

        val connection = runBlocking { serviceInstancesRepository.getInstance(instanceIdHeader) }
            ?: return chain.proceed(request)

        val configuredSsid = runBlocking { settingsManager.internalSsid.first() }
        val isConnectedToHomeWifi = isHomeWifi(configuredSsid)

        // 3. Logica di Routing Primaria (Internal vs External)
        val primaryUrl = connection.url
        val fallbackUrl = connection.fallbackUrl

        val targetHost = if (isConnectedToHomeWifi || fallbackUrl == null) primaryUrl.toHttpUrlOrNull() else fallbackUrl.toHttpUrlOrNull()

        if (targetHost != null) {
            val newUrl = request.url.newBuilder()
                .scheme(targetHost.scheme)
                .host(targetHost.host)
                .port(targetHost.port)
                .build()

            request = request.newBuilder()
                .url(newUrl)
                .build()
        }

        try {
            var response = chain.proceed(request)
            
            // 4. Fallback in caso di fallimento su rete locale
            if (!response.isSuccessful && response.code in 500..504 && isConnectedToHomeWifi && fallbackUrl != null) {
                val fbHost = fallbackUrl.toHttpUrlOrNull()
                if (fbHost != null) {
                    val fbUrl = request.url.newBuilder()
                        .scheme(fbHost.scheme)
                        .host(fbHost.host)
                        .port(fbHost.port)
                        .build()
                        
                    val fallbackRequest = request.newBuilder().url(fbUrl).build()
                    response.close()
                    response = chain.proceed(fallbackRequest)
                }
            }
            return response
            
        } catch (e: IOException) {
            if (isConnectedToHomeWifi && fallbackUrl != null) {
                val fbHost = fallbackUrl.toHttpUrlOrNull()
                if (fbHost != null) {
                    val fbUrl = request.url.newBuilder()
                        .scheme(fbHost.scheme)
                        .host(fbHost.host)
                        .port(fbHost.port)
                        .build()
                        
                    val fallbackRequest = request.newBuilder().url(fbUrl).build()
                    return chain.proceed(fallbackRequest)
                }
            }
            throw e
        }
    }

    private fun isHomeWifi(configuredSsid: String?): Boolean {
        if (configuredSsid.isNullOrBlank()) return false
        
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            val info = capabilities.transportInfo as? android.net.wifi.WifiInfo
            val currentSsid = info?.ssid?.replace("\"", "")
            return currentSsid == configuredSsid
        }
        return false
    }
}
