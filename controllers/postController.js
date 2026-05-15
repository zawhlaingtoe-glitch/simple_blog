const Post = require("../models/postModel");
const User = require("../models/userModel");
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

exports.index = async(req, res) => {
    try {


        const posts = await Post.findAll();
        console.log(posts.length)
        const messages = {
            not_owner: "You can only delete your own posts.",
            not_found: "That post was not found."
        };

        res.render("posts/postlist", {
            posts: posts || [],
            title: "Post List",
            currentUserId: getCurrentUserId(req),
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

        const { title, content } = req.body;
        const photo = req.file ? req.file.filename : null;

        try {
            await Post.createPost(req.user.id, title, content, photo);
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
        const userPosts = await Post.findByUserId(userId);
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
        const { title, content } = req.body;
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

            await Post.updatePost(postId, title, content, photo, userId)
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
