const Post = require("../models/postModel");
const User = require("../models/userModel");
const Social = require("../models/socialModel");
const Tag = require("../models/tagModel");
const path = require("path");
const multer = require("multer")
const jwt = require("jsonwebtoken");

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
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
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
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;

        const totalPosts = await Post.countAll(currentUserId);
        const totalPages = Math.ceil(totalPosts / limit);

        let posts = await Post.findAll(limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        const currentUser = currentUserId ? await User.findById(currentUserId) : null;
        const popularTags = await Tag.findAllWithCounts(15);

        const searchQuery = req.query.search || "";
        const messages = {
            not_owner: "You can only delete your own posts.",
            not_found: "That post was not found."
        };

        res.render("posts/postlist", {
            posts: posts || [],
            title: "Post List",
            currentUserId,
            currentUser,
            popularTags,
            searchQuery,
            pagination: { page, totalPages, total: totalPosts },
            error: messages[req.query.error] || null
        });
    } catch (error) {
        console.error("Error fetching posts: ", error);
        res.status(500).send("Server Error");
    }
};

exports.search = async(req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const searchQuery = (req.query.q || "").trim();
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;

        if (!searchQuery) {
            return res.redirect("/posts");
        }

        const totalPosts = await Post.searchCount(searchQuery, currentUserId);
        const totalPages = Math.ceil(totalPosts / limit);

        let posts = await Post.search(searchQuery, limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        const currentUser = currentUserId ? await User.findById(currentUserId) : null;
        const popularTags = await Tag.findAllWithCounts(15);

        res.render("posts/postlist", {
            posts: posts || [],
            title: `Search: ${searchQuery}`,
            currentUserId,
            currentUser,
            popularTags,
            searchQuery,
            pagination: { page, totalPages, total: totalPosts },
            error: null
        });
    } catch (error) {
        console.error("Error searching posts:", error);
        res.status(500).send("Server Error");
    }
};

exports.liveSearch = async(req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const q = (req.query.q || "").trim();

        if (!q || q.length < 1) {
            return res.json({ results: [] });
        }

        let posts = await Post.search(q, 8, 0, currentUserId);
        posts = await Tag.attachToPosts(posts);

        const results = posts.map(p => ({
            id: p.id,
            title: p.title,
            author: p.author || "Unknown",
            photo: p.photo || null,
            excerpt: p.content
                ? p.content.replace(/<[^>]+>/g, "").slice(0, 90) + (p.content.length > 90 ? "…" : "")
                : "",
            tags: (p.tags || []).slice(0, 3).map(t => t.name),
            url: `/posts/${p.id}`
        }));

        return res.json({ results, total: results.length, query: q });
    } catch (error) {
        console.error("Live search error:", error);
        return res.status(500).json({ results: [], error: "Server Error" });
    }
};


exports.getPostsByTag = async(req, res) => {
    try {
        const slug = req.params.slug;
        const currentUserId = getCurrentUserId(req);
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;

        const tag = await Tag.findBySlug(slug);
        if (!tag) {
            return res.status(404).render("error", {
                title: "Tag Not Found",
                message: "That tag does not exist.",
                statusCode: 404
            });
        }

        const totalPosts = await Post.countByTag(slug, currentUserId);
        const totalPages = Math.ceil(totalPosts / limit);

        let posts = await Post.findByTag(slug, limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        const currentUser = currentUserId ? await User.findById(currentUserId) : null;
        const popularTags = await Tag.findAllWithCounts(15);

        res.render("posts/postlist", {
            posts: posts || [],
            title: `#${tag.name}`,
            currentUserId,
            currentUser,
            popularTags,
            activeTag: tag,
            searchQuery: "",
            pagination: { page, totalPages, total: totalPosts },
            error: null
        });
    } catch (error) {
        console.error("Error fetching posts by tag:", error);
        res.status(500).send("Server Error");
    }
};

exports.showPost = async(req, res) => {
    try {
        const postId = req.params.id;
        const currentUserId = getCurrentUserId(req);
        const post = await Post.findByid(postId);

        if (!post) {
            return res.status(404).render("error", {
                title: "Not Found",
                message: "That post was not found.",
                statusCode: 404
            });
        }

        // Check visibility: private posts are only visible to the owner
        if (post.visibility === 'private' && String(post.user_id) !== String(currentUserId)) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message: "This post is private.",
                statusCode: 403
            });
        }

        // Attach tags and social data
        const postWithTags = await Tag.attachToPosts([post]);
        const postsWithSocial = await Social.attachToPosts(postWithTags, currentUserId);
        const postWithSocial = postsWithSocial[0] || post;

        const currentUser = currentUserId ? await User.findById(currentUserId) : null;

        res.render("posts/show", {
            post: postWithSocial,
            title: post.title,
            currentUserId,
            currentUser
        });
    } catch (error) {
        console.error("Error viewing post: ", error);
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

        const { title, content, visibility, tags } = req.body;

        // Parse tags from comma-separated string
        const tagList = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];

        const photo = req.file ? req.file.filename : null;

        try {
            const postId = await Post.createPost(req.user.id, title, sanitizeContent(content), photo, normalizeVisibility(visibility));
            await Tag.syncPostTags(postId, tagList);
            res.redirect("/posts");
        } catch (error) {
            console.error("Error creating post: ", error);
            res.status(500).send("Server Error");
        }
    });


}

