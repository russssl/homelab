package com.homelab.app.util

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GlobalEventBus @Inject constructor() {
    private val _authErrors = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val authErrors = _authErrors.asSharedFlow()

    fun emitAuthError(instanceId: String) {
        _authErrors.tryEmit(instanceId)
    }
}
