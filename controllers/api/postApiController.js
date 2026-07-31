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

const sanitizeContent = (content = "") => {
    return String(content)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/<(iframe|object|embed|link|meta)[\s\S]*?>/gi, "")
        .replace(/\son\w+="[^"]*"/gi, "")
        .replace(/\son\w+='[^']*'/gi, "")
        .replace(/\s(href|src)=["']javascript:[^"']*["']/gi, "");
};

const normalizeVisibility = (v) => (v === "private" ? "private" : "public");

/**
 * GET /api/v1/posts
 * List all public posts with pagination
 */
exports.index = async (req, res) => {
    try {
        const currentUserId = req.user?.id || null;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        const total = await Post.countAll(currentUserId);
        const totalPages = Math.ceil(total / limit);

        let posts = await Post.findAll(limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        return res.status(200).json({
            status: "success",
            data: {
                posts: posts.map(formatPost),
                pagination: { page, limit, total, totalPages }
            }
        });
    } catch (error) {
        console.error("API posts index error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/posts/search
 * Search posts by keyword
 */
exports.search = async (req, res) => {
    try {
        const currentUserId = req.user?.id || null;
        const q = (req.query.q || "").trim();
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        if (!q) {
            return res.status(400).json({ status: "fail", message: "Query parameter 'q' is required." });
        }

        const total = await Post.searchCount(q, currentUserId);
        const totalPages = Math.ceil(total / limit);

        let posts = await Post.search(q, limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        return res.status(200).json({
            status: "success",
            data: {
                query: q,
                posts: posts.map(formatPost),
                pagination: { page, limit, total, totalPages }
            }
        });
    } catch (error) {
        console.error("API search error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/posts/tag/:slug
 * Get posts filtered by tag slug
 */
exports.getByTag = async (req, res) => {
    try {
        const currentUserId = req.user?.id || null;
        const { slug } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        const tag = await Tag.findBySlug(slug);
        if (!tag) {
            return res.status(404).json({ status: "fail", message: "Tag not found." });
        }

        const total = await Post.countByTag(slug, currentUserId);
        const totalPages = Math.ceil(total / limit);

        let posts = await Post.findByTag(slug, limit, offset, currentUserId);
        posts = await Tag.attachToPosts(posts);
        posts = await Social.attachToPosts(posts, currentUserId);

        return res.status(200).json({
            status: "success",
            data: {
                tag: { id: tag.id, name: tag.name, slug: tag.slug },
                posts: posts.map(formatPost),
                pagination: { page, limit, total, totalPages }
            }
        });
    } catch (error) {
        console.error("API getByTag error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/posts/:id
 * Get a single post by ID
 */
exports.show = async (req, res) => {
    try {
        const currentUserId = req.user?.id || null;
        const post = await Post.findByid(req.params.id);

        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }

        if (post.visibility === "private" && String(post.user_id) !== String(currentUserId)) {
            return res.status(403).json({ status: "fail", message: "This post is private." });
        }

        const [withTags] = await Tag.attachToPosts([post]);
        const [withSocial] = await Social.attachToPosts([withTags], currentUserId);

        return res.status(200).json({
            status: "success",
            data: { post: formatPost(withSocial) }
        });
    } catch (error) {
        console.error("API show post error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts
 * Create a new post (auth required)
 */
exports.create = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: "fail", message: err.message || "Upload failed." });
        }

        const { title, content, visibility, tags } = req.body;

        if (!title || !content) {
            return res.status(400).json({ status: "fail", message: "Title and content are required." });
        }

        const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        const photo = req.file ? req.file.filename : null;

        try {
            const postId = await Post.createPost(
                req.user.id,
                title,
                sanitizeContent(content),
                photo,
                normalizeVisibility(visibility)
            );
            await Tag.syncPostTags(postId, tagList);
            const created = await Post.findByid(postId);

            return res.status(201).json({
                status: "success",
                message: "Post created successfully.",
                data: { post: formatPost(created) }
            });
        } catch (error) {
            console.error("API create post error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error." });
        }
    });
};

/**
 * PUT /api/v1/posts/:id
 * Update an existing post (auth + owner required)
 */
exports.update = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: "fail", message: err.message || "Upload failed." });
        }

        const { id } = req.params;
        const { title, content, visibility, tags } = req.body;
        const photo = req.file ? req.file.filename : null;
        const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

        try {
            const post = await Post.findByid(id);
            if (!post) {
                return res.status(404).json({ status: "fail", message: "Post not found." });
            }

            if (String(post.user_id) !== String(req.user.id)) {
                return res.status(403).json({ status: "fail", message: "You can only update your own posts." });
            }

            await Post.updatePost(
                id,
                title || post.title,
                sanitizeContent(content || post.content),
                photo,
                normalizeVisibility(visibility || post.visibility),
                req.user.id
            );
            if (tagList.length > 0) {
                await Tag.syncPostTags(id, tagList);
            }

            const updated = await Post.findByid(id);

            return res.status(200).json({
                status: "success",
                message: "Post updated successfully.",
                data: { post: formatPost(updated) }
            });
        } catch (error) {
            console.error("API update post error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error." });
        }
    });
};

