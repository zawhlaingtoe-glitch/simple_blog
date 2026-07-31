const express = require("express");
const route = express.Router();
const postController = require("../controllers/postController")
const verify = require("../middleware/auth");
route.get("/create", verify.verifyToken, postController.showCreateForm);
route.get('/', postController.index);
route.get("/search/live", postController.liveSearch);
route.get("/search", postController.search);
route.get("/tag/:slug", postController.getPostsByTag);
route.get("/edit/:id", verify.verifyToken, postController.showEditForm);
route.post("/create", verify.verifyToken, postController.create)
route.post("/editor-image", verify.verifyToken, postController.uploadEditorImage)
route.post("/update/:id", verify.verifyToken, postController.updatePost)
route.post("/delete/:id", verify.verifyToken, postController.deletePost)
route.post("/:id/reactions", verify.verifyToken, postController.toggleReaction)
route.post("/:id/comments", verify.verifyToken, postController.createComment)
route.post("/:id/shares", verify.verifyToken, postController.toggleShare)
route.post("/:id/comments/:commentId/reply", verify.verifyToken, postController.replyToComment)
route.delete("/:id/comments/:commentId", verify.verifyToken, postController.deleteComment)
route.get("/userposts/:userId", verify.verifyToken, postController.getUserPosts);
route.get("/:id", postController.showPost);
route.put("/update/:id", verify.verifyToken, postController.updatePost)
route.delete("/delete/:id", verify.verifyToken, postController.deletePost)
module.exports = route;
