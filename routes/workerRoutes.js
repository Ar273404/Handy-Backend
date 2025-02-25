import express from "express";
import verifyToken from "../Middleware/authMiddleware.js";
import upload from "../utils/multer.js";
import {
  getApplications,
  markJobAsCompleted,
  rateProvider,
  changePaymentStatus,
  getJobAnalytics,
  getMessages,
  getWorkerJobs,
  getWorkerDashboard,
  getWorkerProfile,
  getWorkerReviews,
  getWorkerSummary,
  sendMessage,
  updateWorkerProfile,
  withdrawApplication,
  withdrawWorkerApplication,
} from "../Controllers/workerController.js";

const router = express.Router();

router.get("/dashboard", verifyToken, getWorkerDashboard);
router.get("/summary", verifyToken, getWorkerSummary);
router.get("/jobs", verifyToken, getWorkerJobs);
router.put("/withdraw-application/:jobId", verifyToken, withdrawApplication);
router.get("/analytics", verifyToken, getJobAnalytics);
router.get("/reviews", verifyToken, getWorkerReviews);
router.put("/mark-completed/:jobId", verifyToken, markJobAsCompleted);
router.put("/rate-provider/:jobId", verifyToken, rateProvider);
router.put("/change-payment-status/:jobId", verifyToken, changePaymentStatus);
router.get("/chat/:jobId/:providerId", verifyToken, getMessages);
router.post("/chat/:jobId/:providerId", verifyToken, sendMessage);
router.get("/applications", verifyToken, getApplications);
router.post(
  "/applications/:applicationId/withdraw",
  verifyToken,
  withdrawWorkerApplication
);
router.get("/profile", verifyToken, getWorkerProfile);
router.put(
  "/update-profile",
  verifyToken,
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  updateWorkerProfile
);

export default router;
