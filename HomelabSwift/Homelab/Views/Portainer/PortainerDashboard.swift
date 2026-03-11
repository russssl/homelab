import SwiftUI

// Maps to app/portainer/index.tsx

struct PortainerDashboard: View {
    let instanceId: UUID

    @Environment(ServicesStore.self) private var servicesStore
    @Environment(Localizer.self) private var localizer

    @State private var selectedInstanceId: UUID
    @State private var endpoints: [PortainerEndpoint] = []
    @State private var selectedEndpoint: PortainerEndpoint?
    @State private var containers: [PortainerContainer] = []
    @State private var state: LoadableState<Void> = .idle

    private let portainerColor = ServiceType.portainer.colors.primary

    init(instanceId: UUID) {
        self.instanceId = instanceId
        _selectedInstanceId = State(initialValue: instanceId)
    }

    var body: some View {
        ServiceDashboardLayout(
            serviceType: .portainer,
            instanceId: selectedInstanceId,
            state: state,
            onRefresh: fetchAll
        ) {
            instancePicker

            // Endpoint picker (only if multiple endpoints)
            if endpoints.count > 1 {
                endpointPicker
            }

            // Server info
            if let ep = selectedEndpoint {
                serverInfoSection(ep)
            }

            // Container stats
            containerStatsSection

            // View all button (moved here)
            if let ep = selectedEndpoint {
                NavigationLink(value: PortainerRoute.containers(instanceId: selectedInstanceId, endpointId: ep.Id)) {
                    HStack(spacing: 8) {
                        Image(systemName: "list.bullet.indent")
                        Text(localizer.t.portainerViewAll)
                            .fontWeight(.semibold)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.bold())
                            .accessibilityHidden(true)
                    }
                    .foregroundStyle(portainerColor)
                    .padding(16)
                    .glassCard()
                }
                .buttonStyle(.plain)
            }

            // Resources
            if let snapshot = selectedEndpoint?.Snapshots?.first {
                resourcesSection(snapshot)
                healthSection(snapshot)
            }
        }
        .navigationTitle(localizer.t.portainerDashboard)
        .navigationDestination(for: PortainerRoute.self) { route in
            switch route {
            case .containers(let instanceId, let epId):
                ContainerListView(instanceId: instanceId, endpointId: epId)
            case .containerDetail(let instanceId, let epId, let containerId):
                ContainerDetailView(instanceId: instanceId, endpointId: epId, containerId: containerId)
            }
        }
        .task(id: selectedInstanceId) { await fetchAll() }
    }

    private var instancePicker: some View {
        let instances = servicesStore.instances(for: .portainer)
        return Group {
            if instances.count > 1 {
                VStack(alignment: .leading, spacing: 12) {
                    Text(localizer.t.dashboardInstances)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.textMuted)
                        .textCase(.uppercase)

                    ForEach(instances) { instance in
                        Button {
                            HapticManager.light()
                            selectedInstanceId = instance.id
                            servicesStore.setPreferredInstance(id: instance.id, for: .portainer)
                            endpoints = []
                            selectedEndpoint = nil
                            containers = []
                        } label: {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(instance.id == selectedInstanceId ? portainerColor : AppTheme.textMuted.opacity(0.4))
                                    .frame(width: 10, height: 10)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(instance.displayLabel)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.primary)
                                    Text(instance.url)
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textMuted)
                                        .lineLimit(1)
                                }
                                Spacer()
                            }
                            .padding(14)
                            .glassCard(tint: instance.id == selectedInstanceId ? portainerColor.opacity(0.1) : nil)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Endpoint Picker

    private var endpointPicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localizer.t.portainerEndpoints)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textMuted)
                .textCase(.uppercase)

            ForEach(endpoints) { ep in
                Button {
                    HapticManager.light()
                    selectedEndpoint = ep
                    Task { await fetchContainers() }
                } label: {
                    HStack(spacing: 10) {
                        Circle()
                            .fill(ep.isOnline ? AppTheme.running : AppTheme.stopped)
                            .frame(width: 10, height: 10)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ep.Name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                            Text(ep.URL)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textMuted)
                        }
                        Spacer()
                        if selectedEndpoint?.Id == ep.Id {
                            Text(localizer.t.portainerActive)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(portainerColor)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(portainerColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                    }
                    .padding(14)
                    .glassCard(tint: selectedEndpoint?.Id == ep.Id ? portainerColor.opacity(0.1) : nil)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Server Info

    private func serverInfoSection(_ ep: PortainerEndpoint) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Server header
            HStack(spacing: 12) {
                Image(systemName: "server.rack")
                    .font(.body)
                    .foregroundStyle(portainerColor)
                    .frame(width: 40, height: 40)
                    .background(portainerColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(ep.Name)
                        .font(.body.weight(.bold))
                    HStack(spacing: 4) {
                        Image(systemName: ep.isOnline ? "wifi" : "wifi.slash")
                            .font(.caption2)
                            .foregroundStyle(ep.isOnline ? AppTheme.running : AppTheme.stopped)
                            .accessibilityHidden(true)
                        Text(ep.isOnline ? localizer.t.portainerOnline : localizer.t.portainerOffline)
                            .font(.caption)
                            .foregroundStyle(ep.isOnline ? AppTheme.running : AppTheme.stopped)
                    }
                }
            }

            // Server details card (Simplified per user request)
            if let raw = ep.Snapshots?.first?.DockerSnapshotRaw, let name = raw.Name {
                VStack(spacing: 0) {
                    serverInfoRow(label: localizer.t.portainerHost, value: name)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 4)
                .glassCard()
            }
        }
    }

    private func serverInfoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
        }
        .padding(.vertical, 10)
    }

    // MARK: - Container Stats

    private var containerStatsSection: some View {
        let running = containers.filter { $0.State == "running" }.count
        let stopped = containers.filter { $0.State == "exited" || $0.State == "dead" }.count
        let total = containers.count
        let stacks = selectedEndpoint?.Snapshots?.first?.StackCount ?? 0

        return VStack(alignment: .leading, spacing: 12) {
            Text(localizer.t.portainerContainers)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textMuted)
                .textCase(.uppercase)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                miniStatCard(label: localizer.t.portainerTotal, value: total, color: AppTheme.info)
                miniStatCard(label: localizer.t.portainerStacks, value: stacks, color: portainerColor)
                miniStatCard(label: localizer.t.portainerRunning, value: running, color: AppTheme.running)
                miniStatCard(label: localizer.t.portainerStopped, value: stopped, color: AppTheme.stopped)
            }
        }
    }

    private func miniStatCard(label: String, value: Int, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title2.bold())
                .foregroundStyle(color)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(AppTheme.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassCard()
    }

    // MARK: - Resources

    private func resourcesSection(_ snapshot: EndpointSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localizer.t.portainerResources)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textMuted)
                .textCase(.uppercase)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                resourceCard(icon: "photo.fill", value: "\(snapshot.ImageCount)", label: localizer.t.portainerImages, color: AppTheme.paused)
                resourceCard(icon: "externaldrive.fill", value: "\(snapshot.VolumeCount)", label: localizer.t.portainerVolumes, color: portainerColor)
                resourceCard(icon: "cpu", value: "\(snapshot.TotalCPU)", label: localizer.t.portainerCpus, color: AppTheme.created)
                resourceCard(icon: "memorychip", value: Formatters.formatBytes(Double(snapshot.TotalMemory)), label: localizer.t.portainerMemory, color: AppTheme.info)
            }
        }
    }

    private func resourceCard(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.body.bold())
                .foregroundStyle(color)
                .frame(width: 36, height: 36)
                .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            Text(value)
                .font(.title3.bold())
            Text(label)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassCard()
    }

    // MARK: - Health

    @ViewBuilder
    private func healthSection(_ snapshot: EndpointSnapshot) -> some View {
        if snapshot.HealthyContainerCount > 0 || snapshot.UnhealthyContainerCount > 0 {
            VStack(alignment: .leading, spacing: 12) {
                Text(localizer.t.portainerHealthStatus)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.textMuted)
                    .textCase(.uppercase)

                HStack(spacing: 10) {
                    if snapshot.HealthyContainerCount > 0 {
                        healthCard(icon: "heart.fill", value: "\(snapshot.HealthyContainerCount)", label: localizer.t.portainerHealthy, color: AppTheme.running)
                    }
                    if snapshot.UnhealthyContainerCount > 0 {
                        healthCard(icon: "heart.slash.fill", value: "\(snapshot.UnhealthyContainerCount)", label: localizer.t.portainerUnhealthy, color: AppTheme.stopped)
                    }
                }
            }
        }
    }

    private func healthCard(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)
            Text(value)
                .font(.title3.bold())
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(AppTheme.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(14)
        .glassCard()
    }

    // MARK: - Data Fetching

    private func fetchAll() async {
        state = .loading
        do {
            guard let client = await servicesStore.portainerClient(instanceId: selectedInstanceId) else {
                state = .error(.notConfigured)
                return
            }
            endpoints = try await client.getEndpoints()
            if selectedEndpoint == nil, let first = endpoints.first {
                selectedEndpoint = first
            }
            await fetchContainers()
            state = .loaded(())
        } catch let apiError as APIError {
            state = .error(apiError)
        } catch {
            state = .error(.custom(error.localizedDescription))
        }
    }

    private func fetchContainers() async {
        guard let ep = selectedEndpoint else { return }
        do {
            guard let client = await servicesStore.portainerClient(instanceId: selectedInstanceId) else {
                state = .error(.notConfigured)
                return
            }
            containers = try await client.getContainers(endpointId: ep.Id)
        } catch let apiError as APIError {
            // Keep existing containers if we have them, only show error on first load
            if containers.isEmpty {
                state = .error(apiError)
            }
        } catch {
            if containers.isEmpty {
                state = .error(.custom(error.localizedDescription))
            }
        }
    }
}

// MARK: - Navigation Routes

enum PortainerRoute: Hashable {
    case containers(instanceId: UUID, endpointId: Int)
    case containerDetail(instanceId: UUID, endpointId: Int, containerId: String)
}
