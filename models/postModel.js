const db = require("../config/database");

class Post {
    static async ensureAuthorPhotoColumn() {
        try {
            await db.query("ALTER TABLE USERS ADD COLUMN profile_photo VARCHAR(255) NULL");
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }
    }

    static async ensureVisibilityColumn() {
        try {
            await db.query("ALTER TABLE POSTS ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'public'");
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }
    }

    static async findAll(limit = 5, offset = 0, currentUserId = null) {
        try {
            await Post.ensureAuthorPhotoColumn();
            await Post.ensureVisibilityColumn();

            let query = "";
            let params = [];

            if (currentUserId) {
                query = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo 
                         FROM POSTS 
                         LEFT JOIN USERS ON POSTS.user_id = USERS.id 
                         WHERE POSTS.visibility = 'public' OR POSTS.user_id = ? 
                         ORDER BY POSTS.id DESC LIMIT ? OFFSET ?`;
                params = [currentUserId, limit, offset];
            } else {
                query = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo 
                         FROM POSTS 
                         LEFT JOIN USERS ON POSTS.user_id = USERS.id 
                         WHERE POSTS.visibility = 'public' 
                         ORDER BY POSTS.id DESC LIMIT ? OFFSET ?`;
                params = [limit, offset];
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error("Error fetching posts: ", error);
            throw error;
        }
    }

    static async findByUserId(userId, includePrivate = false) {
        try {
            await Post.ensureAuthorPhotoColumn();
            await Post.ensureVisibilityColumn();

            let query = "";
            if (includePrivate) {
                query = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo 
                         FROM POSTS 
                         JOIN USERS ON POSTS.user_id = USERS.id 
                         WHERE POSTS.user_id = ? 
                         ORDER BY POSTS.created_at DESC`;
            } else {
                query = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo 
                         FROM POSTS 
                         JOIN USERS ON POSTS.user_id = USERS.id 
                         WHERE POSTS.user_id = ? AND POSTS.visibility = 'public' 
                         ORDER BY POSTS.created_at DESC`;
            }

            const [rows] = await db.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error("Error fetching user's posts: ", error);
            throw error;
        }
    }

    static async createPost(userId, title, content, photo, visibility = 'public') {
        const currentTime = new Date();
        try {
            await Post.ensureVisibilityColumn();
            const [rows] = await db.query(
                "INSERT INTO POSTS(user_id,title,content,photo,visibility,created_at) VALUES(?,?,?,?,?,?)", [userId, title, content, photo, visibility, currentTime]
            );
            console.log("Post created ID with: ", rows.insertId);
            return rows.insertId;
        } catch (error) {
            console.error("Error creating posts: ", error);
            throw error;
        }
    }

    static async findByid(id) {
        try {
            await Post.ensureAuthorPhotoColumn();
            await Post.ensureVisibilityColumn();
            const [rows] = await db.query(
                "SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo FROM POSTS JOIN USERS ON POSTS.user_id = USERS.id WHERE POSTS.id = ?", [id]
            );
            return rows[0];
        } catch (error) {
            console.error("Error: ", error);
            throw error;
        }
    }

    static async updatePost(id, title, content, photo = null, visibility = 'public', userId) {
        try {
            await Post.ensureVisibilityColumn();
            if (photo) {
                await db.query(
                    "UPDATE POSTS SET title = ?, content = ?, photo = ?, visibility = ? WHERE id = ? AND user_id = ?", [title, content, photo, visibility, id, userId]
                );
            } else {
                await db.query(
                    "UPDATE POSTS SET title = ?, content = ?, visibility = ? WHERE id = ? AND user_id = ?", [title, content, visibility, id, userId]
                );
            }
        } catch (error) {
            console.error("Error: ", error);
            throw error;
        }
    }

    static async deletePost(id) {
        try {
            await db.query("DELETE FROM POSTS WHERE id=?", [id]);
        } catch (error) {
            console.error("Error deleting the posts: ", error);
            throw error;
        }
    }

    static async findByTag(slug, limit = 10, offset = 0, currentUserId = null) {
        try {
            await Post.ensureVisibilityColumn();

            let query = "";
            let params = [];

            if (currentUserId) {
                query = `SELECT DISTINCT POSTS.*, username AS author, USERS.profile_photo AS author_photo
                         FROM POSTS
                         JOIN post_tags ON POSTS.id = post_tags.post_id
                         JOIN tags ON tags.id = post_tags.tag_id
                         JOIN USERS ON POSTS.user_id = USERS.id
                         WHERE tags.slug = ?
                           AND (POSTS.visibility = 'public' OR POSTS.user_id = ?)
                         ORDER BY POSTS.id DESC
                         LIMIT ? OFFSET ?`;
                params = [slug, currentUserId, limit, offset];
            } else {
                query = `SELECT DISTINCT POSTS.*, username AS author, USERS.profile_photo AS author_photo
                         FROM POSTS
                         JOIN post_tags ON POSTS.id = post_tags.post_id
                         JOIN tags ON tags.id = post_tags.tag_id
                         JOIN USERS ON POSTS.user_id = USERS.id
                         WHERE tags.slug = ? AND POSTS.visibility = 'public'
                         ORDER BY POSTS.id DESC
                         LIMIT ? OFFSET ?`;
                params = [slug, limit, offset];
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error("Error fetching posts by tag:", error);
            throw error;
        }
    }

    static async ensureFulltextIndex() {
        try {
            await db.query("ALTER TABLE POSTS ADD FULLTEXT INDEX ft_posts_search (title, content)");
            console.log("Fulltext search index ensured.");
        } catch (error) {
            // Index already exists — ignore duplicate key errors
            if (error.code !== "ER_DUP_KEYNAME" && error.code !== "HY000") {
                console.error("Fulltext index error:", error);
            }
        }
    }

    static async search(query, limit = 10, offset = 0, currentUserId = null) {
        try {
            await Post.ensureVisibilityColumn();

            // Use LIKE-based partial matching so e.g. searching "AI" matches "About AI"
            const searchTerm = `%${query}%`;
            let sql = "";
            let params = [];

            if (currentUserId) {
                sql = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo,
                               CASE
                                 WHEN POSTS.title LIKE ? THEN 3
                                 WHEN POSTS.content LIKE ? THEN 1
                                 ELSE 0
                               END AS relevance
                       FROM POSTS
                       LEFT JOIN USERS ON POSTS.user_id = USERS.id
                       WHERE (POSTS.title LIKE ? OR POSTS.content LIKE ?)
                         AND (POSTS.visibility = 'public' OR POSTS.user_id = ?)
                       ORDER BY relevance DESC, POSTS.id DESC LIMIT ? OFFSET ?`;
                params = [searchTerm, searchTerm, searchTerm, searchTerm, currentUserId, limit, offset];
            } else {
                sql = `SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo,
                               CASE
                                 WHEN POSTS.title LIKE ? THEN 3
                                 WHEN POSTS.content LIKE ? THEN 1
                                 ELSE 0
                               END AS relevance
                       FROM POSTS
                       LEFT JOIN USERS ON POSTS.user_id = USERS.id
                       WHERE (POSTS.title LIKE ? OR POSTS.content LIKE ?)
                         AND POSTS.visibility = 'public'
                       ORDER BY relevance DESC, POSTS.id DESC LIMIT ? OFFSET ?`;
                params = [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset];
            }

            const [rows] = await db.query(sql, params);
            return rows;
        } catch (error) {
            console.error("Error searching posts:", error);
            throw error;
        }
    }

    static async searchCount(query, currentUserId = null) {
        try {
            const searchTerm = `%${query}%`;
            let sql = "";
            let params = [];

            if (currentUserId) {
                sql = `SELECT COUNT(*) AS total FROM POSTS
                       WHERE (title LIKE ? OR content LIKE ?)
                         AND (visibility = 'public' OR user_id = ?)`;
                params = [searchTerm, searchTerm, currentUserId];
            } else {
                sql = `SELECT COUNT(*) AS total FROM POSTS
                       WHERE (title LIKE ? OR content LIKE ?)
                         AND visibility = 'public'`;
                params = [searchTerm, searchTerm];
            }

            const [
                [row]
            ] = await db.query(sql, params);
            return row.total;
        } catch (error) {
            console.error("Error counting search results:", error);
            throw error;
        }
    }

    static async countByTag(slug, currentUserId = null) {
        try {
            let query = "";
            let params = [];

            if (currentUserId) {
                query = `SELECT COUNT(DISTINCT POSTS.id) AS total
                         FROM POSTS
                         JOIN post_tags ON POSTS.id = post_tags.post_id
                         JOIN tags ON tags.id = post_tags.tag_id
                         WHERE tags.slug = ?
                           AND (POSTS.visibility = 'public' OR POSTS.user_id = ?)`;
                params = [slug, currentUserId];
            } else {
                query = `SELECT COUNT(DISTINCT POSTS.id) AS total
                         FROM POSTS
                         JOIN post_tags ON POSTS.id = post_tags.post_id
                         JOIN tags ON tags.id = post_tags.tag_id
                         WHERE tags.slug = ? AND POSTS.visibility = 'public'`;
                params = [slug];
            }

            const [
                [row]
            ] = await db.query(query, params);
            return row.total;
        } catch (error) {
            console.error("Error counting posts by tag:", error);
            throw error;
        }
    }

    static async countAll(currentUserId = null) {
        try {
            await Post.ensureVisibilityColumn();

            let query = "";
            let params = [];

            if (currentUserId) {
                query = `SELECT COUNT(*) AS total FROM POSTS WHERE visibility = 'public' OR user_id = ?`;
                params = [currentUserId];
            } else {
                query = `SELECT COUNT(*) AS total FROM POSTS WHERE visibility = 'public'`;
            }

            const [
                [row]
            ] = await db.query(query, params);
            return row.total;
        } catch (error) {
            console.error("Error counting posts:", error);
            throw error;
        }
    }
}

module.exports = Post;