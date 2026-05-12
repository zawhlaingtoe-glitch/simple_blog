const jwt = require("jsonwebtoken");
const verifyToken = (req, res, next) => {

    console.log("Headers", req.headers);
    const token = req.headers.authorzation ?.split(" ")[1];
    if (!token) {
        console.log("Acesses denied! ");

    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).send("Token is not valid! ")
    }

}

module.exports = { verifyToken };