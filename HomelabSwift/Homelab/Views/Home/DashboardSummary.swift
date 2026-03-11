import SwiftUI

// Maps to app/(tabs)/(home)/DashboardSummary.tsx
// Shows summary cards for each connected service.

struct DashboardSummary: View {
    @Environment(ServicesStore.self) private var servicesStore
    @Environment(Localizer.self) private var localizer

    @State private var portainerData: PortainerSummaryData?
    @State private var piholeData: PiholeSummaryData?
    @State private var beszelData: BeszelSummaryData?
    @State private var giteaData: GiteaSummaryData?
    @State private var isLoading = false
    @State private var refreshID = UUID()

    private var hasAnyConnection: Bool {
        ServiceType.allCases.contains { servicesStore.preferredInstance(for: $0) != nil }
    }

    /// Simple hash representing which services are reachable
    private var reachabilityHash: String {
        ServiceType.allCases.map { type in
            let r = servicesStore.isReachable(type)
            return "\(type.rawValue):\(r.map { $0 ? "1" : "0" } ?? "?")"
        }.joined(separator: ",")
    }

    private var preferredSelectionHash: String {
        ServiceType.allCases.map { type in
            let instanceId = servicesStore.preferredInstance(for: type)?.id.uuidString ?? "none"
            return "\(type.rawValue):\(instanceId)"
        }.joined(separator: ",")
    }

    var body: some View {
        if hasAnyConnection {
            VStack(alignment: .leading, spacing: 16) {
                Text(localizer.t.summaryTitle)
                    .font(.title3.bold())

                GlassGroup(spacing: 12) {
                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        spacing: 12
                    ) {
                        if servicesStore.preferredInstance(for: .portainer) != nil {
                            portainerCard
                        }
                        if servicesStore.preferredInstance(for: .pihole) != nil {
                            piholeCard
                        }
                        if servicesStore.preferredInstance(for: .beszel) != nil {
                            beszelCard
                        }
                        if servicesStore.preferredInstance(for: .gitea) != nil {
                            giteaCard
                        }
                    }
                }
            }
            .padding(.top, 24)
            .task(id: refreshID) { await fetchSummaryData() }
            .onChange(of: reachabilityHash) { _, _ in
                // When reachability changes (service comes online/offline), re-fetch
                refreshID = UUID()
                // Clear data for unreachable services
                for type in ServiceType.allCases {
                            if servicesStore.preferredReachability(for: type) == false {
                                clearDataForService(type)
                            }
                }
            }
            .onChange(of: preferredSelectionHash) { _, _ in
                portainerData = nil
                piholeData = nil
                beszelData = nil
                giteaData = nil
                refreshID = UUID()
            }
        }
    }

    // MARK: - Cards

    private var portainerCard: some View {
        SummaryCard(
            type: .portainer,
            title: localizer.t.portainerContainers,
            value: portainerData.map { "\($0.running)" } ?? "—",
            subValue: portainerData.map { "/ \($0.total)" },
            isLoading: portainerData == nil && isLoading,
            isUnreachable: servicesStore.preferredReachability(for: .portainer) == false
        )
    }

    private var piholeCard: some View {
        SummaryCard(
            type: .pihole,
            title: localizer.t.summaryQueryTotal,
            value: piholeData.map { Formatters.formatNumber($0.totalQueries) } ?? "—",
            isLoading: piholeData == nil && isLoading,
            isUnreachable: servicesStore.preferredReachability(for: .pihole) == false
        )
    }

    private var beszelCard: some View {
        SummaryCard(
            type: .beszel,
            title: localizer.t.summarySystemsOnline,
            value: beszelData.map { "\($0.online)" } ?? "—",
            subValue: beszelData.map { "/ \($0.total)" },
            isLoading: beszelData == nil && isLoading,
            isUnreachable: servicesStore.preferredReachability(for: .beszel) == false
        )
    }

    private var giteaCard: some View {
        SummaryCard(
            type: .gitea,
            title: localizer.t.giteaRepos,
            value: giteaData.map { "\($0.totalRepos)" } ?? "—",
            isLoading: giteaData == nil && isLoading,
            isUnreachable: servicesStore.preferredReachability(for: .gitea) == false
        )
    }

    // MARK: - Data Fetching

    private func fetchSummaryData() async {
        isLoading = true
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            if servicesStore.preferredInstance(for: .portainer) != nil && servicesStore.preferredReachability(for: .portainer) != false {
                group.addTask { await fetchPortainer() }
            }
            if servicesStore.preferredInstance(for: .pihole) != nil && servicesStore.preferredReachability(for: .pihole) != false {
                group.addTask { await fetchPihole() }
            }
            if servicesStore.preferredInstance(for: .beszel) != nil && servicesStore.preferredReachability(for: .beszel) != false {
                group.addTask { await fetchBeszel() }
            }
            if servicesStore.preferredInstance(for: .gitea) != nil && servicesStore.preferredReachability(for: .gitea) != false {
                group.addTask { await fetchGitea() }
            }
        }
    }

    private func clearDataForService(_ type: ServiceType) {
        switch type {
        case .portainer: portainerData = nil
        case .pihole: piholeData = nil
        case .beszel: beszelData = nil
        case .gitea: giteaData = nil
        }
    }

    @MainActor
    private func fetchPortainer() async {
        do {
            guard let instance = servicesStore.preferredInstance(for: .portainer),
                  let client = await servicesStore.portainerClient(instanceId: instance.id) else { return }
            let endpoints = try await client.getEndpoints()
            guard let first = endpoints.first else { return }
            let containers = try await client.getContainers(endpointId: first.Id)
            let running = containers.filter { $0.State == "running" }.count
            portainerData = PortainerSummaryData(running: running, total: containers.count)
        } catch { /* silent */ }
    }

    @MainActor
    private func fetchPihole() async {
        do {
            guard let instance = servicesStore.preferredInstance(for: .pihole),
                  let client = await servicesStore.piholeClient(instanceId: instance.id) else { return }
            let stats = try await client.getStats()
            piholeData = PiholeSummaryData(totalQueries: stats.queries.total)
        } catch { /* silent */ }
    }

    @MainActor
    private func fetchBeszel() async {
        do {
            guard let instance = servicesStore.preferredInstance(for: .beszel),
                  let client = await servicesStore.beszelClient(instanceId: instance.id) else { return }
            let response = try await client.getSystems()
            let online = response.items.filter { $0.isOnline }.count
            beszelData = BeszelSummaryData(online: online, total: response.items.count)
        } catch { /* silent */ }
    }

    @MainActor
    private func fetchGitea() async {
        do {
            guard let instance = servicesStore.preferredInstance(for: .gitea),
                  let client = await servicesStore.giteaClient(instanceId: instance.id) else { return }
            let repos = try await client.getUserRepos(page: 1, limit: 100)
            giteaData = GiteaSummaryData(totalRepos: repos.count)
        } catch { /* silent */ }
    }
}