/**
 * DELETE /api/v1/posts/:id
 * Delete a post (auth + owner required)
 */
exports.destroy = async (req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }

        if (String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "fail", message: "You can only delete your own posts." });
        }

        await Post.deletePost(req.params.id);

        return res.status(200).json({
            status: "success",
            message: "Post deleted successfully."
        });
    } catch (error) {
        console.error("API delete post error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/posts/user/:userId
 * Get all posts by a specific user
 */
exports.getByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id || null;
        const includePrivate = String(currentUserId) === String(userId);

        const posts = await Post.findByUserId(userId, includePrivate);

        return res.status(200).json({
            status: "success",
            data: {
                total: posts.length,
                posts: posts.map(formatPost)
            }
        });
    } catch (error) {
        console.error("API getByUser error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts/:id/reactions
 * Toggle a reaction on a post (auth required)
 */
exports.toggleReaction = async (req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }
        if (post.visibility === "private" && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "fail", message: "Access denied." });
        }

        const result = await Social.toggleReaction(req.params.id, req.user.id, req.body.reaction_type || "like");
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(200).json({
            status: "success",
            data: { reacted: result.reacted, reaction_type: req.body.reaction_type || "like", counts }
        });
    } catch (error) {
        console.error("API toggleReaction error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts/:id/comments
 * Create a comment on a post (auth required)
 */
exports.createComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ status: "fail", message: "Comment content cannot be empty." });
        }

        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }
        if (post.visibility === "private" && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "fail", message: "Access denied." });
        }

        const comment = await Social.createComment(req.params.id, req.user.id, content.trim());
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(201).json({
            status: "success",
            data: {
                comment: { ...comment, is_author: String(comment.user_id) === String(post.user_id) },
                counts
            }
        });
    } catch (error) {
        console.error("API createComment error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts/:id/comments/:commentId/reply
 * Reply to a specific comment (auth required)
 */
exports.replyToComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ status: "fail", message: "Reply content cannot be empty." });
        }

        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }
        if (post.visibility === "private" && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "fail", message: "Access denied." });
        }

        const reply = await Social.createComment(req.params.id, req.user.id, content.trim(), req.params.commentId);
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(201).json({
            status: "success",
            data: { comment: reply, parent_id: req.params.commentId, counts }
        });
    } catch (error) {
        console.error("API replyToComment error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * DELETE /api/v1/posts/:id/comments/:commentId
 * Delete a comment (auth + owner required)
 */
exports.deleteComment = async (req, res) => {
    try {
        const result = await Social.deleteComment(req.params.commentId, req.user.id);

        if (!result.deleted) {
            const statusCode = result.reason === "not_found" ? 404 : 403;
            const message = result.reason === "not_found" ? "Comment not found." : "You cannot delete this comment.";
            return res.status(statusCode).json({ status: "fail", message });
        }

        const counts = await Social.countsForPost(result.postId, req.user.id);
        return res.status(200).json({ status: "success", message: "Comment deleted.", data: { counts } });
    } catch (error) {
        console.error("API deleteComment error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts/:id/shares
 * Toggle share on a post (auth required)
 */
exports.toggleShare = async (req, res) => {
    try {
        const post = await Post.findByid(req.params.id);
        if (!post) {
            return res.status(404).json({ status: "fail", message: "Post not found." });
        }
        if (post.visibility === "private" && String(post.user_id) !== String(req.user.id)) {
            return res.status(403).json({ status: "fail", message: "Access denied." });
        }

        const result = await Social.toggleShare(req.params.id, req.user.id);
        const counts = await Social.countsForPost(req.params.id, req.user.id);

        return res.status(200).json({
            status: "success",
            data: { shared: result.shared, counts }
        });
    } catch (error) {
        console.error("API toggleShare error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * POST /api/v1/posts/upload-image
 * Upload an image for the rich-text editor (auth required)
 */
exports.uploadEditorImage = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: "fail", message: err.message || "Upload failed." });
        }
        if (!req.file) {
            return res.status(400).json({ status: "fail", message: "No image file provided." });
        }
        return res.status(201).json({
            status: "success",
            data: { url: `/upload/${req.file.filename}` }
        });
    });
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPost(post) {
    return {
        id: post.id,
        title: post.title,
        content: post.content,
        photo: post.photo || null,
        visibility: post.visibility,
        author: post.author || post.username || null,
        user_id: post.user_id,
        tags: (post.tags || []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
        social: {
            reactions: post.reaction_count || 0,
            comments: post.comment_count || 0,
            shares: post.share_count || 0,
            user_reacted: post.user_reacted || false,
            user_shared: post.user_shared || false
        },
        created_at: post.created_at,
        updated_at: post.updated_at
    };
}
