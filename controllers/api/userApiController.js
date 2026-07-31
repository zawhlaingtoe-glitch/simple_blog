const User = require("../../models/userModel");
const Post = require("../../models/postModel");
const Tag = require("../../models/tagModel");
const Social = require("../../models/socialModel");
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: "./public/upload/",
    filename: (_req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const imageFileFilter = (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
        return cb(null, true);
    }
    return cb(new Error("Only image files are allowed."));
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
}).single("photo");

/**
 * GET /api/v1/users
 * Get all users (public info only)
 */
exports.index = async (req, res) => {
    try {
        const users = await User.findALL();
        return res.status(200).json({
            status: "success",
            data: {
                total: users.length,
                users: users.map(formatUser)
            }
        });
    } catch (error) {
        console.error("API users index error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/users/:id
 * Get a user's public profile
 */
exports.show = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found." });
        }

        const viewerId = req.user?.id || null;
        const isOwn = viewerId && String(viewerId) === String(id);
        const posts = await Social.findProfileTimeline(id, Boolean(isOwn));
        const postsWithTags = await Tag.attachToPosts(posts);

        return res.status(200).json({
            status: "success",
            data: {
                user: formatUser(user),
                posts: postsWithTags.map(formatPost),
                is_own_profile: Boolean(isOwn)
            }
        });
    } catch (error) {
        console.error("API user show error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/users/me
 * Get the authenticated user's full profile (auth required)
 */
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found." });
        }

        const posts = await Social.findProfileTimeline(req.user.id, true);
        const postsWithTags = await Tag.attachToPosts(posts);

        return res.status(200).json({
            status: "success",
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profile_photo: user.profile_photo || null,
                    created_at: user.created_at
                },
                posts: postsWithTags.map(formatPost)
            }
        });
    } catch (error) {
        console.error("API user me error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * PUT /api/v1/users/:id
 * Update a user's account (auth + self only)
 */
exports.update = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: "fail", message: err.message || "Upload failed." });
        }

        const { id } = req.params;
        const { username, email, password } = req.body;
        const profilePhoto = req.file ? req.file.filename : null;

        if (!username || !email) {
            return res.status(400).json({ status: "fail", message: "Username and email are required." });
        }

        try {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ status: "fail", message: "User not found." });
            }

            if (email !== user.email) {
                const taken = await User.findByEmail(email);
                if (taken) {
                    return res.status(409).json({ status: "fail", message: "Email already in use." });
                }
            }

            const updated = await User.updateUser(id, username, email, password || null, profilePhoto);

            return res.status(200).json({
                status: "success",
                message: "Profile updated successfully.",
                data: { user: formatUser(updated) }
            });
        } catch (error) {
            console.error("API user update error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error." });
        }
    });
};

/**
 * DELETE /api/v1/users/:id
 * Delete a user account (auth + self only)
 */
exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found." });
        }

        await User.deleteUser(id);
        res.clearCookie("token");

        return res.status(200).json({
            status: "success",
            message: "Account deleted successfully."
        });
    } catch (error) {
        console.error("API user delete error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_photo: user.profile_photo || null,
        created_at: user.created_at
    };
}

function formatPost(post) {
    return {
        id: post.id,
        title: post.title,
        visibility: post.visibility,
        photo: post.photo || null,
        tags: (post.tags || []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
        created_at: post.created_at,
        updated_at: post.updated_at
    };
}