// MARK: - Summary Data Models

private struct PortainerSummaryData {
    let running: Int
    let total: Int
}

private struct PiholeSummaryData {
    let totalQueries: Int
}

private struct BeszelSummaryData {
    let online: Int
    let total: Int
}

private struct GiteaSummaryData {
    let totalRepos: Int
}

// MARK: - SummaryCard

private struct SummaryCard: View {
    let type: ServiceType
    let title: String
    let value: String
    var subValue: String? = nil
    var isLoading: Bool = false
    var isUnreachable: Bool = false

    private var color: Color { isUnreachable ? AppTheme.textMuted : type.colors.primary }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: URL(string: type.iconUrl)) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFit()
                } else {
                    Image(systemName: type.symbolName)
                        .font(.title2)
                        .foregroundStyle(color)
                }
            }
            .frame(width: 34, height: 34)
            .frame(width: 56, height: 56)
            .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .accessibilityHidden(true)
            .padding(.bottom, 10)

            if isLoading {
                SkeletonLoader(height: 22, cornerRadius: 6)
                    .frame(width: 60)
            } else if isUnreachable {
                HStack(spacing: 4) {
                    Image(systemName: "wifi.slash")
                        .font(.caption2)
                        .accessibilityHidden(true)
                    Text("—")
                        .font(.body.bold())
                }
                .foregroundStyle(AppTheme.textMuted)
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(value)
                        .font(.title3.bold())
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    if let subValue {
                        Text(subValue)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }

            Spacer(minLength: 4)

            Text(title)
                .font(.caption)
                .foregroundStyle(AppTheme.textMuted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .leading)
        .padding(14)
        .glassCard()
    }
}
