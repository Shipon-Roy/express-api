const express = require("express")
const app  = express()
const getUsers = require("./route/user")
const { isValid, checkUserAgent } = require("./middleware/user")
const ratelimit = require("express-rate-limit")
const auditLogger = require("./middleware/audit/auditLogger")
const { saveRateLimitBlock } = require("./utils/user")
const adminUsers = require("./route/adminUsers")
const getDashboardStats = require("./controllers/dashboardController")

app.use(express.json())
app.use(auditLogger)
app.use(checkUserAgent)

const ratelimiter = ratelimit({
    windowMs: 10*1000,
    max: 1,
    message: {
        message: "Too many request from thi IP, please try again in 30 seceond!"
    },
    handler: (req, res, next, options) => {
        saveRateLimitBlock(req.headers["user-agent"])
        res.status(options.statusCode).json(options.message)
    },
})

app.use("/api/users", ratelimiter, isValid, getUsers)
app.use("/api/admin/users", isValid, adminUsers)
app.get("/api/admin/analytics", isValid, getDashboardStats)


const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})