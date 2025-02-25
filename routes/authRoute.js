import express from "express";
import upload from "../utils/multer.js";
import { signup, login, userInfo, logout } from "../Controllers/authController.js";
import verifyToken from "../Middleware/authMiddleware.js";
const router = express.Router();

router.post(
  "/signup",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "aadharCard", maxCount: 1 },
  ]),
  signup
);

router.post("/login", login);
router.post("/logout",logout);

router.get("/user/me", verifyToken, userInfo);

export default router;
