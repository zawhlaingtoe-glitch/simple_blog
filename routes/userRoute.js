const express = require("express");
const route = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, verifyTokenAndAuthorization } = require("../middleware/auth");

route.get("/register", userController.showRegisterForm);
route.post("/register", userController.register);
route.get("/login", userController.showLoginForm);
route.post("/login", userController.login);
route.get("/logout", userController.logout);

route.get("/profile", verifyToken, userController.profile);
route.get("/profile/edit", verifyToken, userController.showEditProfile);
route.post("/profile", verifyToken, userController.updateProfile);
route.post("/profile/posts", verifyToken, userController.createProfilePost);
route.post("/profile/posts/:id/delete", verifyToken, userController.deleteProfilePost);

route.get("/me/:id", verifyTokenAndAuthorization, userController.currentUser);
route.put("/update/:id", verifyTokenAndAuthorization, userController.updateUser);
route.delete("/delete/:id", verifyTokenAndAuthorization, userController.delete);
route.get("/:id", userController.publicProfile);

module.exports = route;
