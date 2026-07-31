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


Tag.ensureTables().catch(err => console.error("Tag table error:", err));


const getTokenFromCookie = (req) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="));
    return tokenCookie ? decodeURIComponent(tokenCookie.split("=")[1]) : null;
};


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
            
        }
    }
    
    res.locals.readingTime = (content) => {
        if (!content) return '1 min read';
        const text = String(content).replace(/<[^>]*>/g, '');
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(wordCount / 200));
        return minutes + ' min read';
    };
    res.locals.serverHost = 'http://localhost:3500';

    next();
});

const PORT = process.env.PORT || 3500;
const HOST = process.env.HOST || 'localhost';

const userRoute = require("./routes/userRoute");
const postRoute = require("./routes/postRoute");


const apiAuthRoute = require("./routes/api/authApiRoute");
const apiPostRoute = require("./routes/api/postApiRoute");
const apiUserRoute = require("./routes/api/userApiRoute");
const apiTagRoute  = require("./routes/api/tagApiRoute");

app.use("/api/v1/auth",  apiAuthRoute);
app.use("/api/v1/posts", apiPostRoute);
app.use("/api/v1/users", apiUserRoute);
app.use("/api/v1/tags",  apiTagRoute);


app.use("/api", (req, res) => {
    return res.status(404).json({
        status: "error",
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});


const Post = require("./models/postModel");
app.get("/", async(req, res) => {
    try {
        let posts = await Post.findAll(6, 0, req.user ?.id || null);
        const Tag = require("./models/tagModel");
        posts = await Tag.attachToPosts(posts);
        const popularTags = await Tag.findAllWithCounts(15);
        return res.render("home", {
            title: "Home",
            posts: posts || [],
            popularTags
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