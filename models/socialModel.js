const db = require("../config/database");

class Social {
    static async ensureTables() {
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
                created_at DATETIME NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS post_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at DATETIME NOT NULL
            )
        `);
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
            `SELECT post_id, COUNT(*) AS count FROM post_comments WHERE post_id IN (${placeholders}) GROUP BY post_id`,
            postIds
        );

        const [shareRows] = await db.query(
            `SELECT post_id, COUNT(*) AS count FROM post_shares WHERE post_id IN (${placeholders}) GROUP BY post_id`,
            postIds
        );

        const [commentDetails] = await db.query(
            `SELECT post_comments.*, users.username AS author, users.profile_photo AS author_photo
             FROM post_comments
             JOIN users ON post_comments.user_id = users.id
             WHERE post_comments.post_id IN (${placeholders})
             ORDER BY post_comments.created_at ASC`,
            postIds
        );

        const [reactionDetails] = await db.query(
            `SELECT post_reactions.post_id, users.username AS author, users.profile_photo AS author_photo
             FROM post_reactions
             JOIN users ON post_reactions.user_id = users.id
             WHERE post_reactions.post_id IN (${placeholders})
             ORDER BY post_reactions.created_at ASC`,
            postIds
        );

        let reactedPostIds = new Set();
        if (currentUserId) {
            const [reactionMine] = await db.query(
                `SELECT post_id FROM post_reactions WHERE user_id = ? AND post_id IN (${placeholders})`,
                [currentUserId, ...postIds]
            );
            reactedPostIds = new Set(reactionMine.map((row) => row.post_id));
        }

        const countByPost = (rows) => new Map(rows.map((row) => [row.post_id, row.count]));
        const reactions = countByPost(reactionRows);
        const comments = countByPost(commentRows);
        const shares = countByPost(shareRows);

        return posts.map((post) => ({
            ...post,
            reaction_count: reactions.get(post.id) || 0,
            comment_count: comments.get(post.id) || 0,
            share_count: shares.get(post.id) || 0,
            current_user_reacted: reactedPostIds.has(post.id),
            reaction_users: reactionDetails.filter((reaction) => reaction.post_id === post.id),
            comments: commentDetails.filter((comment) => comment.post_id === post.id)
        }));
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

    static async createComment(postId, userId, content) {
        await Social.ensureTables();

        const [result] = await db.query(
            "INSERT INTO post_comments(post_id, user_id, content, created_at) VALUES(?,?,?,?)",
            [postId, userId, content, new Date()]
        );

        const [rows] = await db.query(
            `SELECT post_comments.*, users.username AS author, users.profile_photo AS author_photo
             FROM post_comments
             JOIN users ON post_comments.user_id = users.id
             WHERE post_comments.id = ?`,
            [result.insertId]
        );

        return rows[0];
    }

    static async createShare(postId, userId) {
        await Social.ensureTables();

        await db.query(
            "INSERT INTO post_shares(post_id, user_id, created_at) VALUES(?,?,?)",
            [postId, userId, new Date()]
        );
    }

    static async countsForPost(postId) {
        const [[reactionCount]] = await db.query("SELECT COUNT(*) AS count FROM post_reactions WHERE post_id = ?", [postId]);
        const [[commentCount]] = await db.query("SELECT COUNT(*) AS count FROM post_comments WHERE post_id = ?", [postId]);
        const [[shareCount]] = await db.query("SELECT COUNT(*) AS count FROM post_shares WHERE post_id = ?", [postId]);

        const [reactionUsers] = await db.query(
            `SELECT users.username AS author, users.profile_photo AS author_photo
             FROM post_reactions
             JOIN users ON post_reactions.user_id = users.id
             WHERE post_reactions.post_id = ?
             ORDER BY post_reactions.created_at ASC`,
            [postId]
        );

        return {
            reactions: reactionCount.count,
            comments: commentCount.count,
            shares: shareCount.count,
            reactionUsers
        };
    }
}

module.exports = Social;
