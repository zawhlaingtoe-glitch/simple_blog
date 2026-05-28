const Post = require("../models/postModel");
const User = require("../models/userModel");
const Social = require("../models/socialModel");
const path = require("path");
const multer = require("multer")
const jwt = require("jsonwebtoken");

const storage = multer.diskStorage({
    destination: "./public/upload/",
    filename: (_req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
}).single("photo");

const getTokenFromCookie = (req) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="));

    return tokenCookie ? decodeURIComponent(tokenCookie.split("=")[1]) : null;
};

const getCurrentUserId = (req) => {
    const token = getTokenFromCookie(req);
    if (!token) return null;

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        return verified.id;
    } catch (_error) {
        return null;
    }
};

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

exports.index = async(req, res) => {
    try {


        const currentUserId = getCurrentUserId(req);
        const posts = await Social.attachToPosts(await Post.findAll(5, 0, currentUserId), currentUserId);
        const currentUser = currentUserId ? await User.findById(currentUserId) : null;
        const messages = {
            not_owner: "You can only delete your own posts.",
            not_found: "That post was not found."
        };

        res.render("posts/postlist", {
            posts: posts || [],
            title: "Post List",
            currentUserId,
            currentUser,
            error: messages[req.query.error] || null
        });
    } catch (error) {
        console.error("Error fetching posts: ", error);
        res.status(500).send("Server Error");
    }
};
exports.showCreateForm = async(req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.render("posts/create", {
            user,
            title: "Create New Post"
        });
    } catch (error) {
        console.error("Error fetching user for form: ", error);
        res.status(500).send("Server Error");
    }
};
exports.create = async(req, res) => {

    upload(req, res, async(err) => {
        if (err) {
            console.error("Error uploading photo: ", err);
            return res.status(500).send("Error uploading photo");
        }

        const { title, content, visibility } = req.body;
        const photo = req.file ? req.file.filename : null;

        try {
            await Post.createPost(req.user.id, title, sanitizeContent(content), photo, normalizeVisibility(visibility));
            res.redirect("/posts");
        } catch (error) {
            console.error("Error creating post: ", error);
            res.status(500).send("Server Error");
        }
    });


}

exports.showEditForm = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (String(post.user_id) !== String(req.user.id)) {
            return res.status(403).send("You can only edit your own post");
        }

        return res.render("posts/edit", {
            title: "Edit Post",
            post
        });
    } catch (error) {
        console.error("Error loading edit form: ", error);
        return res.status(500).send("Server Error");
    }
};

exports.getUserPosts = async(req, res) => {
    try {
        const userId = req.params.userId;
        const currentUserId = req.user?.id;
        const includePrivate = String(currentUserId) === String(userId);
        const userPosts = await Post.findByUserId(userId, includePrivate);
        if (userPosts.length === 0) {
            return res.status(400)
                .json({
                    status: "Not found! ",
                    message: "User has not created post! "
                })
        }

        return res.status(200).json({
            status: "Success! ",
            total: userPosts.length,
            data: {
                userPosts
            }
        })
    } catch (error) {
        console.error(error.message)
        return res
            .status(500)
            .json({
                status: "Fail! ",
                message: "Internal Server error!",
                error: error.message
            })
    }
}
exports.updatePost = async(req, res) => {
    upload(req, res, async(err) => {
        if (err) {
            console.error("Error uploading photo: ", err);
            return res.status(500).send("Error uploading photo");
        }

        const postId = req.params.id
        const { title, content, visibility } = req.body;
        const userId = req.user.id;
        const photo = req.file ? req.file.filename : null

        try {
            const post = await Post.findByid(postId);
            if (!post) {
                if (req.accepts("html")) {
                    return res.status(404).send("Post not found");
                }

                return res.status(404).json({
                    status: "Fail!",
                    message: "Post not found!"
                })
            }

            if (String(post.user_id) !== String(userId)) {
                if (req.accepts("html")) {
                    return res.status(403).send("You can only update your own post");
                }

                return res.status(403).json({
                    status: "Fail!",
                    message: "You can only update your post!"
                })
            }

            await Post.updatePost(postId, title, sanitizeContent(content), photo, normalizeVisibility(visibility), userId)
            const updateDatabase = await Post.findByid(postId)

            if (req.accepts("html")) {
                return res.redirect("/posts");
            }

            return res.status(200)
                .json({
                    status: "Success!",
                    message: "Post updated successfully! ",
                    data: updateDatabase

                })
        } catch (error) {
            console.error(error.message)
            return res.status(500)
                .json({
                    status: "Fail!",
                    message: "Internal server Error! "
                })
        }
    });
}

exports.toggleReaction = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "Fail!", message: "Post not found." });
        }
        if (post.visibility === 'private' && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "Fail!", message: "Access denied." });
        }

        const result = await Social.toggleReaction(req.params.id, req.user.id, req.body.reaction_type || "like");
        const counts = await Social.countsForPost(req.params.id);

        return res.status(200).json({
            status: "Success!",
            reacted: result.reacted,
            counts
        });
    } catch (error) {
        console.error("Reaction error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.createComment = async(req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ status: "Fail!", message: "Comment cannot be empty." });
        }

        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "Fail!", message: "Post not found." });
        }
        if (post.visibility === 'private' && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "Fail!", message: "Access denied." });
        }

        const comment = await Social.createComment(req.params.id, req.user.id, content.trim());
        const counts = await Social.countsForPost(req.params.id);

        return res.status(201).json({
            status: "Success!",
            comment,
            counts
        });
    } catch (error) {
        console.error("Comment error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.createShare = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "Fail!", message: "Post not found." });
        }
        if (post.visibility === 'private' && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "Fail!", message: "Access denied." });
        }

        await Social.createShare(req.params.id, req.user.id);
        const counts = await Social.countsForPost(req.params.id);

        return res.status(201).json({
            status: "Success!",
            message: "Shared to your profile.",
            counts
        });
    } catch (error) {
        console.error("Share error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.deletePost = async(req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const post = await Post.findByid(postId);
        if (!post) {
            if (req.accepts("html")) {
                return res.redirect("/posts?error=not_found");
            }

            return res.status(400).json({
                status: "Fail!",
                message: "Post not found! "
            })
        }

        if (String(post.user_id) !== String(userId)) {
            if (req.accepts("html")) {
                return res.redirect("/posts?error=not_owner");
            }

            return res.status(400).json({
                status: "Fail! ",
                message: "You can only delet your post! "
            })
        }


        await Post.deletePost(postId);
        if (req.accepts("html")) {
            return res.redirect("/posts");
        }

        return res.status(200).json({
            status: "Success!",
            message: "Post deleted successfully! "
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({
            status: "Fail! ",
            message: "Interanl Server Error!"
        })
    }
}
