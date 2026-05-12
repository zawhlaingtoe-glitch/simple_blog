const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const cors = require('cors');
const path = require("path")
const app = express();
dotenv.config();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static('./public/upload'));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
app.get("/", (req, res) => {
    return res.render("home", {
        title: "Home"
    })
})
app.listen(PORT, HOST, () => {
    console.log(
        `Server is runnig at http://${HOST}:${PORT}`)
})