const express = require("express");
const router = express.Router();
const auth = require("../../controllers/api/authApiController");
const { verifyToken } = require("../../middleware/auth");

// Public
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/logout", auth.logout);

// Protected
router.get("/me", verifyToken, auth.me);

module.exports = router;
