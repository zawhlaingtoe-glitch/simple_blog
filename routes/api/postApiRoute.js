const express = require("express");
const router = express.Router();
const post = require("../../controllers/api/postApiController");
const { verifyToken } = require("../../middleware/auth");

// ── Public routes ────────────────────────────────────────────────────────────
router.get("/", post.index);
router.get("/search", post.search);
router.get("/tag/:slug", post.getByTag);
router.get("/user/:userId", post.getByUser);
router.get("/:id", post.show);

// ── Protected routes (require JWT) ───────────────────────────────────────────
router.post("/", verifyToken, post.create);
router.post("/upload-image", verifyToken, post.uploadEditorImage);
router.put("/:id", verifyToken, post.update);
router.delete("/:id", verifyToken, post.destroy);

// Social interactions
router.post("/:id/reactions", verifyToken, post.toggleReaction);
router.post("/:id/comments", verifyToken, post.createComment);
router.post("/:id/comments/:commentId/reply", verifyToken, post.replyToComment);
router.delete("/:id/comments/:commentId", verifyToken, post.deleteComment);
router.post("/:id/shares", verifyToken, post.toggleShare);

module.exports = router;
