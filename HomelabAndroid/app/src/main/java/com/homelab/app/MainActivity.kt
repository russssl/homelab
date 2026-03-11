package com.homelab.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import com.homelab.app.ui.theme.HomelabTheme
import com.homelab.app.ui.navigation.AppNavigation
import com.homelab.app.ui.security.LockScreen
import com.homelab.app.ui.security.PinSetupScreen
import com.homelab.app.ui.security.SecurityViewModel
import com.homelab.app.util.NotificationHelper
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

import javax.inject.Inject
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import com.homelab.app.data.repository.LocalPreferencesRepository
import com.homelab.app.data.repository.ThemeMode
import com.homelab.app.data.repository.ServicesRepository

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var preferencesRepository: LocalPreferencesRepository

    @Inject
    lateinit var servicesRepository: ServicesRepository

    private var isUnlocked by mutableStateOf(false)
    private var needsSetup by mutableStateOf(true)
    private var servicesReady by mutableStateOf(false)
    private var lastBackgroundTime: Long = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !servicesReady }
        super.onCreate(savedInstanceState)

        lifecycleScope.launch {
            val languageMode = preferencesRepository.languageMode.first()
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(languageMode.code))
            servicesRepository.initialize()

            val hasCompletedOnboarding = preferencesRepository.hasCompletedOnboarding.first()
            needsSetup = !hasCompletedOnboarding
            if (needsSetup) isUnlocked = false
            servicesReady = true
        }

        enableEdgeToEdge()

        NotificationHelper.createChannels(this)

        setContent {
            val themeMode by preferencesRepository.themeMode.collectAsState(initial = ThemeMode.SYSTEM)
            val biometricEnabled by preferencesRepository.biometricEnabled.collectAsState(initial = false)
            val isPinSet by preferencesRepository.appPin.collectAsState(initial = null)

            val darkTheme = when (themeMode) {
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
            }

            SideEffect {
                val controller = WindowCompat.getInsetsController(window, window.decorView)
                controller.isAppearanceLightStatusBars = !darkTheme
                controller.isAppearanceLightNavigationBars = !darkTheme
            }

            val securityVm = ViewModelProvider(this)[SecurityViewModel::class.java]

            HomelabTheme(darkTheme = darkTheme) {
                when {
                    !servicesReady -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    needsSetup -> {
                        PinSetupScreen(
                            onComplete = {
                                lifecycleScope.launch {
                                    preferencesRepository.setOnboardingCompleted(true)
                                    needsSetup = false
                                    isUnlocked = true
                                }
                            },
                            onSavePin = { pin ->
                                securityVm.savePin(pin)
                            },
                            onEnableBiometric = { enabled ->
                                securityVm.setBiometricEnabled(enabled)
                            }
                        )
                    }
                    isPinSet != null && !isUnlocked -> {
                        LockScreen(
                            biometricEnabled = biometricEnabled,
                            onUnlock = { isUnlocked = true },
                            onVerifyPin = { pin -> securityVm.verifyPin(pin) }
                        )
                    }
                    else -> {
                        AppNavigation()
                    }
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        lastBackgroundTime = System.currentTimeMillis()
    }

    override fun onStart() {
        super.onStart()
        if (lastBackgroundTime > 0L) {
            val elapsed = System.currentTimeMillis() - lastBackgroundTime
            val gracePeriodMs = 60_000L // 1 minute
            if (elapsed > gracePeriodMs) {
                lifecycleScope.launch {
                    val pin = preferencesRepository.appPin.first()
                    if (pin != null) {
                        isUnlocked = false
                    }
                }
            }
            lastBackgroundTime = 0L
        }
    }

    override fun onResume() {
        super.onResume()
        // Force refresh Tailscale status on app resume for instant UI updates
        val securityVm = ViewModelProvider(this)[SecurityViewModel::class.java]
        securityVm.checkTailscale()

        // Refresh all services reachability on app resume
        lifecycleScope.launch {
            servicesRepository.checkAllReachability()
        }
    }
}
