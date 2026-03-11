import Foundation

enum PiHoleAuthMode: String, Codable, Equatable {
    case session
    case legacy
}

struct ServiceInstance: Codable, Identifiable, Equatable, Hashable {
    let id: UUID
    let type: ServiceType
    var label: String
    var url: String
    var token: String
    var username: String?
    var apiKey: String?
    var piholePassword: String?
    var piholeAuthMode: PiHoleAuthMode?
    var fallbackUrl: String?

    init(
        id: UUID = UUID(),
        type: ServiceType,
        label: String,
        url: String,
        token: String = "",
        username: String? = nil,
        apiKey: String? = nil,
        piholePassword: String? = nil,
        piholeAuthMode: PiHoleAuthMode? = nil,
        fallbackUrl: String? = nil
    ) {
        self.id = id
        self.type = type
        self.label = label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? type.displayName : label.trimmingCharacters(in: .whitespacesAndNewlines)
        self.url = Self.cleanURL(url)
        self.token = token
        self.username = username?.trimmedNilIfEmpty
        self.apiKey = apiKey?.trimmedNilIfEmpty
        self.piholePassword = piholePassword?.trimmedNilIfEmpty
        self.piholeAuthMode = piholeAuthMode
        self.fallbackUrl = Self.cleanOptionalURL(fallbackUrl)
    }

    var displayLabel: String {
        label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? type.displayName : label
    }

    var piHoleStoredSecret: String? {
        if let piholePassword, !piholePassword.isEmpty {
            return piholePassword
        }
        if type == .pihole, let apiKey, !apiKey.isEmpty {
            return apiKey
        }
        return nil
    }

    func updatingToken(_ token: String, piholeAuthMode: PiHoleAuthMode? = nil) -> ServiceInstance {
        let migratedPiHolePassword = type == .pihole ? piHoleStoredSecret : piholePassword
        return ServiceInstance(
            id: id,
            type: type,
            label: displayLabel,
            url: url,
            token: token,
            username: username,
            apiKey: apiKey,
            piholePassword: migratedPiHolePassword,
            piholeAuthMode: piholeAuthMode ?? self.piholeAuthMode,
            fallbackUrl: fallbackUrl
        )
    }

    func updating(
        label: String? = nil,
        url: String? = nil,
        token: String? = nil,
        username: String? = nil,
        apiKey: String? = nil,
        piholePassword: String? = nil,
        piholeAuthMode: PiHoleAuthMode? = nil,
        fallbackUrl: String? = nil
    ) -> ServiceInstance {
        ServiceInstance(
            id: id,
            type: type,
            label: label ?? displayLabel,
            url: url ?? self.url,
            token: token ?? self.token,
            username: username ?? self.username,
            apiKey: apiKey ?? self.apiKey,
            piholePassword: piholePassword ?? self.piholePassword,
            piholeAuthMode: piholeAuthMode ?? self.piholeAuthMode,
            fallbackUrl: fallbackUrl ?? self.fallbackUrl
        )
    }

    private static func cleanURL(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
    }

    private static func cleanOptionalURL(_ value: String?) -> String? {
        guard let value else { return nil }
        let cleaned = cleanURL(value)
        return cleaned.isEmpty ? nil : cleaned
    }
}

struct ServiceStateV2: Codable, Equatable {
    var instances: [ServiceInstance]
    var preferredInstanceIdByType: [ServiceType: UUID]

    static let empty = ServiceStateV2(instances: [], preferredInstanceIdByType: [:])
}

struct ServiceConnection: Codable, Identifiable, Equatable {
    var id: String { type.rawValue }
    let type: ServiceType
    var url: String
    var token: String
    var username: String?
    var apiKey: String?
    var piholePassword: String?
    var piholeAuthMode: PiHoleAuthMode?
    var fallbackUrl: String?

    init(
        type: ServiceType,
        url: String,
        token: String = "",
        username: String? = nil,
        apiKey: String? = nil,
        piholePassword: String? = nil,
        piholeAuthMode: PiHoleAuthMode? = nil,
        fallbackUrl: String? = nil
    ) {
        self.type = type
        self.url = url.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        self.token = token
        self.username = username
        self.apiKey = apiKey
        self.piholePassword = piholePassword
        self.piholeAuthMode = piholeAuthMode
        self.fallbackUrl = fallbackUrl?.isEmpty == true ? nil : fallbackUrl
    }

    var piHoleStoredSecret: String? {
        if let piholePassword, !piholePassword.isEmpty {
            return piholePassword
        }
        if type == .pihole, let apiKey, !apiKey.isEmpty {
            return apiKey
        }
        return nil
    }

    func updatingToken(_ token: String, piholeAuthMode: PiHoleAuthMode? = nil) -> ServiceConnection {
        let migratedPiHolePassword = type == .pihole ? piHoleStoredSecret : piholePassword
        return ServiceConnection(
            type: type,
            url: url,
            token: token,
            username: username,
            apiKey: apiKey,
            piholePassword: migratedPiHolePassword,
            piholeAuthMode: piholeAuthMode ?? self.piholeAuthMode,
            fallbackUrl: fallbackUrl
        )
    }

    func migratedInstance(id: UUID = UUID()) -> ServiceInstance {
        ServiceInstance(
            id: id,
            type: type,
            label: type.displayName,
            url: url,
            token: token,
            username: username,
            apiKey: apiKey,
            piholePassword: type == .pihole ? piHoleStoredSecret : piholePassword,
            piholeAuthMode: piholeAuthMode,
            fallbackUrl: fallbackUrl
        )
    }
}

private extension String {
    var trimmedNilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
