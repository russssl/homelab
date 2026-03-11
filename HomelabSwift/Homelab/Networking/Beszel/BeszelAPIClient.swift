import Foundation

actor BeszelAPIClient {
    private let engine: BaseNetworkEngine
    private var baseURL: String = ""
    private var fallbackURL: String = ""
    private var token: String = ""

    init(instanceId: UUID) {
        self.engine = BaseNetworkEngine(serviceType: .beszel, instanceId: instanceId)
    }

    // MARK: - Configuration

    func configure(url: String, token: String, fallbackUrl: String? = nil) {
        self.baseURL = Self.cleanURL(url)
        self.fallbackURL = Self.cleanURL(fallbackUrl ?? "")
        self.token = token
    }

    private func authHeaders() -> [String: String] {
        ["Content-Type": "application/json", "Authorization": token]
    }

    // MARK: - Ping

    func ping() async -> Bool {
        if baseURL.isEmpty { return false }
        if await engine.pingURL("\(baseURL)/api/health", extraHeaders: authHeaders()) { return true }
        if !fallbackURL.isEmpty {
            return await engine.pingURL("\(fallbackURL)/api/health", extraHeaders: authHeaders())
        }
        return false
    }

    // MARK: - Authentication (PocketBase)

    func authenticate(url: String, email: String, password: String) async throws -> String {
        let cleanURL = Self.cleanURL(url)
        guard let authURL = URL(string: "\(cleanURL)/api/collections/users/auth-with-password") else {
            throw APIError.invalidURL
        }

        let body = try JSONEncoder().encode(["identity": email, "password": password])
        var req = URLRequest(url: authURL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        req.timeoutInterval = 8

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.custom("Authentication failed. Check your credentials and URL.")
        }

        let decoded = try JSONDecoder().decode(BeszelAuthResponse.self, from: data)
        return decoded.token
    }

    // MARK: - Systems

    func getSystems() async throws -> BeszelSystemsResponse {
        return try await engine.request(
            baseURL: baseURL, fallbackURL: fallbackURL,
            path: "/api/collections/systems/records?sort=-updated&perPage=50",
            headers: authHeaders()
        )
    }

    func getSystem(id: String) async throws -> BeszelSystem {
        return try await engine.request(
            baseURL: baseURL, fallbackURL: fallbackURL,
            path: "/api/collections/systems/records/\(id)",
            headers: authHeaders()
        )
    }

    func getSystemRecords(systemId: String, limit: Int = 60) async throws -> BeszelRecordsResponse {
        let filter = "system='\(systemId)'".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await engine.request(
            baseURL: baseURL, fallbackURL: fallbackURL,
            path: "/api/collections/system_stats/records?filter=(\(filter))&sort=-created&perPage=\(limit)",
            headers: authHeaders()
        )
    }

    // MARK: - Helpers

    private static func cleanURL(_ url: String) -> String {
        url.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
    }
}
