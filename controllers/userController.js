const User = require("../models/userModel");
const Post = require("../models/postModel");
const Social = require("../models/socialModel");
const { generateToken } = require("../utils/jwt");
const bcrypt = require('bcrypt');
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: "./public/upload/",
    filename: (_req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
}).single("photo");

const normalizeVisibility = (visibility) => visibility === "private" ? "private" : "public";

const sanitizeContent = (content = "") => {
    return String(content)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/<(iframe|object|embed|link|meta)[\s\S]*?>/gi, "")
        .replace(/\son\w+="[^"]*"/gi, "")
        .replace(/\son\w+='[^']*'/gi, "")
        .replace(/\s(href|src)=["']javascript:[^"']*["']/gi, "");
};

const getProfileTimeline = async(userId, includePrivateOwn = true) => {
    return Social.findProfileTimeline(userId, includePrivateOwn);
};

exports.showRegisterForm = (_, res) => {
    res.render("users/register", {
        title: "Register",
        error: null
    })
}
exports.register = async(req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!password || password.length < 6) {
            return res.render("users/register", {
                title: "Register",
                error: "Password must be at least 6 characters long!"
            });
        }
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
            error: "Something went wrong during registration!"
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
        if (req.accepts("html")) {
            return res.render("users/login", {
                title: "Login",
                error: "Something went wrong while login!"
            });
        }
        return res.status(500).json({
            status: "error",
            message: "Something went wrong while login!"
        });
    }
}

exports.logout = (req, res) => {
    res.clearCookie("token");
    if (req.accepts("html")) {
        return res.redirect("/users/login");
    }
    return res.status(200).json({
        status: "success",
        message: "Logged out successfully!"
    });
}

exports.profile = async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const posts = await getProfileTimeline(req.user.id, true)

        return res.render("users/profile", {
            title: "Your Profile",
            user,
            posts,
            error: null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error("Profile load error:", error);
        return res.render("users/profile", {
            title: "Your Profile",
            user: null,
            posts: [],
            error: "Unable to load profile.",
            success: null
        });
    }
};

exports.publicProfile = async(req, res) => {
    try {
        const profileUserId = req.params.id;
        const viewerId = req.user ?.id || null;
        const isOwnProfile = viewerId && String(viewerId) === String(profileUserId);
        const user = await User.findById(profileUserId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const posts = await getProfileTimeline(profileUserId, Boolean(isOwnProfile));

        return res.render("users/public-profile", {
            title: `${user.username || 'User'} Profile`,
            user,
            posts,
            isOwnProfile
        });
    } catch (error) {
        console.error("Public profile load error:", error);
        return res.status(500).send("Server Error");
    }
};

exports.updateProfile = async(req, res) => {
    upload(req, res, async(err) => {
        if (err) {
            console.error("Error uploading profile photo:", err);
            return res.render("users/profile", {
                title: "Your Profile",
                user: await User.findById(req.user.id),
                posts: await getProfileTimeline(req.user.id, true),
                error: "Could not upload profile photo.",
                success: null
            });
        }

        try {
            const userId = req.user.id;
            const { username, email, password } = req.body;
            const profilePhoto = req.file ? req.file.filename : null;

            if (!username || !email) {
                return res.render("users/profile", {
                    title: "Your Profile",
                    user: await User.findById(userId),
                    posts: await getProfileTimeline(userId, true),
                    error: "Name and email are required.",
                    success: null
                });
            }

            const existingUser = await User.findById(userId);
            if (!existingUser) {
                return res.redirect("/users/login");
            }

            if (email !== existingUser.email) {
                const emailTaken = await User.findByEmail(email);
                if (emailTaken) {
                    return res.render("users/profile", {
                        title: "Your Profile",
                        user: existingUser,
                        posts: await getProfileTimeline(userId, true),
                        error: "Email already in use.",
                        success: null
                    });
                }
            }

            await User.updateUser(userId, username, email, password || null, profilePhoto);

            return res.redirect("/users/profile?success=Profile updated successfully");
        } catch (error) {
            console.error("Update profile error:", error);
            return res.render("users/profile", {
                title: "Your Profile",
                user: await User.findById(req.user.id),
                posts: await getProfileTimeline(req.user.id, true),
                error: "Could not update profile.",
                success: null
            });
        }
    });
};

exports.createProfilePost = async(req, res) => {
    upload(req, res, async(err) => {
        if (err) {
            console.error("Error uploading post photo:", err);
            return res.redirect("/users/profile");
        }

        try {
            const { title, content, visibility } = req.body;
            const photo = req.file ? req.file.filename : null;

            await Post.createPost(req.user.id, title, sanitizeContent(content), photo, normalizeVisibility(visibility));
            return res.redirect("/users/profile");
        } catch (error) {
            console.error("Create profile post error:", error);
            return res.redirect("/users/profile");
        }
    });
};

exports.deleteProfilePost = async(req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findByid(postId);
        if (!post || String(post.user_id) !== String(req.user.id)) {
            return res.redirect("/users/profile");
        }

        await Post.deletePost(postId);
        return res.redirect("/users/profile");
    } catch (error) {
        console.error("Delete profile post error:", error);
        return res.redirect("/users/profile");
    }
};

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
            if (req.accepts("html")) {
                return res.redirect("/users/login");
            }
            return res.status(404).json({
                status: "Fail!",
                message: "User not found!"
            });
        }

        await User.deleteUser(userId);

        if (req.accepts("html")) {
            res.clearCookie("token");
            return res.redirect("/users/register");
        }

        return res.status(200).json({
            status: "Success!",
            message: "User has been deleted!"
        });

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error."
        });
    }
}