exports.uploadEditorImage = async(req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error("Error uploading editor image: ", err);
            return res.status(400).json({
                status: "Fail!",
                message: err.message || "Could not upload image."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: "Fail!",
                message: "Please choose an image."
            });
        }

        return res.status(201).json({
            status: "Success!",
            url: `/upload/${req.file.filename}`
        });
    });
};

exports.showEditForm = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (String(post.user_id) !== String(req.user.id)) {
            return res.status(403).send("You can only edit your own post");
        }

        const postTags = await Tag.findByPostId(post.id);
        const tagsString = postTags.map(t => t.name).join(", ");

        return res.render("posts/edit", {
            title: "Edit Post",
            post,
            tagsString
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
        const { title, content, visibility, tags } = req.body;
        const userId = req.user.id;
        const photo = req.file ? req.file.filename : null

        // Parse tags from comma-separated string
        const tagList = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];

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
            await Tag.syncPostTags(postId, tagList);
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
        const counts = await Social.countsForPost(req.params.id, req.user.id);

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
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        const commentWithFlag = {
            ...comment,
            is_author: String(comment.user_id) === String(post.user_id)
        };

        return res.status(201).json({
            status: "Success!",
            comment: commentWithFlag,
            counts
        });
    } catch (error) {
        console.error("Comment error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.toggleShare = async(req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "Fail!", message: "Post not found." });
        }
        if (post.visibility === 'private' && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "Fail!", message: "Access denied." });
        }

        const result = await Social.toggleShare(req.params.id, req.user.id);
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(200).json({
            status: "Success!",
            shared: result.shared,
            counts
        });
    } catch (error) {
        console.error("Share toggle error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.replyToComment = async(req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ status: "Fail!", message: "Reply cannot be empty." });
        }

        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "Fail!", message: "Post not found." });
        }
        if (post.visibility === 'private' && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "Fail!", message: "Access denied." });
        }

        const parentId = req.params.commentId;
        const reply = await Social.createComment(req.params.id, req.user.id, content.trim(), parentId);
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(201).json({
            status: "Success!",
            comment: reply,
            parent_id: parentId,
            counts
        });
    } catch (error) {
        console.error("Reply error:", error);
        return res.status(500).json({ status: "Fail!", message: "Internal Server Error!" });
    }
};

exports.deleteComment = async(req, res) => {
    try {
        const { commentId } = req.params;
        const requesterId = req.user.id;

        const result = await Social.deleteComment(commentId, requesterId);

        if (!result.deleted) {
            const status = result.reason === 'not_found' ? 404 : 403;
            return res.status(status).json({ status: "Fail!", message: result.reason === 'not_found' ? "Comment not found." : "You are not allowed to delete this comment." });
        }

        const counts = await Social.countsForPost(result.postId, requesterId);
        return res.status(200).json({ status: "Success!", counts });
    } catch (error) {
        console.error("Delete comment error:", error);
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
