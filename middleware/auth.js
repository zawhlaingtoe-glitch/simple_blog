const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];


    if (!token) {
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
