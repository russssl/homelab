package com.homelab.app.ui.gitea

import android.content.Context
import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.homelab.app.R
import com.homelab.app.data.remote.dto.gitea.GiteaHeatmapItem
import com.homelab.app.data.remote.dto.gitea.GiteaOrg
import com.homelab.app.data.remote.dto.gitea.GiteaRepo
import com.homelab.app.data.remote.dto.gitea.GiteaUser
import com.homelab.app.data.repository.GiteaRepository
import com.homelab.app.data.repository.ServicesRepository
import com.homelab.app.domain.model.ServiceInstance
import com.homelab.app.util.ErrorHandler
import com.homelab.app.util.Logger
import com.homelab.app.util.ServiceType
import com.homelab.app.util.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class RepoSortOrder { RECENT, ALPHA }

@HiltViewModel
class GiteaViewModel @Inject constructor(
    private val repository: GiteaRepository,
    private val servicesRepository: ServicesRepository,
    savedStateHandle: SavedStateHandle,
    @param:ApplicationContext private val context: Context
) : ViewModel() {

    val instanceId: String = checkNotNull(savedStateHandle["instanceId"])

    private val _user = MutableStateFlow<GiteaUser?>(null)
    val user: StateFlow<GiteaUser?> = _user

    private val _repos = MutableStateFlow<List<GiteaRepo>>(emptyList())
    val repos: StateFlow<List<GiteaRepo>> = _repos

    private val _orgs = MutableStateFlow<List<GiteaOrg>>(emptyList())
    val orgs: StateFlow<List<GiteaOrg>> = _orgs

    private val _heatmap = MutableStateFlow<List<GiteaHeatmapItem>>(emptyList())
    val heatmap: StateFlow<List<GiteaHeatmapItem>> = _heatmap

    private val _totalBranches = MutableStateFlow(0)
    val totalBranches: StateFlow<Int> = _totalBranches

    private val _sortOrder = MutableStateFlow(RepoSortOrder.RECENT)
    val sortOrder: StateFlow<RepoSortOrder> = _sortOrder

    private val _uiState = MutableStateFlow<UiState<Unit>>(UiState.Loading)
    val uiState: StateFlow<UiState<Unit>> = _uiState

    val instances: StateFlow<List<ServiceInstance>> = servicesRepository.instancesByType
        .map { it[ServiceType.GITEA].orEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        _uiState.onEach { Logger.stateTransition("GiteaViewModel", "uiState", it) }.launchIn(viewModelScope)
    }

    fun fetchAll() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            try {
                kotlinx.coroutines.supervisorScope {
                    val userDeferred = async { repository.getCurrentUser(instanceId) }
                    val reposDeferred = async { repository.getUserRepos(instanceId, page = 1, limit = 30) }
                    val orgsDeferred = async { repository.getOrgs(instanceId) }

                    val user = runCatching { userDeferred.await() }.onFailure {
                        Log.e("Gitea", "Error fetching user profile", it)
                    }.getOrNull()
                    val repos = runCatching { reposDeferred.await() }.onFailure {
                        Log.e("Gitea", "Error fetching repos", it)
                    }.getOrDefault(emptyList())
                    val orgs = runCatching { orgsDeferred.await() }.onFailure {
                        Log.e("Gitea", "Error fetching orgs", it)
                    }.getOrDefault(emptyList())

                    _user.value = user
                    _repos.value = repos
                    _orgs.value = orgs

                    if (user != null) {
                        try {
                            _heatmap.value = repository.getUserHeatmap(instanceId, user.login)
                        } catch (error: Exception) {
                            Log.e("Gitea", "Error fetching heatmap", error)
                        }
                    }

                    if (repos.isNotEmpty()) {
                        launch {
                            _totalBranches.value = repos.map { repo ->
                                async {
                                    runCatching {
                                        repository.getRepoBranches(instanceId, repo.owner.login, repo.name).size
                                    }.getOrDefault(0)
                                }
                            }.awaitAll().sum()
                        }
                    }

                    _uiState.value = if (user == null && _user.value == null) {
                        UiState.Error(context.getString(R.string.error_gitea_user_profile), retryAction = { fetchAll() })
                    } else {
                        UiState.Success(Unit)
                    }
                }
            } catch (error: Exception) {
                val message = ErrorHandler.getMessage(context, error)
                _uiState.value = UiState.Error(message, retryAction = { fetchAll() })
            }
        }
    }

    fun toggleSortOrder() {
        _sortOrder.value = if (_sortOrder.value == RepoSortOrder.RECENT) RepoSortOrder.ALPHA else RepoSortOrder.RECENT
    }

    fun setPreferredInstance(newInstanceId: String) {
        viewModelScope.launch {
            servicesRepository.setPreferredInstance(ServiceType.GITEA, newInstanceId)
        }
    }
}
