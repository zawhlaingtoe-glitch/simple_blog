const User = require("../models/userModel");
const jwt = require("jsonwebtoken")

const loginUser = async(req, res) => {
    try {
        const { email, password } = req.body;
        const token = jwt.sign({
                id: User.id,
                email: User.email
            },
            process.env.JWT_SECRET, {
                expiresIn: '1h'
            }

        )
        return res.status(201).json({
            token: token
        })

    } catch (error) {
        return res
            .status(400)
            .json({
                error: error.message
            })

    }
}
module.exports = {
    loginUser
}