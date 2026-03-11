import Foundation
import Observation

@Observable
@MainActor
final class SettingsStore {

    // MARK: - Persisted State

    var language: Language {
        didSet {
            UserDefaults.standard.set(language.rawValue, forKey: Keys.language)
        }
    }

    var theme: ThemeMode {
        didSet {
            UserDefaults.standard.set(theme.rawValue, forKey: Keys.theme)
        }
    }

    var hiddenServices: Set<String> {
        didSet {
            UserDefaults.standard.set(Array(hiddenServices), forKey: Keys.hiddenServices)
        }
    }

    private(set) var serviceOrder: [ServiceType] {
        didSet {
            UserDefaults.standard.set(serviceOrder.map(\.rawValue), forKey: Keys.serviceOrder)
        }
    }

    var biometricEnabled: Bool {
        didSet {
            UserDefaults.standard.set(biometricEnabled, forKey: Keys.biometricEnabled)
        }
    }

    var hasCompletedOnboarding: Bool {
        didSet {
            UserDefaults.standard.set(hasCompletedOnboarding, forKey: Keys.hasCompletedOnboarding)
        }
    }

    var lastBackgroundDate: Date? = nil

    // MARK: - Keys

    private enum Keys {
        static let language = "homelab_language"
        static let theme = "homelab_theme"
        static let hiddenServices = "homelab_hidden_services"
        static let serviceOrder = "homelab_service_order"
        static let biometricEnabled = "homelab_biometric_enabled"
        static let hasCompletedOnboarding = "homelab_has_completed_onboarding"
    }

    // MARK: - Init

    init() {
        let savedLang = UserDefaults.standard.string(forKey: Keys.language) ?? "en"
        self.language = Language(rawValue: savedLang) ?? .en

        let savedTheme = UserDefaults.standard.string(forKey: Keys.theme)
        self.theme = savedTheme.flatMap(ThemeMode.init) ?? .system

        let savedHidden = UserDefaults.standard.stringArray(forKey: Keys.hiddenServices) ?? []
        self.hiddenServices = Set(savedHidden)

        let savedOrder = UserDefaults.standard.stringArray(forKey: Keys.serviceOrder) ?? []
        self.serviceOrder = Self.normalizedServiceOrder(savedOrder.compactMap(ServiceType.init(rawValue:)))

        self.biometricEnabled = UserDefaults.standard.bool(forKey: Keys.biometricEnabled)
        self.hasCompletedOnboarding = UserDefaults.standard.bool(forKey: Keys.hasCompletedOnboarding)
    }

    // MARK: - Service Visibility

    func isServiceHidden(_ type: ServiceType) -> Bool {
        hiddenServices.contains(type.rawValue)
    }

    func toggleServiceVisibility(_ type: ServiceType) {
        if hiddenServices.contains(type.rawValue) {
            hiddenServices.remove(type.rawValue)
        } else {
            hiddenServices.insert(type.rawValue)
        }
    }

    func canMoveService(_ type: ServiceType, offset: Int) -> Bool {
        guard let index = serviceOrder.firstIndex(of: type) else { return false }
        let destination = index + offset
        return serviceOrder.indices.contains(destination)
    }

    func moveService(_ type: ServiceType, offset: Int) {
        guard let index = serviceOrder.firstIndex(of: type) else { return }
        let destination = index + offset
        guard serviceOrder.indices.contains(destination) else { return }
        var updated = serviceOrder
        updated.swapAt(index, destination)
        serviceOrder = updated
    }

    // MARK: - PIN Security

    var isPinSet: Bool {
        KeychainService.loadPin() != nil
    }

    func savePin(_ pin: String) {
        KeychainService.savePin(pin)
    }

    func verifyPin(_ pin: String) -> Bool {
        KeychainService.loadPin() == pin
    }

    func clearSecurity() {
        KeychainService.deletePin()
        biometricEnabled = false
    }

    private static func normalizedServiceOrder(_ order: [ServiceType]) -> [ServiceType] {
        var seen = Set<ServiceType>()
        let unique = order.filter { seen.insert($0).inserted }
        let missing = ServiceType.allCases.filter { !unique.contains($0) }
        return unique + missing
    }
}

// MARK: - Language

enum Language: String, CaseIterable, Codable {
    case it, en, fr, es, de

    var displayName: String {
        switch self {
        case .it: return "Italiano"
        case .en: return "English"
        case .fr: return "Français"
        case .es: return "Español"
        case .de: return "Deutsch"
        }
    }

    var flagEmoji: String {
        switch self {
        case .it: return "🇮🇹"
        case .en: return "🇬🇧"
        case .fr: return "🇫🇷"
        case .es: return "🇪🇸"
        case .de: return "🇩🇪"
        }
    }
}

// MARK: - ThemeMode

enum ThemeMode: String, CaseIterable, Codable {
    case light, dark, system
}
