const db = require("../config/database");


class Post {
    static async findAll(limit = 5, offset = 0) {
        try {
            const [rows] = await db.query("SELECT posts.*, users.name AS author FROM posts LEFT JOIN users ON posts.user_id = users.id ORDER BY posts.id DESC LIMIT ? OFFSET ?", [limit, offset]);
            return rows
        } catch (error) {
            console.error("Error fetching posts: ", error);
            throw error
        }

    }

    static async createPost(userId, title, content, photo) {
        const currentTime = new Date();
        try {
            const [rows] = await db.query("INSERT INTO POSTS(user_id,title,content,photo,create_time) VALUES(?,?,?,?,?)", [userId, title, content, currentTime])
            console.log("Post created ID with: ", rows.insertId);
            return rows.insertId
        } catch (error) {
            console.error("Error creating posts: ", error);
            throw error
        }

    }
    static async findByid(id) {
        try {
            const [rows] = await db.query("SELECT posts.*, users.name AS author FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?", [id])
            return rows[0]
        } catch (error) {
            console.error("Error: ", error)
            throw error
        }
    }

    static async updatePost(id, title, content, photo, user_id) {
        try {
            await db.query("UPDATE POSTS SET user_id =?, title =?, content =?, photo =? where id =?", [user_id, title, content, photo, id])
        } catch (error) {
            console.error("Error: ", error)
            throw error
        }
    }

    static async deletePost(id) {
        try {
            await db.query("DELETE FROM POSTS WHERE id=?", [id])
        } catch (error) {
            console.error("Error deleting the posts: ", error)
            throw error
        }
    }
};
module.exports = { Post }