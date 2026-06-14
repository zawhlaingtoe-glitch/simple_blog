const db = require("../config/database");

class Tag {
    static async ensureTables() {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS tags (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(50) NOT NULL,
                    slug VARCHAR(50) NOT NULL UNIQUE,
                    created_at DATETIME NOT NULL
                )
            `);
        } catch (error) {
            console.error("Error creating tags table:", error);
            throw error;
        }

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS post_tags (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    post_id INT NOT NULL,
                    tag_id INT NOT NULL,
                    UNIQUE KEY unique_post_tag (post_id, tag_id)
                )
            `);
        } catch (error) {
            console.error("Error creating post_tags table:", error);
            throw error;
        }
    }

    static slugify(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            || "tag";
    }

    static async findOrCreate(name) {
        const slug = Tag.slugify(name);
        let [rows] = await db.query("SELECT * FROM tags WHERE slug = ?", [slug]);
        if (rows.length > 0) return rows[0];

        await db.query(
            "INSERT INTO tags (name, slug, created_at) VALUES (?, ?, ?)",
            [name.trim(), slug, new Date()]
        );
        const [newRows] = await db.query("SELECT * FROM tags WHERE slug = ?", [slug]);
        return newRows[0];
    }

    static async syncPostTags(postId, tagNames) {
        await Tag.ensureTables();

        // Remove existing tags
        await db.query("DELETE FROM post_tags WHERE post_id = ?", [postId]);

        if (!tagNames || tagNames.length === 0) return;

        for (const name of tagNames) {
            const trimmed = name.trim();
            if (!trimmed) continue;

            const tag = await Tag.findOrCreate(trimmed);
            await db.query(
                "INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
                [postId, tag.id]
            );
        }
    }

    static async findByPostId(postId) {
        const [rows] = await db.query(
            `SELECT tags.* FROM tags
             JOIN post_tags ON tags.id = post_tags.tag_id
             WHERE post_tags.post_id = ?
             ORDER BY tags.name ASC`,
            [postId]
        );
        return rows;
    }

    static async attachToPosts(posts) {
        if (!posts || posts.length === 0) return posts;

        const postIds = posts.map(p => p.id);
        const placeholders = postIds.map(() => "?").join(",");

        const [rows] = await db.query(
            `SELECT post_tags.post_id, tags.* FROM tags
             JOIN post_tags ON tags.id = post_tags.tag_id
             WHERE post_tags.post_id IN (${placeholders})
             ORDER BY tags.name ASC`,
            postIds
        );

        const tagMap = new Map();
        rows.forEach(row => {
            if (!tagMap.has(row.post_id)) tagMap.set(row.post_id, []);
            tagMap.get(row.post_id).push({
                id: row.id,
                name: row.name,
                slug: row.slug
            });
        });

        return posts.map(post => ({
            ...post,
            tags: tagMap.get(post.id) || []
        }));
    }

    static async findAllWithCounts(limit = 20) {
        await Tag.ensureTables();

        const [rows] = await db.query(
            `SELECT tags.*, COUNT(post_tags.post_id) AS post_count
             FROM tags
             LEFT JOIN post_tags ON tags.id = post_tags.tag_id
             GROUP BY tags.id
             HAVING post_count > 0
             ORDER BY post_count DESC
             LIMIT ?`,
            [limit]
        );
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.query("SELECT * FROM tags WHERE slug = ?", [slug]);
        return rows[0];
    }
}

module.exports = Tag;
