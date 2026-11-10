const fs = require("fs")
const path = require("path")

const readJson = (filePath, fallback) => {
    if (!fs.existsSync(filePath)) {
        return fallback
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

const getDashboardStats = (req, res) => {
    const requestLogs = readJson(path.join(__dirname, "../middleware/logs/requests.json"), [])
    const agentStats = readJson(path.join(__dirname, "../userAgent.json"), { userAgents: [], rateLimitBlocked: [] })
    const userAgents = Array.isArray(agentStats) ? agentStats : agentStats.userAgents
    const rateLimitBlocked = Array.isArray(agentStats) ? [] : agentStats.rateLimitBlocked || []
    const blockedCount = rateLimitBlocked.reduce((total, entry) => total + entry.count, 0)

    res.json({
        totalRequests: requestLogs.length,
        totalUsers: readJson(path.join(__dirname, "../users.json"), []).length,
        rateLimitBlocked: blockedCount,
        userAgents,
        blockedByUserAgent: rateLimitBlocked,
        recentRequests: requestLogs.slice(-10).reverse(),
    })
}

module.exports = getDashboardStats
