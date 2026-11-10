const users = [
    {name: "hira", age: 15},
    {name: "shipon", age: 12},
]

const getAllUser = (req, res) => {
    res.json(users)
}

module.exports = getAllUser