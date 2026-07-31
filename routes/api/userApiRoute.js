const express = require("express");
const router = express.Router();
const user = require("../../controllers/api/userApiController");
const { verifyToken, verifyTokenAndAuthorization } = require("../../middleware/auth");

// Public
router.get("/", user.index);
router.get("/me", verifyToken, user.me);  // must be before /:id
router.get("/:id", user.show);

// Protected (self only)
router.put("/:id", verifyTokenAndAuthorization, user.update);
router.delete("/:id", verifyTokenAndAuthorization, user.destroy);

module.exports = router;
