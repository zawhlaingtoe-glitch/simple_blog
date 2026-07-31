const db = require("../config/database");

class Social {
    static async ensurePostMetadataColumns() {
        try {
            await db.query("ALTER TABLE USERS ADD COLUMN profile_photo VARCHAR(255) NULL");
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }

        try {
            await db.query("ALTER TABLE POSTS ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'public'");
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }
    }

    static async ensureTables() {
        await Social.ensurePostMetadataColumns();

        await db.query(`
            CREATE TABLE IF NOT EXISTS post_reactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                reaction_type VARCHAR(30) NOT NULL DEFAULT 'like',
                created_at DATETIME NOT NULL,
                UNIQUE KEY unique_post_user_reaction (post_id, user_id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                parent_id INT NULL,
                created_at DATETIME NOT NULL
            )
        `);

        // Add parent_id column if missing (migration)
        try {
            await db.query(
                "ALTER TABLE post_comments ADD COLUMN parent_id INT NULL AFTER content"
            );
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME" && error.code !== "ER_DUP_FIELD") {
                throw error;
            }
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS post_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at DATETIME NOT NULL,
                UNIQUE KEY unique_post_user_share (post_id, user_id)
            )
        `);

        // Add unique constraint if missing
        try {
            await db.query(
                "ALTER TABLE post_shares ADD UNIQUE KEY unique_post_user_share (post_id, user_id)"
            );
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME" && error.code !== "ER_DUP_KEYNAME" && error.code !== "ER_DUP_FIELD") {
                throw error;
            }
        }
    }

    static async attachToPosts(posts, currentUserId = null) {
        await Social.ensureTables();

        if (!posts || posts.length === 0) {
            return [];
        }

        const postIds = posts.map((post) => post.id);
        const placeholders = postIds.map(() => "?").join(",");

        const [reactionRows] = await db.query(
            `SELECT post_id, COUNT(*) AS count FROM post_reactions WHERE post_id IN (${placeholders}) GROUP BY post_id`,
            postIds
        );

        const [commentRows] = await db.query(
            `SELECT post_id, COUNT(*) AS count FROM post_comments WHERE parent_id IS NULL AND post_id IN (${placeholders}) GROUP BY post_id`,
            postIds
        );

        const [shareRows] = await db.query(
            `SELECT post_id, COUNT(*) AS count FROM post_shares WHERE post_id IN (${placeholders}) GROUP BY post_id`,
            postIds
        );

        // Fetch all comments (including replies) ordered by created_at
        const [commentDetails] = await db.query(
            `SELECT post_comments.*, USERS.username AS author, USERS.profile_photo AS author_photo
             FROM post_comments
             JOIN USERS ON post_comments.user_id = USERS.id
             WHERE post_comments.post_id IN (${placeholders})
             ORDER BY post_comments.created_at ASC`,
            postIds
        );

        const [reactionDetails] = await db.query(
            `SELECT post_reactions.post_id, USERS.username AS author, USERS.profile_photo AS author_photo
             FROM post_reactions
             JOIN USERS ON post_reactions.user_id = USERS.id
             WHERE post_reactions.post_id IN (${placeholders})
             ORDER BY post_reactions.created_at ASC`,
            postIds
        );

        let reactedPostIds = new Set();
        let sharedPostIds = new Set();
        if (currentUserId) {
            const [reactionMine] = await db.query(
                `SELECT post_id FROM post_reactions WHERE user_id = ? AND post_id IN (${placeholders})`,
                [currentUserId, ...postIds]
            );
            reactedPostIds = new Set(reactionMine.map((row) => row.post_id));

            const [shareMine] = await db.query(
                `SELECT post_id FROM post_shares WHERE user_id = ? AND post_id IN (${placeholders})`,
                [currentUserId, ...postIds]
            );
            sharedPostIds = new Set(shareMine.map((row) => row.post_id));
        }

        const countByPost = (rows) => new Map(rows.map((row) => [row.post_id, row.count]));
        const reactions = countByPost(reactionRows);
        const comments = countByPost(commentRows);
        const shares = countByPost(shareRows);

        // Build nested comment tree per post
        const buildCommentTree = (flatComments) => {
            const map = new Map();
            const roots = [];
            flatComments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
            flatComments.forEach((c) => {
                const node = map.get(c.id);
                if (c.parent_id && map.has(c.parent_id)) {
                    map.get(c.parent_id).replies.push(node);
                } else if (!c.parent_id) {
                    roots.push(node);
                }
            });
            return roots;
        };

        return posts.map((post) => {
            const postComments = commentDetails.filter((comment) => comment.post_id === post.id);
            return {
                ...post,
                reaction_count: reactions.get(post.id) || 0,
                comment_count: comments.get(post.id) || 0,
                share_count: shares.get(post.id) || 0,
                current_user_reacted: reactedPostIds.has(post.id),
                current_user_shared: sharedPostIds.has(post.id),
                reaction_users: reactionDetails.filter((reaction) => reaction.post_id === post.id),
                comments: buildCommentTree(postComments)
            };
        });
    }

    static async toggleReaction(postId, userId, reactionType = "like") {
        await Social.ensureTables();

        const [existing] = await db.query(
            "SELECT id FROM post_reactions WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        if (existing.length > 0) {
            await db.query("DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?", [postId, userId]);
            return { reacted: false };
        }

        await db.query(
            "INSERT INTO post_reactions(post_id, user_id, reaction_type, created_at) VALUES(?,?,?,?)",
            [postId, userId, reactionType, new Date()]
        );

        return { reacted: true };
    }

    static async createComment(postId, userId, content, parentId = null) {
        await Social.ensureTables();

        const [result] = await db.query(
            "INSERT INTO post_comments(post_id, user_id, content, parent_id, created_at) VALUES(?,?,?,?,?)",
            [postId, userId, content, parentId, new Date()]
        );

        const [rows] = await db.query(
            `SELECT post_comments.*, USERS.username AS author, USERS.profile_photo AS author_photo
             FROM post_comments
             JOIN USERS ON post_comments.user_id = USERS.id
             WHERE post_comments.id = ?`,
            [result.insertId]
        );

        return rows[0];
    }

    static async deleteComment(commentId, requesterId) {
        await Social.ensureTables();

        // fetch comment with post owner info
        const [rows] = await db.query(
            `SELECT pc.*, p.user_id AS post_owner_id
             FROM post_comments pc
             JOIN POSTS p ON pc.post_id = p.id
             WHERE pc.id = ?`,
            [commentId]
        );

        if (rows.length === 0) return { deleted: false, reason: 'not_found' };

        const comment = rows[0];
        const isOwner   = String(comment.user_id)       === String(requesterId);
        const isPostOwner = String(comment.post_owner_id) === String(requesterId);

        if (!isOwner && !isPostOwner) return { deleted: false, reason: 'forbidden' };

        // delete replies first, then the comment
        await db.query('DELETE FROM post_comments WHERE parent_id = ?', [commentId]);
        await db.query('DELETE FROM post_comments WHERE id = ?', [commentId]);

        return { deleted: true, postId: comment.post_id };
    }

    static async toggleShare(postId, userId) {
        await Social.ensureTables();

        const [existing] = await db.query(
            "SELECT id FROM post_shares WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        if (existing.length > 0) {
            await db.query("DELETE FROM post_shares WHERE post_id = ? AND user_id = ?", [postId, userId]);
            return { shared: false };
        }

        await db.query(
            "INSERT INTO post_shares(post_id, user_id, created_at) VALUES(?,?,?)",
            [postId, userId, new Date()]
        );

        return { shared: true };
    }

    static async findProfileTimeline(userId, includePrivateOwn = false) {
        await Social.ensureTables();

        const ownVisibilityClause = includePrivateOwn ? "" : "AND POSTS.visibility = 'public'";

        const [ownPosts] = await db.query(
            `SELECT POSTS.*, USERS.username AS author, USERS.profile_photo AS author_photo,
                    POSTS.created_at AS timeline_at,
                    NULL AS shared_at,
                    'post' AS profile_item_type
             FROM POSTS
             JOIN USERS ON POSTS.user_id = USERS.id
             WHERE POSTS.user_id = ? ${ownVisibilityClause}`,
            [userId]
        );

        const [sharedPosts] = await db.query(
            `SELECT POSTS.*, USERS.username AS author, USERS.profile_photo AS author_photo,
                    latest_shares.shared_at AS timeline_at,
                    latest_shares.shared_at AS shared_at,
                    'share' AS profile_item_type
             FROM (
                SELECT post_id, MAX(created_at) AS shared_at
                FROM post_shares
                WHERE user_id = ?
                GROUP BY post_id
             ) latest_shares
             JOIN POSTS ON latest_shares.post_id = POSTS.id
             JOIN USERS ON POSTS.user_id = USERS.id
             WHERE POSTS.user_id <> ? AND POSTS.visibility = 'public'`,
            [userId, userId]
        );

        return [...ownPosts, ...sharedPosts].sort((first, second) => {
            return new Date(second.timeline_at || second.created_at) - new Date(first.timeline_at || first.created_at);
        });
    }

    static async countsForPost(postId, currentUserId = null) {
        const [[reactionCount]] = await db.query("SELECT COUNT(*) AS count FROM post_reactions WHERE post_id = ?", [postId]);
        const [[commentCount]] = await db.query("SELECT COUNT(*) AS count FROM post_comments WHERE parent_id IS NULL AND post_id = ?", [postId]);
        const [[shareCount]] = await db.query("SELECT COUNT(*) AS count FROM post_shares WHERE post_id = ?", [postId]);

        const [reactionUsers] = await db.query(
            `SELECT USERS.username AS author, USERS.profile_photo AS author_photo
             FROM post_reactions
             JOIN USERS ON post_reactions.user_id = USERS.id
             WHERE post_reactions.post_id = ?
             ORDER BY post_reactions.created_at ASC`,
            [postId]
        );

        let current_user_shared = false;
        if (currentUserId) {
            const [shareMine] = await db.query(
                "SELECT id FROM post_shares WHERE post_id = ? AND user_id = ?",
                [postId, currentUserId]
            );
            current_user_shared = shareMine.length > 0;
        }

        return {
            reactions: reactionCount.count,
            comments: commentCount.count,
            shares: shareCount.count,
            reactionUsers,
            current_user_shared
        };
    }
}

module.exports = Social;
