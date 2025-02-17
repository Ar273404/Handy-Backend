import Job from "../Models/Job.js";
import User from "../Models/User.js";
import Booking from "../Models/Booking.js";

// Controller to create a job
const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      city,
      state,
      coordinates,
      compensation,
      duration,
      requiredExpertise,
    } = req.body;
    const providerId = req.user.userId; // Extracted from JWT

    // Check if the user is a provider
    const provider = await User.findById(providerId);
    if (!provider || provider.userType !== "provider") {
      return res
        .status(403)
        .json({ message: "Only providers can create jobs", success: false });
    }

    // Create new job
    const newJob = new Job({
      title,
      description,
      location: { city, state, coordinates },
      compensation,
      duration,
      requiredExpertise,
      providerId,
    });

    const savedJob = await newJob.save();

    return res
      .status(201)
      .json({ message: "Job created Successfully!!", success: true });
  } catch (err) {
    console.log("Server side job creation error", err.message);
    return res
      .status(500)
      .json({ success: false, message: "job creation error from server side" });
  }
};

// Controller to fetch all jobs (with filters)
const getJobsForWorkers = async (req, res) => {
  try {
    const {
      expertise,
      city,
      state,
      compensationRange,
      sortBy,
      maxDistance,
      coordinates,
    } = req.query;

    // Build query dynamically based on filters
    const query = { status: "open" }; //Only show jobs with status 'open'

    if (expertise) query.requiredExpertise = { $in: [expertise] };
    if (city) query["location.city"] = city;
    if (state) query["location.state"] = state;
    if (compensationRange) {
      const [min, max] = compensationRange.split("-").map(Number);
      query.compensation = { $gte: min, $lte: max };
    }

    // Geolocation-based filtering (if distance and coordinates provided)
    if (maxDistance && coordinates) {
      const [longitude, latitude] = coordinates.split(",").map(Number);
      query["location.coordinates"] = {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: parseInt(maxDistance, 10),
        },
      };
    }

    // Pagination support
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let sortOptions = {};
    if (sortBy === "compensation") sortOptions.compensation = -1;
    else if (sortBy === "distance" && coordinates)
      sortOptions["location.coordinates"] = 1;
    else if (sortBy === "rating") sortOptions.rating = -1;

    const jobs = await Job.find(query)
      .populate("providerId", "name location")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalJobs = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server side error in getting jobs", success: true });
  }
};

// Controller to fetch a single job by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).populate("providerId", "name location");
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.status(200).json(job);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Controller to apply  for job by worker
const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const workerId = req.user.userId; // Worker ID from authenticated user

    const job = await Job.findById(jobId);
    if (!job)
      return res.status(404).json({ message: "Job not found", success: true });

    // Check if the worker has already applied
    if (
      job.applicants.some(
        (applicant) => applicant.workerId.toString() === workerId
      )
    ) {
      return res
        .status(400)
        .json({ message: "Already applied for this job", success: true });
    }

    // Add the worker to the applicants
    job.applicants.push({ workerId, status: "applied" });
    await job.save();

    return res
      .status(200)
      .json({ message: "Applied successfully", success: true });
  } catch (error) {
    console.log("Server side job apply error", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server side job apply error" });
  }
};

// Job Completion (Provider and Worker rate each other)
const completeJob = async (req, res) => {
  const { jobId, workerRating, providerRating, workerReview, providerReview } =
    req.body;

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Change the job status to completed
    job.status = "completed";
    await job.save();

    // Update the Booking status and ratings
    const booking = await Booking.findOne({ jobId, workerId: req.user._id });
    booking.status = "completed";
    booking.rating.workerRating = workerRating;
    booking.rating.providerRating = providerRating;
    await booking.save();

    // Add reviews to users (worker and provider)
    if (workerReview) {
      const worker = await User.findById(job.providerId);
      worker.reviews.push({
        reviewerId: job.providerId,
        comment: workerReview,
        rating: workerRating,
      });
      await worker.save();
    }

    if (providerReview) {
      const provider = await User.findById(job.providerId);
      provider.reviews.push({
        reviewerId: req.user._id,
        comment: providerReview,
        rating: providerRating,
      });
      await provider.save();
    }

    res.status(200).json({ message: "Job completed and ratings saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// for worker dashboard

// Get jobs that the worker has applied to
const getAppliedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ "applicants.workerId": req.user.userId });
    return res.json({ jobs, success: true });
  } catch (error) {
    console.log("Server side getting worker aplliedJob error", error.message);
    return res.status(500).json({
      success: false,
      message: "Server side getting worker aplliedJob error",
    });
  }
};

// Get jobs where the worker is accepted
const getAcceptedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      "applicants.workerId": req.user.userId,
      "applicants.status": "accepted",
    });
    return res.json({ jobs, success: true });
  } catch (error) {
    console.log("Server side getting worker Accepted job error", error.message);
    return res.status(500).json({
      success: false,
      message: "Server side getting worker Accepted job error",
    });
  }
};

// for provider dashboard
// Get jobs posted by the provider
const getPostedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ providerId: req.user.userId });
    return res.json({ jobs, success: true });
  } catch (error) {
    console.log(
      "Server side getting worker provider Posted error",
      error.message
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "Server side getting provider Posted job error",
      });
  }
};

// Accept a worker for a job (hiring process)
const acceptWorkerForJob = async (req, res) => {
  const { jobId, workerId } = req.body;

  try {
    const job = await Job.findById(jobId);
    if (!job)
      return res.status(404).json({ message: "Job not found", success: true });

    // Find the worker in the applicants list and update their status
    const applicant = job.applicants.find(
      (applicant) => applicant.workerId.toString() === workerId
    );

    if (!applicant)
      return res
        .status(404)
        .json({ message: "Worker not found in applicants", success: true });

    // Update applicant's status to accepted
    applicant.status = "accepted";

    // Change the job status to in progress
    job.status = "in progress";
    await job.save();

    // Create a booking for the job
    const booking = new Booking({
      jobId: job._id,
      workerId,
      providerId: job.providerId,
      startTime: new Date(),
      status: "ongoing",
    });
    await booking.save();

    return res
      .status(200)
      .json({
        message: "Worker accepted and job in progress",
        booking,
        success: true,
      });
  } catch (error) {
    console.log("Server side Worker accepted error", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server side Worker accepted error" });
  }
};


export {
  createJob,
  getJobsForWorkers,
  getJobById,
  applyForJob,
  acceptWorkerForJob,
  completeJob,
  getAppliedJobs,
  getAcceptedJobs,
  getPostedJobs,
};
