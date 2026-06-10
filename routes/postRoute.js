const express = require("express");
const route = express.Router();
const postController = require("../controllers/postController")
const verify = require("../middleware/auth");
route.get("/create", verify.verifyToken, postController.showCreateForm);
route.get('/', postController.index);
route.get("/edit/:id", verify.verifyToken, postController.showEditForm);
route.post("/create", verify.verifyToken, postController.create)
route.post("/update/:id", verify.verifyToken, postController.updatePost)
route.post("/delete/:id", verify.verifyToken, postController.deletePost)
route.post("/:id/reactions", verify.verifyToken, postController.toggleReaction)
route.post("/:id/comments", verify.verifyToken, postController.createComment)
route.post("/:id/shares", verify.verifyToken, postController.createShare)
route.get("/userposts/:userId", verify.verifyToken, postController.getUserPosts);
route.get("/:id", postController.showPost);
route.put("/update/:id", verify.verifyToken, postController.updatePost)
route.delete("/delete/:id", verify.verifyToken, postController.deletePost)
module.exports = route;
