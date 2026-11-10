const express = require("express")
const app  = express()
const getUsers = require("./route/user")
const { isValid, checkUserAgent } = require("./middleware/user")
const ratelimit = require("express-rate-limit")
const auditLogger = require("./middleware/audit/auditLogger")

app.use(express.json())
app.use(auditLogger)
app.use(checkUserAgent)

const ratelimiter = ratelimit({
    windowMs: 10*1000,
    max: 1,
    message: {
        message: "Too many request from thi IP, please try again in 30 seceond!"
    }
})

app.use("/api/users", ratelimiter, isValid, getUsers)


app.listen(3000, () => {
    console.log("surver is running...");
    
})