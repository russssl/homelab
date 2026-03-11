package com.homelab.app.data.remote

import com.homelab.app.data.repository.ServiceInstancesRepository
import com.homelab.app.util.GlobalEventBus
import com.homelab.app.domain.model.PiHoleAuthMode
import com.homelab.app.util.ServiceType
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val globalEventBus: GlobalEventBus,
    private val serviceInstancesRepository: ServiceInstancesRepository
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        
        val instanceIdHeader = request.header("X-Homelab-Instance-Id")
        val bypassHeader = request.header("X-Homelab-Bypass")

        val requestBuilder = request.newBuilder()

        // Clean up internal headers before sending to real server
        if (request.header("X-Homelab-Service") != null) {
            requestBuilder.removeHeader("X-Homelab-Service")
        }
        if (instanceIdHeader != null) {
            requestBuilder.removeHeader("X-Homelab-Instance-Id")
        }
        if (bypassHeader != null) {
            requestBuilder.removeHeader("X-Homelab-Bypass")
        }

        val instance = if (bypassHeader == "true" || instanceIdHeader.isNullOrBlank()) {
            null
        } else {
            runBlocking { serviceInstancesRepository.getInstance(instanceIdHeader) }
        }

        if (instance != null) {
            when (instance.type) {
                ServiceType.PORTAINER -> {
                    if (!instance.apiKey.isNullOrBlank()) {
                        requestBuilder.addHeader("X-API-Key", instance.apiKey)
                    } else if (instance.token.isNotBlank()) {
                        requestBuilder.addHeader("Authorization", "Bearer ${instance.token}")
                    }
                }
                ServiceType.PIHOLE -> {
                    if (instance.token.isNotBlank() && instance.piholeAuthMode != PiHoleAuthMode.LEGACY) {
                        requestBuilder.addHeader("X-FTL-SID", instance.token)
                    }
                }
                ServiceType.BESZEL -> {
                    if (instance.token.isNotBlank()) {
                        requestBuilder.addHeader("Authorization", instance.token)
                    }
                }
                ServiceType.GITEA -> {
                    if (instance.token.isNotBlank()) {
                        if (instance.token.startsWith("basic:")) {
                            val credentials = instance.token.removePrefix("basic:")
                            requestBuilder.addHeader("Authorization", "Basic $credentials")
                        } else {
                            requestBuilder.addHeader("Authorization", "token ${instance.token}")
                        }
                    }
                }
                else -> {}
            }
        }

        request = requestBuilder.build()
        val response = chain.proceed(request)

        if (response.code == 401 &&
            bypassHeader != "true" &&
            instance != null &&
            instance.type != ServiceType.PIHOLE &&
            !instanceIdHeader.isNullOrBlank()
        ) {
            globalEventBus.emitAuthError(instanceIdHeader)
        }

        return response
    }
}
