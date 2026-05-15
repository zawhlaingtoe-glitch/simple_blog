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
route.get("/userposts/:userId", verify.verifyToken, postController.getUserPosts);
route.put("/update/:id", verify.verifyToken, postController.updatePost)
route.delete("/delete/:id", verify.verifyToken, postController.deletePost)
module.exports = route;
