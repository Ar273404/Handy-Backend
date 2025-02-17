import User from "../Models/User.js";
import Job from "../Models/Job.js";
import Booking from '../Models/Booking.js'


// Fetch Worker Dashboard Data
const getWorkerDashboard = async (req, res) => {
  try {
    const workerId = req.user.userId;

    console.log("worker " + workerId);
    // Fetch worker profile
    const worker = await User.findById(workerId).select('-password');
    if (!worker || worker.userType !== 'worker') {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    // Fetch testimonials (reviews)
    const testimonials = worker.reviews;

    // Fetch completed jobs
    const completedJobs = await Job.find({ 'applicants.workerId': workerId, status: 'completed' }).populate(
      'providerId',
      'name email'
    );

    return res.status(200).json({ success: true, worker, testimonials, completedJobs });

  } catch (err) {
    console.error("Server error in worker dashboard " + err);
    return res.status(500).json({ success: false, message: 'Server error in worker dashboard' });
  }
};

const editWorkerProfile = async (req, res) => {
  try {
    const workerId = req.user.userId; // Assuming user authentication middleware sets `req.user`
    const {
      name,
      expertise,
      experience,
      expectedCompensation,
      profileImage,
    } = req.body;

    console.log("edit profile");

    // // Validate input (optional but recommended)
    // if (!name || !phone || !location) {
    //   return res.status(400).json({ success: false, message: 'Name, phone, and location are required.' });
    // }

    // Update the worker's profile
    const updatedWorker = await User.findByIdAndUpdate(
      workerId,
      {
        name,
        expertise,
        experience,
        expectedCompensation,
        ...(profileImage && { profileImage }), // Update profileImage only if provided
      },
      { new: true } // Return the updated document
    );

    if (!updatedWorker) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      worker: updatedWorker,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'An error occurred while updating the profile.' });
  }
};


export {getWorkerDashboard , editWorkerProfile};