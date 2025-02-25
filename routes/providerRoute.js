import express from "express";
import verifyToken from "../Middleware/authMiddleware.js";
import {
  getCompletedJobs,
  getJobAnalytics,
  getJobApplications,
  getJobs,
  getPaymentDetails,
  getProviderDashboardStats,
  submitRating,
  updateJobApplicationStatus,
  updateJobStatus,
} from "../Controllers/providerController.js";

const router = express.Router();

router.get("/summary", verifyToken, getProviderDashboardStats);

router.get("/analytics", verifyToken, getJobAnalytics);
router.get("/jobs", verifyToken, getJobs);
router.put("/jobs/:jobId/status", verifyToken, updateJobStatus);
router.get("/job-applications/:jobId", verifyToken, getJobApplications);
router.put(
  "/job-application/:jobId/:workerId",
  verifyToken,
  updateJobApplicationStatus
);
router.get("/completed-jobs", verifyToken, getCompletedJobs);
router.post("/submit-rating", verifyToken, submitRating);
router.get("/expenses", verifyToken, getPaymentDetails);

export default router;

