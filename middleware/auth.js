const jwt = require("jsonwebtoken");

const getTokenFromCookie = (req) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="));

    return tokenCookie ? decodeURIComponent(tokenCookie.split("=")[1]) : null;
};

const verifyToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];
    const bearerToken = authHeader && authHeader.split(" ")[1];
    const token = bearerToken || getTokenFromCookie(req);


    if (!token) {
        if (req.accepts("html")) {
            return res.redirect("/users/login");
        }

        return res.status(401).json({
            status: "error",
            message: "Access denied. No token provided."
        });
    }

    try {

        const verified = jwt.verify(token, process.env.JWT_SECRET);

        req.user = verified;


        next();
    } catch (error) {
        if (req.accepts("html")) {
            return res.redirect("/users/login");
        }

        return res.status(403).json({
            status: "error",
            message: "Token is not valid."
        });
    }
};



const verifyTokenAndAuthorization = (req, res, next) => {

    verifyToken(req, res, () => {

        const userIdFromToken =
            req.user?.id ||
            req.user?._id;

        const paramId = req.params.id;

        if (
            String(userIdFromToken) === String(paramId) ||
            req.user?.isAdmin
        ) {
            return next();
        }

        return res.status(403).json({
            status: "error",
            message: "You are not allowed to do that!"
        });
    });
};

module.exports = {
    verifyToken,
    verifyTokenAndAuthorization
};
