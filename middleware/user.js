const saveUserAgent = require("../utils/user");

const isValid = (req, res, next) => {
    console.log(req.query.token); 
    if (req.query.token === "123") {
        next()
    }else{
        res.status(400).json({
            message: "Unauthorized: Invalid Token!"
        })
    } 
}


const checkUserAgent = (req, res, next) => {
    const userAgent = req.headers["user-agent"]
    const blockedPatterns = [
        /curl/i,
        /wget/i,
        /python-requests/i,
        /Go-http-client/i,
        /Java/i,
        /sqlmap/i,
        /nmap/i,
        /Nikto/i,
        /HeadlessChrome/i,
        /PhantomJS/i

    ]

    const isBlocked = blockedPatterns.some((pattern) => pattern.test(userAgent))

    // user agen save to json file
    saveUserAgent(userAgent)

    // if (userAgent !== "PostmanRuntime/2.14.0") 

    if (!userAgent || isBlocked ) {
        res.status(403).json({
            message: "Forbidden: Suspicious User-Agent!"
        })
    }
    next()
    
}

module.exports = {isValid, checkUserAgent}