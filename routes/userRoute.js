const express = require("express");
const route = express.Router();
const userController = require("../controllers/userController");
const verify = require("../middleware/auth")

route.post("/register", userController.register)
route.post("/login", userController.login);
route.get("/me/:id", verify.verifyToken, verify.verifyTokenAndAuthorization, userController.currentUser)
route.put("/update/:id", verify.verifyToken, verify.verifyTokenAndAuthorization, userController.updateUser)
route.delete("/delete/:id", verify.verifyToken, verify.verifyTokenAndAuthorization, userController.delete)
module.exports = route;