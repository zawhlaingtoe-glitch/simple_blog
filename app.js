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

app.use(express.static('./public/upload'));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
const PORT = process.env.PORT || 3500;
const HOST = process.env.HOST || 'localhost';

const userRoute = require("./routes/userRoute");
app.get("/", (req, res) => {
    console.log("hello")
    return res.status(200).json({
        message: "hello"
    })

})
const postRoute = require("./routes/postRoute");
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