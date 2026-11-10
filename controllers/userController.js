const fs = require("fs")
const path = require("path")

const usersFile = path.join(__dirname, "../users.json")

const readUsers = () => JSON.parse(fs.readFileSync(usersFile, "utf8"))

const writeUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2) + "\n")
}

const getAllUsers = (req, res) => {
    res.json(readUsers())
}

const createUser = (req, res) => {
    const { name, age } = req.body
    if (typeof name !== "string" || name.trim().length === 0 || !Number.isInteger(age) || age < 1 || age > 120) {
        return res.status(400).json({ message: "Name and a valid age (1-120) are required." })
    }

    const users = readUsers()
    const user = {
        id: users.reduce((maxId, current) => Math.max(maxId, current.id), 0) + 1,
        name: name.trim(),
        age,
    }
    users.push(user)
    writeUsers(users)
    res.status(201).json(user)
}

const updateUser = (req, res) => {
    const id = Number(req.params.id)
    const { name, age } = req.body
    if (!Number.isInteger(id) || id < 1 || typeof name !== "string" || name.trim().length === 0 ||
        !Number.isInteger(age) || age < 1 || age > 120) {
        return res.status(400).json({ message: "A valid user ID, name, and age (1-120) are required." })
    }

    const users = readUsers()
    const user = users.find((entry) => entry.id === id)
    if (!user) {
        return res.status(404).json({ message: "User not found." })
    }

    user.name = name.trim()
    user.age = age
    writeUsers(users)
    res.json(user)
}

const deleteUser = (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: "A valid user ID is required." })
    }

    const users = readUsers()
    const remainingUsers = users.filter((user) => user.id !== id)
    if (remainingUsers.length === users.length) {
        return res.status(404).json({ message: "User not found." })
    }

    writeUsers(remainingUsers)
    res.status(204).end()
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser }
