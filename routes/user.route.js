const  authMiddleware = require("../middlewares/authMiddleware");

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// CRUD de base
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/me", authMiddleware, userController.getMe);
router.get("/", userController.getAllUsers);
router.delete("/:id", userController.deleteUser);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
// Bloquer/Débloquer user
router.patch("/:id/block", userController.toggleBlockUser);



module.exports = router;
