const User = require("../models/userModel");
const Post = require("../models/postModel");
const { generateToken } = require("../utils/jwt");
const bcrypt = require('bcrypt')
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: "./public/upload/",
    filename: (_req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage
}).single("photo");

exports.showRegisterForm = (_, res) => {
    res.render("users/register", {
        title: "Register",
        error: null
    })
}
exports.register = async(req, res) => {
    try {
        const { name, email, password } = req.body;
        let user = await User.findByEmail(email);
        if (user) {
            return res.render("users/register", {
                title: "Register",
                error: "User already exist"
            })
        }
        let result = await User.createUser(name, email, password)
        if (result) {
            res.redirect("/users/login")
        }
    } catch (error) {

        console.error("Registration error:", error);
        res.render("users/register", {
            title: "Register",
            error: "Something went wrong during Login!"
        });
    }
}

exports.showLoginForm = (_, res) => {
    res.render("users/login", {
        title: "Login",
        error: null
    });

}
exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) {
            return res
                .render("users/login", {
                    title: "Login",
                    error: "User need to first register!"
                })

        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res
                .render("users/login", {
                    title: "Login",
                    error: "Invalid email or password!"
                })
        }

        const token = generateToken({
            id: user.id,
            email: user.email
        })

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 60 * 60 * 1000
        });

        if (req.accepts("html")) {
            return res.redirect("/")
        }

        return res.status(200).json({
            status: "success",
            message: "Login successfully!",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {


        console.error("Error: ", error);
        return res.render("users/login", {
            title: "login",
            error: "Someting went wrong while login!"
        })
    }
}

exports.profile = async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.redirect("/users/login");
        }

        const posts = await Post.findByUserId(req.user.id);

        return res.render("users/profile", {
            title: "Profile",
            user,
            posts,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Profile error:", error);
        return res.render("users/profile", {
            title: "Profile",
            user: null,
            posts: [],
            error: "Could not load your profile.",
            success: null
        });
    }
}

exports.updateProfile = async(req, res) => {
    upload(req, res, async(err) => {
        if (err) {
            console.error("Profile photo upload error:", err);
            return res.redirect("/users/profile");
        }

        const { username, email, password } = req.body;
        const profilePhoto = req.file ? req.file.filename : null;

        try {
            if (!username || !email) {
                const user = await User.findById(req.user.id);
                const posts = await Post.findByUserId(req.user.id);

                return res.render("users/profile", {
                    title: "Profile",
                    user,
                    posts,
                    error: "Name and email are required.",
                    success: null
                });
            }

            const existingUser = await User.findByEmail(email);
            if (existingUser && String(existingUser.id) !== String(req.user.id)) {
                const user = await User.findById(req.user.id);
                const posts = await Post.findByUserId(req.user.id);

                return res.render("users/profile", {
                    title: "Profile",
                    user,
                    posts,
                    error: "Email already exists.",
                    success: null
                });
            }

            await User.updateUser(req.user.id, username, email, password || null, profilePhoto);
            return res.redirect("/users/profile");
        } catch (error) {
            console.error("Profile update error:", error);
            return res.redirect("/users/profile");
        }
    });
}

exports.createProfilePost = async(req, res) => {
    upload(req, res, async(err) => {
        if (err) {
            console.error("Profile post upload error:", err);
            return res.redirect("/users/profile");
        }

        const { title, content } = req.body;
        const photo = req.file ? req.file.filename : null;

        try {
            if (!title || !content) {
                const user = await User.findById(req.user.id);
                const posts = await Post.findByUserId(req.user.id);

                return res.render("users/profile", {
                    title: "Profile",
                    user,
                    posts,
                    error: "Post title and content are required.",
                    success: null
                });
            }

            await Post.createPost(req.user.id, title, content, photo);
            return res.redirect("/users/profile");
        } catch (error) {
            console.error("Profile post create error:", error);
            return res.redirect("/users/profile");
        }
    });
}

exports.deleteProfilePost = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);

        if (post && String(post.user_id) === String(req.user.id)) {
            await Post.deletePost(req.params.id);
        }

        return res.redirect("/users/profile");
    } catch (error) {
        console.error("Profile post delete error:", error);
        return res.redirect("/users/profile");
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
