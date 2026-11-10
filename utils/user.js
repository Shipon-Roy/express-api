const fs = require("fs")
const path = require("path")

const userAgentFile = path.join(__dirname, "../userAgent.json")

const loadData = () => {
    if (fs.existsSync(userAgentFile)) {
        const data = JSON.parse(fs.readFileSync(userAgentFile, "utf8"))
        const userAgentEntries = Array.isArray(data) ? data : data.userAgents
        const blockedEntries = Array.isArray(data) ? [] : data.rateLimitBlocked || []

        if (!Array.isArray(userAgentEntries) || !Array.isArray(blockedEntries)) {
            throw new Error("Invalid userAgent.json format: expected userAgents and rateLimitBlocked arrays")
        }

        return {
            userAgents: normalizeEntries(userAgentEntries),
            rateLimitBlocked: normalizeEntries(blockedEntries),
        }
    }

    return { userAgents: [], rateLimitBlocked: [] }
}

const normalizeEntries = (entries) => {
    const counts = new Map()
    for (const entry of entries) {
        const userAgent = typeof entry === "string" ? entry : entry.userAgent
        const count = typeof entry === "string" ? 1 : entry.count

        if (typeof userAgent !== "string" || !Number.isInteger(count) || count < 1) {
            throw new Error("Invalid entry in userAgent.json")
        }

        counts.set(userAgent, (counts.get(userAgent) || 0) + count)
    }

    return Array.from(counts, ([userAgent, count]) => ({ userAgent, count }))
}

const incrementCount = (entries, userAgent) => {
    const existingAgent = entries.find((entry) => entry.userAgent === userAgent)
    if (existingAgent) {
        existingAgent.count += 1
    } else {
        entries.push({ userAgent, count: 1 })
    }

    entries.sort((a, b) => b.count - a.count || a.userAgent.localeCompare(b.userAgent))
}

const writeData = (data) => {
    fs.writeFileSync(userAgentFile, JSON.stringify(data, null, 2) + "\n")
}

const saveUserAgent = (agentString) => {
    if (typeof agentString !== "string" || agentString.length === 0) {
        return
    }

    const data = loadData()
    incrementCount(data.userAgents, agentString)
    writeData(data)
}

const saveRateLimitBlock = (agentString) => {
    const userAgent = typeof agentString === "string" && agentString.length > 0
        ? agentString
        : "(missing user-agent)"

    const data = loadData()
    incrementCount(data.rateLimitBlocked, userAgent)
    writeData(data)
}

module.exports = saveUserAgent
module.exports.saveRateLimitBlock = saveRateLimitBlock