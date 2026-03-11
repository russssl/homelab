import XCTest
@testable import Homelab

final class KeychainServiceTests: XCTestCase {
    private var backend: KeychainBackendDouble!

    override func setUp() {
        super.setUp()
        backend = KeychainBackendDouble()
        KeychainService.backend = backend
    }

    override func tearDown() {
        KeychainService.backend = SecurityKeychainBackend()
        backend = nil
        super.tearDown()
    }

    func testLegacyConnectionsMigrateToServiceStateV2Idempotently() throws {
        let legacy = [
            ServiceType.portainer: ServiceConnection(type: .portainer, url: "https://portainer.local", token: "jwt", apiKey: "api-key"),
            ServiceType.pihole: ServiceConnection(type: .pihole, url: "https://pihole.local", token: "sid", piholePassword: "secret")
        ]
        let payload = try JSONEncoder().encode(legacy)
        backend.save(data: payload, service: "com.homelab.homelab.services", account: "homelab_user")

        let migrated = KeychainService.loadServiceState()
        let reloaded = KeychainService.loadServiceState()

        XCTAssertEqual(migrated.instances.count, 2)
        XCTAssertEqual(reloaded, migrated)
        XCTAssertEqual(Set(migrated.instances.map(\.label)), ["Portainer", "Pi-hole"])
        XCTAssertEqual(migrated.preferredInstanceIdByType[.portainer], migrated.instances.first(where: { $0.type == .portainer })?.id)
        XCTAssertEqual(migrated.preferredInstanceIdByType[.pihole], migrated.instances.first(where: { $0.type == .pihole })?.id)
        XCTAssertNil(backend.load(service: "com.homelab.homelab.services", account: "homelab_user"))
        XCTAssertNotNil(backend.load(service: "com.homelab.homelab.services", account: "homelab_service_state_v2"))
    }
}

private final class KeychainBackendDouble: KeychainBackend, @unchecked Sendable {
    private var storage: [String: Data] = [:]

    func save(data: Data, service: String, account: String) {
        storage[key(service: service, account: account)] = data
    }

    func load(service: String, account: String) -> Data? {
        storage[key(service: service, account: account)]
    }

    func delete(service: String, account: String) {
        storage.removeValue(forKey: key(service: service, account: account))
    }

    private func key(service: String, account: String) -> String {
        "\(service)::\(account)"
    }
}
