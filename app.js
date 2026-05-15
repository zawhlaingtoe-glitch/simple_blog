const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path')
const axios = require('axios')
const app = express();
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"))
app.use("/upload", express.static(path.join(__dirname, "public/upload")));

const PORT = process.env.PORT || 3500;
const HOST = process.env.HOST || 'localhost';

const userRoute = require("./routes/userRoute");
const postRoute = require("./routes/postRoute");
const Post = require("./models/postModel");
app.get("/", async(_, res) => {
    try {
        const posts = await Post.findAll(3, 0);
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


app.listen(PORT, HOST, () => {
    console.log(
        `Server is runnig at http://${HOST}:${PORT}`)
})
