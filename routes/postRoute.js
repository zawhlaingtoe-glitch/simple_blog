const express = require("express");
const route = express.Router();
const postController = require("../controllers/postController")
const verify = require("../middleware/auth");
route.post("/create", verify.verifyToken, postController.create)
route.get("/userposts/:userId", verify.verifyToken, postController.getUserPosts);
route.put("/update/:id", verify.verifyToken, postController.updatePost)
route.delete("/delete/:id", verify.verifyToken, postController.deletePost)
module.exports = route;