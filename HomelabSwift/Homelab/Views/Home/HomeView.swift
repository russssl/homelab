import SwiftUI
import Darwin

struct HomeView: View {
    @Environment(ServicesStore.self) private var servicesStore
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(Localizer.self) private var localizer

    @State private var showLogin: ServiceType? = nil
    @State private var showingServiceOrder = false

    private let columns = [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)]

    private var visibleTypes: [ServiceType] {
        settingsStore.serviceOrder.filter { !settingsStore.isServiceHidden($0) }
    }

    private var hasServices: Bool {
        visibleTypes.contains { servicesStore.hasInstances(for: $0) }
    }

    private var hasUnreachableService: Bool {
        visibleTypes
            .flatMap { servicesStore.instances(for: $0) }
            .contains { servicesStore.reachability(for: $0.id) == false }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 0) {
                    headerSection
                    if hasUnreachableService || servicesStore.isTailscaleConnected {
                        tailscaleSection
                    }
                    serviceGrid
                    DashboardSummary()
                    footerSection
                }
                .padding(.horizontal, 16)
            }
            .background(AppTheme.background)
            .navigationBarHidden(true)
            .sheet(item: $showLogin) { type in
                ServiceLoginView(serviceType: type)
            }
            .sheet(isPresented: $showingServiceOrder) {
                ServiceOrderSheet()
            }
            .navigationDestination(for: HomeServiceRoute.self) { route in
                serviceDestination(for: route)
            }
        }
    }

    private var headerSection: some View {
        HStack {
            Text(localizer.t.launcherTitle)
                .font(.largeTitle)
                .fontWeight(.heavy)
                .foregroundStyle(.primary)

            Spacer()

            HStack(spacing: 8) {
                HStack(spacing: 5) {
                    Image(systemName: "bolt.fill")
                        .font(.caption2)
                        .accessibilityHidden(true)
                    Text("\(servicesStore.connectedCount)")
                        .font(.subheadline.bold())
                }
                .foregroundStyle(AppTheme.accent)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .glassCard(cornerRadius: 20, tint: AppTheme.accent.opacity(0.15))

                Button {
                    HapticManager.light()
                    showingServiceOrder = true
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.accent)
                        .frame(width: 36, height: 36)
                        .background(AppTheme.accent.opacity(0.12), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(localizer.t.homeReorderServices)
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    private var tailscaleSection: some View {
        Button {
            HapticManager.medium()
            if let url = URL(string: "tailscale://app") {
                UIApplication.shared.open(url, options: [:]) { success in
                    if !success, let appStoreUrl = URL(string: "https://apps.apple.com/app/tailscale/id1475387142") {
                        UIApplication.shared.open(appStoreUrl)
                    }
                }
            }
        } label: {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(servicesStore.isTailscaleConnected ? AppTheme.running : Color.black)
                        .frame(width: 44, height: 44)

                    Image(systemName: servicesStore.isTailscaleConnected ? "shield.checkered" : "network.badge.shield.half.filled")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .accessibilityHidden(true)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(servicesStore.isTailscaleConnected ? localizer.t.tailscaleConnected : localizer.t.tailscaleOpen)
                        .font(.subheadline.bold())
                        .foregroundStyle(.primary)

                    Text(servicesStore.isTailscaleConnected ? localizer.t.tailscaleSecure : localizer.t.tailscaleOpenDesc)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textMuted)
                }

                Spacer(minLength: 0)

                if servicesStore.isTailscaleConnected {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(AppTheme.running)
                        .font(.title3)
                        .accessibilityHidden(true)
                } else {
                    HStack(spacing: 4) {
                        Text(localizer.t.tailscaleBadge)
                            .font(.caption2.bold())
                            .foregroundStyle(AppTheme.textMuted)
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(AppTheme.textMuted)
                            .accessibilityHidden(true)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.gray.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity)
            .glassCard(tint: servicesStore.isTailscaleConnected ? AppTheme.running.opacity(0.05) : nil)
        }
        .buttonStyle(.plain)
        .padding(.bottom, 16)
    }

    private var serviceGrid: some View {
        GlassGroup(spacing: 16) {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(visibleTypes) { type in
                    let instances = servicesStore.instances(for: type)
                    if instances.isEmpty {
                        Button {
                            HapticManager.medium()
                            showLogin = type
                        } label: {
                            ServiceCardContent(
                                type: type,
                                label: type.displayName,
                                isConnected: false,
                                isPreferred: false,
                                reachable: nil,
                                isPinging: false,
                                t: localizer.t
                            )
                        }
                        .buttonStyle(.plain)
                    } else {
                        ForEach(instances) { instance in
                            NavigationLink(value: HomeServiceRoute(type: type, instanceId: instance.id)) {
                                ServiceCardContent(
                                    type: type,
                                    label: instance.displayLabel,
                                    isConnected: true,
                                    isPreferred: servicesStore.preferredInstance(for: type)?.id == instance.id,
                                    reachable: servicesStore.reachability(for: instance.id),
                                    isPinging: servicesStore.isPinging(instanceId: instance.id),
                                    t: localizer.t
                                ) {
                                    Task { await servicesStore.checkReachability(for: instance.id) }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var footerSection: some View {
        Text("\(localizer.t.launcherServices) • \(servicesStore.connectedCount) \(localizer.t.launcherConnected.lowercased())")
            .font(.caption)
            .foregroundStyle(AppTheme.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.top, 28)
            .padding(.bottom, 40)
    }

    @ViewBuilder
    private func serviceDestination(for route: HomeServiceRoute) -> some View {
        switch route.type {
        case .portainer: PortainerDashboard(instanceId: route.instanceId)
        case .pihole: PiHoleDashboard(instanceId: route.instanceId)
        case .beszel: BeszelDashboard(instanceId: route.instanceId)
        case .gitea: GiteaDashboard(instanceId: route.instanceId)
        }
    }
}

private struct HomeServiceRoute: Hashable {
    let type: ServiceType
    let instanceId: UUID
}

private struct ServiceOrderSheet: View {
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(Localizer.self) private var localizer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(settingsStore.serviceOrder) { type in
                    HStack {
                        Text(type.displayName)
                            .font(.body.weight(.semibold))
                        Spacer()
                        HStack(spacing: 12) {
                            Button {
                                settingsStore.moveService(type, offset: -1)
                            } label: {
                                Image(systemName: "chevron.up")
                            }
                            .buttonStyle(.borderless)
                            .disabled(!settingsStore.canMoveService(type, offset: -1))
                            .accessibilityLabel(localizer.t.settingsMoveUp)

                            Button {
                                settingsStore.moveService(type, offset: 1)
                            } label: {
                                Image(systemName: "chevron.down")
                            }
                            .buttonStyle(.borderless)
                            .disabled(!settingsStore.canMoveService(type, offset: 1))
                            .accessibilityLabel(localizer.t.settingsMoveDown)
                        }
                    }
                }
            }
            .navigationTitle(localizer.t.homeReorderServices)
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localizer.t.done) { dismiss() }
                }
            }
        }
    }
}

private struct ServiceCardContent: View {
    let type: ServiceType
    let label: String
    let isConnected: Bool
    let isPreferred: Bool
    let reachable: Bool?
    let isPinging: Bool
    let t: Translations
    var onRefresh: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                AsyncImage(url: URL(string: type.iconUrl)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit()
                    } else {
                        Image(systemName: type.symbolName)
                            .font(.title2)
                            .foregroundStyle(type.colors.primary)
                    }
                }
                .frame(width: 34, height: 34)
                .frame(width: 56, height: 56)
                .background(type.colors.bg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .accessibilityHidden(true)

                Spacer()

                if isConnected && reachable == false, let onRefresh {
                    Button(action: onRefresh) {
                        Image(systemName: "arrow.clockwise")
                            .font(.subheadline.bold())
                            .foregroundStyle(type.colors.primary)
                            .frame(width: 36, height: 36)
                            .background(type.colors.primary.opacity(0.1), in: Circle())
                            .rotationEffect(.degrees(isPinging ? 360 : 0))
                            .animation(isPinging ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isPinging)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(t.refresh)
                } else if isConnected && reachable == nil {
                    ProgressView()
                        .controlSize(.small)
                        .tint(type.colors.primary)
                }
            }
            .padding(.bottom, 10)

            Text(label)
                .font(.body.bold())
                .foregroundStyle(.primary)
                .lineLimit(1)

            Spacer(minLength: 8)

            HStack(spacing: 6) {
                statusBadge
                if isPreferred {
                    Text(t.badgeDefault)
                        .font(.caption2.bold())
                        .foregroundStyle(type.colors.primary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(type.colors.primary.opacity(0.12), in: Capsule())
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .leading)
        .padding(14)
        .contentShape(Rectangle())
        .glassCard()
        .task {
            if isConnected, reachable == nil, !isPinging {
                onRefresh?()
            }
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        if !isConnected {
            HStack(spacing: 5) {
                Text(t.launcherTapToConnect)
                    .font(.caption2.bold())
                    .foregroundStyle(AppTheme.textMuted)
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textMuted)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(.gray.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else if reachable == false {
            HStack(spacing: 5) {
                Circle().fill(AppTheme.warning).frame(width: 6, height: 6)
                Text(t.statusUnreachable)
                    .font(.caption2.bold())
                    .foregroundStyle(AppTheme.warning)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(AppTheme.warning.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else if reachable == true {
            HStack(spacing: 5) {
                Circle().fill(AppTheme.running).frame(width: 6, height: 6)
                Text(t.statusOnline)
                    .font(.caption2.bold())
                    .foregroundStyle(AppTheme.running)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(AppTheme.running.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            HStack(spacing: 5) {
                Circle().fill(AppTheme.info).frame(width: 6, height: 6)
                Text(t.statusVerifying)
                    .font(.caption2.bold())
                    .foregroundStyle(AppTheme.info)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(AppTheme.info.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}
