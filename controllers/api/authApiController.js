const User = require("../../models/userModel");
const { generateToken } = require("../../utils/jwt");
const bcrypt = require("bcrypt");

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!email || !password || !(name || username)) {
            return res.status(400).json({
                status: "fail",
                message: "Name/username, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                status: "fail",
                message: "Password must be at least 6 characters long."
            });
        }

        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({
                status: "fail",
                message: "An account with that email already exists."
            });
        }

        const resolvedName = username || name;
        const userId = await User.createUser(resolvedName, email, password);
        const newUser = await User.findById(userId);

        const token = generateToken({ id: newUser.id, email: newUser.email });

        return res.status(201).json({
            status: "success",
            message: "Account created successfully.",
            token,
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    created_at: newUser.created_at
                }
            }
        });
    } catch (error) {
        console.error("API register error:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error."
        });
    }
};

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Email and password are required."
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid email or password."
            });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid email or password."
            });
        }

        const token = generateToken({ id: user.id, email: user.email });

        // Also set cookie for browser clients
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        return res.status(200).json({
            status: "success",
            message: "Logged in successfully.",
            token,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            }
        });
    } catch (error) {
        console.error("API login error:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error."
        });
    }
};

/**
 * POST /api/v1/auth/logout
 * Clear the auth cookie and invalidate session
 */
exports.logout = (req, res) => {
    res.clearCookie("token");
    return res.status(200).json({
        status: "success",
        message: "Logged out successfully."
    });
};

/**
 * GET /api/v1/auth/me
 * Get the currently authenticated user's profile
 */
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "User not found."
            });
        }

        return res.status(200).json({
            status: "success",
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profile_photo: user.profile_photo || null,
                    created_at: user.created_at
                }
            }
        });
    } catch (error) {
        console.error("API me error:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error."
        });
    }
};
