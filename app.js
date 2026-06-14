const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path')
const axios = require('axios')
const jwt = require("jsonwebtoken");
const app = express();
dotenv.config();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());
app.use(morgan('dev'));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"))
app.use("/upload", express.static(path.join(__dirname, "public/upload")));

const User = require("./models/userModel");
const Tag = require("./models/tagModel");

// Ensure tag tables exist on startup
Tag.ensureTables().catch(err => console.error("Tag table error:", err));

// Manual cookie parser helper for global auth middleware
const getTokenFromCookie = (req) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="));
    return tokenCookie ? decodeURIComponent(tokenCookie.split("=")[1]) : null;
};

// Global authentication status middleware
app.use(async(req, res, next) => {
    const token = getTokenFromCookie(req);
    res.locals.currentUser = null;
    res.locals.isLoggedIn = false;

    if (token) {
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(verified.id);
            if (user) {
                req.user = verified;
                res.locals.currentUser = user;
                res.locals.isLoggedIn = true;
            }
        } catch (error) {
            // Token is invalid/expired, ignore and let them be guest
        }
    }
    next();
});

const PORT = process.env.PORT || 3500;
const HOST = process.env.HOST || 'localhost';

const userRoute = require("./routes/userRoute");
const postRoute = require("./routes/postRoute");
const Post = require("./models/postModel");
app.get("/", async(req, res) => {
    try {
        const posts = await Post.findAll(6, 0, req.user ?.id || null);
        return res.render("home", {
            title: "Home",
            posts: posts || []
        });
    } catch (error) {
        console.error("Home posts error:", error);
        return res.render("home", {
            title: "Home",
            posts: []
        });
    }
});
app.use("/posts", postRoute)
app.use("/users", userRoute)

app.use((req, res) => {
    return res.status(404).json({
        status: "error",
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});


const server = app.listen(PORT, HOST, () => {
    console.log(
        `Server is runnig at http://${HOST}:${PORT}`)
})

module.exports = server;