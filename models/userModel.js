const db = require("../config/database");
const bcrypt = require("bcrypt");

class User {
    static async findALL() {
        try {
            const [users] = await db.query("SELECT * FROM USERS");
            return users;
        } catch (error) {
            console.error("Error fetch users: ", error);
            throw error;
        }
    }


    static async findByEmail(email) {
        try {
            const [users] = await db.query("SELECT * FROM  USERS WHERE email =?", [email]);
            return users[0];
        } catch (error) {
            console.error("Error finding by email: ", error);
            throw error
        }
    }

    static async findById(id) {
        try {
            const [users] = await db.query("SELECT * FROM USERS WHERE id =?", [id]);
            return users[0]
        } catch (error) {
            console.error("Error finding by id ", error);
            throw error
        }
    }
    static async createUser(username, email, password) {
        try {
            const oldUser = await User.findByEmail(email);
            if (oldUser) {
                throw new Error("User already exist!")
            };
            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await db.query("INSERT INTO USERS(username,email,password) VALUES(?,?,?)", [username, email, hashedPassword])

            return result.insertId;
            console.log(result.insertId)
        } catch (error) {
            console.error("Error creating user: ", error);
            throw error
        }
    }
    static async login(email, password) {
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid email or password");
        }

        return user;
    }
    static async deleteUser(id) {
        try {
            await db.query("DELETE FROM USERS WHERE id =?", [id])
        } catch (error) {
            console.error("Error deleting users ", error);
            throw error
        }
    }
    static async updateUser(id, username, email, password = null) {
    try {

        if (password) {

            const hashedPassword = await bcrypt.hash(password, 10);

            await db.query(
                "UPDATE USERS SET username = ?, email = ?, password = ? WHERE id = ?",
                [username, email, hashedPassword, id]
            );

        } else {

            await db.query(
                "UPDATE USERS SET username = ?, email = ? WHERE id = ?",
                [username, email, id]
            );
        }

        return await User.findById(id);

    } catch (error) {

        console.error("Error updating users:", error);
        throw error;
    }
}
}

module.exports = User
