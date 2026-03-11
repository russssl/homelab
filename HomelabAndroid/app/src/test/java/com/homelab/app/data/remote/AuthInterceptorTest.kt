package com.homelab.app.data.remote

import com.homelab.app.data.repository.ServiceInstancesRepository
import com.homelab.app.domain.model.ServiceInstance
import com.homelab.app.util.GlobalEventBus
import com.homelab.app.util.ServiceType
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthInterceptorTest {

    @Test
    fun `resolves auth from instance id instead of service header`() {
        val eventBus = mockk<GlobalEventBus>(relaxed = true)
        val instancesRepository = mockk<ServiceInstancesRepository>()
        val interceptor = AuthInterceptor(eventBus, instancesRepository)
        val chain = mockk<Interceptor.Chain>()
        val capturedRequest = slot<Request>()
        val request = Request.Builder()
            .url("https://example.com/api/endpoints")
            .header("X-Homelab-Service", "Gitea")
            .header("X-Homelab-Instance-Id", "instance-1")
            .build()

        coEvery { instancesRepository.getInstance("instance-1") } returns ServiceInstance(
            id = "instance-1",
            type = ServiceType.PORTAINER,
            label = "Portainer Lab",
            url = "https://portainer.local",
            apiKey = "real-api-key"
        )
        every { chain.request() } returns request
        every { chain.proceed(capture(capturedRequest)) } answers {
            response(capturedRequest.captured, 200)
        }

        interceptor.intercept(chain)

        assertEquals("real-api-key", capturedRequest.captured.header("X-API-Key"))
        assertNull(capturedRequest.captured.header("Authorization"))
        assertNull(capturedRequest.captured.header("X-Homelab-Service"))
        assertNull(capturedRequest.captured.header("X-Homelab-Instance-Id"))
    }

    @Test
    fun `resolves auth even when service header is missing`() {
        val eventBus = mockk<GlobalEventBus>(relaxed = true)
        val instancesRepository = mockk<ServiceInstancesRepository>()
        val interceptor = AuthInterceptor(eventBus, instancesRepository)
        val chain = mockk<Interceptor.Chain>()
        val capturedRequest = slot<Request>()
        val request = Request.Builder()
            .url("https://example.com/api/endpoints")
            .header("X-Homelab-Instance-Id", "instance-3")
            .build()

        coEvery { instancesRepository.getInstance("instance-3") } returns ServiceInstance(
            id = "instance-3",
            type = ServiceType.PORTAINER,
            label = "Portainer Office",
            url = "https://portainer-office.local",
            apiKey = "office-api-key"
        )
        every { chain.request() } returns request
        every { chain.proceed(capture(capturedRequest)) } answers {
            response(capturedRequest.captured, 200)
        }

        interceptor.intercept(chain)

        assertEquals("office-api-key", capturedRequest.captured.header("X-API-Key"))
        assertNull(capturedRequest.captured.header("Authorization"))
    }

    @Test
    fun `401 emits auth error for affected instance only`() {
        val eventBus = mockk<GlobalEventBus>(relaxed = true)
        val instancesRepository = mockk<ServiceInstancesRepository>()
        val interceptor = AuthInterceptor(eventBus, instancesRepository)
        val chain = mockk<Interceptor.Chain>()
        val request = Request.Builder()
            .url("https://example.com/api/v1/user")
            .header("X-Homelab-Service", "Gitea")
            .header("X-Homelab-Instance-Id", "instance-2")
            .build()

        coEvery { instancesRepository.getInstance("instance-2") } returns ServiceInstance(
            id = "instance-2",
            type = ServiceType.GITEA,
            label = "Main",
            url = "https://gitea.local",
            token = "token-1"
        )
        every { chain.request() } returns request
        every { chain.proceed(any()) } answers {
            response(invocation.args[0] as Request, 401)
        }

        interceptor.intercept(chain)

        verify { eventBus.emitAuthError("instance-2") }
    }

    private fun response(request: Request, code: Int): Response {
        return Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(code)
            .message(if (code == 200) "OK" else "Unauthorized")
            .body("{}".toResponseBody("application/json".toMediaType()))
            .build()
    }
}
