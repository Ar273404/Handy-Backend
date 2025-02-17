import express from 'express';
import { createJob, getJobsForWorkers , getJobById, applyForJob, acceptWorkerForJob, completeJob, getAppliedJobs, getAcceptedJobs, getPostedJobs } from '../Controllers/jobControllers.js'
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Route to create a job (provider-only)
router.post('/create', verifyToken, createJob);

// Route to fetch all jobs (with optional filters)
router.get('/for-workers', verifyToken, getJobsForWorkers );

// Route to fetch a single job by ID
router.get('/:id', getJobById);

// Apply to a job
router.post('/:jobId/apply', verifyToken, applyForJob);

// accept worker for a job
router.post('/accept-worker', verifyToken, acceptWorkerForJob);

// complete the job and submit ratings
router.post('/complete', verifyToken, completeJob);

// Worker Routes
router.get('/applied', verifyToken, getAppliedJobs);
router.get('/accepted', verifyToken, getAcceptedJobs);

// Provider Routes
router.get('/posted', verifyToken, getPostedJobs);
router.post('/accept-worker', verifyToken, acceptWorkerForJob);  // accept worker for a job

export default router;
