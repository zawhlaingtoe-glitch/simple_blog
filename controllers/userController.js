const User = require("../models/userModel");
const { generateToken } = require("../utils/jwt");
const bcrypt = require('bcrypt')

exports.register = async(req, res) => {
    try {
        const { email, password } = req.body || {};
        const username = req.body && (req.body.username || req.body.name);

        if (!username || !email || !password) {
            return res
                .status(400)
                .json({
                    status: "error",
                    message: "Username, email, and password are required"
                })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ status: "error", message: "Invalid email format" });
        }

        if (password.length < 6) {
            return res.status(400).json({
                status: "error",
                message: "Password must be at least 6 character"
            })
        }





        const userId = await User.createUser(username, email, password);
        const token = generateToken({
            id: userId,
            email
        });

        return res
            .status(201).json({
                status: "success",
                user: {
                    id: userId,
                    username: username,
                    email
                },
                token: token,
                message: "User registered successfully"
            })
    } catch (error) {
        return res.status(500)
            .json({
                status: "error",
                message: "Internal Server Error",
                error: error.message
            });

    }
}
exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400)
                .json({
                    status: "False",
                    message: "You need to fill the first! "
                });
        }
        const user = await User.login(email.trim().toLowerCase(), password);

        const token = generateToken({
            id: user.id,
            email: user.email
        })


        return res
            .status(200)
            .json({
                status: "Success!",
                message: "Login successfully!",
                data: {
                    user,
                    token
                }
            })
    } catch (error) {


        if (error.message === "Invalid email or password") {
            return res.status(401).json({
                status: "error",
                message: "The email or password you entered is incorrect"
            });
        }


        console.error("Login Controller Error:", error);
        return res.status(500).json({
            status: "error",
            message: "An internal server error occurred"
        });
    }
}
exports.currentUser = async(req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(400)
                .json({

                    status: "False",
                    "message": "user not found!"
                })
        }
        return res.status(200)
            .json({
                status: "Success!",
                data: {
                    user
                }
            })

    } catch (error) {
        res.status(500).json({
            status: "False",
            message: "Internal Server Error!"
        })
    }
}

exports.updateUser = async(req, res) => {
    try {
        const userId = req.params.id;
        const {
            username,
            email,
            password
        } = req.body;
        if (!email || !username) {
            return res.status(400).json({
                "status": "Fail! ",
                message: "You need to fill the first email and passwod!"
            })
        }
        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(400)
                .json({
                    status: "Fail! ",
                    message: "user not found to update! "
                })
        }

        if (email && email !== user.email) {

            const existEmail = await User.findByEmail(email)
            if (existEmail) {
                return res.status(400)
                    .json({
                        status: "Fail! ",
                        message: "Email already exist!"
                    })
            }
        }
        const updateUser = await User.updateUser(userId,
            username,
            email,
            password);

        return res
            .status(200)
            .json({
                status: "Success!",
                message: "User updated Successfully! ",
                user: {
                    updateUser
                }
            })
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error."
        })
    }
}
exports.delete = async(req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(400)
                .json({
                    status: "Fail!",
                    message: "User account has not found! "
                })
        }
        await User.deleteUser(userId);

        return res
            .status(200)
            .json({
                status: "Success!",
                message: "User has been deleted! "
            })

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error."
        });
    }
}