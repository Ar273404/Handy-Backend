import express from 'express';
import verifyToken from '../Middleware/authMiddleware.js';
import { getWorkerDashboard ,editWorkerProfile} from '../Controllers/workerController.js';

const router = express.Router();

router.get('/dashboard' , verifyToken, getWorkerDashboard);
router.get('/edit-profile' , verifyToken, editWorkerProfile);


export default router;