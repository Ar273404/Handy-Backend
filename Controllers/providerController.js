import User from "../Models/User.js";
import Job from "../Models/Job.js";
import Booking from "../Models/Booking.js";
import Chat from "../Models/Chat.js";
import mongoose from "mongoose";
// import PDFDocument from 'pdfkit';
// import fs from 'fs';
// import path from 'path';

const getProviderDashboardStats = async (req, res) => {
  try {
    const providerId = req.user.userId;

    // Fetch the provider's rating (based on reviews from workers)
    const provider = await User.findById(providerId);
    const rating = provider.rating;

    // Count jobs for the provider
    const totalJobs = await Job.countDocuments({ providerId });
    const ongoingJobs = await Job.countDocuments({
      providerId,
      status: "in progress",
    });
    const completedJobs = await Job.countDocuments({
      providerId,
      status: "completed",
    });
    const canceledJobs = await Job.countDocuments({
      providerId,
      status: "cancelled",
    });
    const openJobs = await Job.countDocuments({ providerId, status: "open" });

    // Send the stats to the client
    return res.status(200).json({
      success: true,
      providerStats: {
        rating: rating,
        ongoingJobs: ongoingJobs,
        completedJobs: completedJobs,
        canceledJobs: canceledJobs,
        openJobs: openJobs,
        totalJobs: totalJobs,
      },
    });
  } catch (err) {
    console.error("Server error in provider job analytics " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in provider job analytics",
      });
  }
};

const getJobAnalytics = async (req, res) => {
  try {
    const providerId = req.user.userId;

    // Calculate average job completion time, workers applied, job success rate
    const jobs = await Job.find({ providerId });
    const bookings = await Booking.find({ providerId });

    const averageCompletionTime =
      jobs.reduce((acc, job) => {
        const booking = bookings.find(
          (b) => b.jobId.toString() === job._id.toString()
        );
        if (booking && booking.status === "completed") {
          const timeTaken =
            (new Date(booking.endTime) - new Date(booking.startTime)) /
            (1000 * 60 * 60);
          return acc + timeTaken;
        }
        return acc;
      }, 0) / bookings.length;

    const workersApplied = jobs.reduce(
      (acc, job) => acc + job.applicants.length,
      0
    );
    const successfulJobs = bookings.filter(
      (b) => b.status === "completed"
    ).length;
    const totalJobs = bookings.length;
    const successRate = totalJobs ? (successfulJobs / totalJobs) * 100 : 0;

    // Get job breakdown by expertise required
    const jobBreakdown = await Job.aggregate([
      { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
      { $unwind: "$requiredExpertise" },
      { $group: { _id: "$requiredExpertise", count: { $sum: 1 } } },
      { $project: { jobType: "$_id", count: 1, _id: 0 } },
    ]);

    return res.json({
      analytics: {
        averageCompletionTime,
        workersApplied,
        successRate,
      },
      jobBreakdown,
    });
  } catch (err) {
    console.error("Server error in provider job analytics " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in provider job analytics",
      });
  }
};

const getJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { providerId: req.user.userId };
    if (status && status !== "all") query.status = status;
    const jobs = await Job.find(query).populate(
      "applicants.workerId",
      "name rating"
    );
    return res.json({ success: true, jobs });
  } catch (err) {
    console.error("Server error in getting job lists " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in getting job lists" });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    const job = await Job.findByIdAndUpdate(jobId, { status }, { new: true });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // if (job.workerId) {
    //   const booking = await Booking.findOne({ jobId: job._id });

    //   if (booking) {
    //     // Update the booking status based on job status
    //     booking.status = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'ongoing';
    //     await booking.save();
    //   }
    // }

    if (job.status === "completed" || job.status === "cancelled") {
      // Find the booking by jobId
      const booking = await Booking.findOne({ jobId });

      if (booking) {
        // Update the booking status to match the job status
        booking.status = job.status;

        // If the job is completed, set the end time for the booking
        if (job.status === "completed") {
          booking.endTime = new Date(); // Set the end time to the current time
        }

        // Save the updated booking
        await booking.save();
      }
    }

    return res.json({ success: true, job });
  } catch (err) {
    console.error("Server error in updating job status " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in updating job status" });
  }
};

const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).populate(
      "applicants.workerId"
    );
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    return res.json({ success: true, applicants: job.applicants });
  } catch (err) {
    console.error("Server error in fetching applicants " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in fetching applicants" });
  }
};

// Optionally, you can notify the worker here using a notification system
const updateJobApplicationStatus = async (req, res) => {
  try {
    const { jobId, workerId } = req.params;
    const { status } = req.body;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const applicant = job.applicants.find(
      (app) => app.workerId.toString() === workerId
    );

    if (!applicant) {
      return res
        .status(404)
        .json({ success: false, message: "Applicant not found" });
    }

    applicant.status = status;

    // If the status is 'accepted', create a booking and update the job
    if (status === "accepted") {
      // Reject all other applicants
      job.applicants.forEach((app) => {
        if (app.workerId.toString() !== workerId) {
          app.status = "rejected";
        }
      });

      job.status = "in progress";

      const booking = new Booking({
        jobId: job._id,
        workerId: workerId,
        providerId: job.providerId,
        startTime: new Date(),
        status: "ongoing",
        paymentStatus: "pending",
      });

      await job.save();
      await booking.save();
    }

    await job.save();

    return res.json({ success: true, message: `Application ${status}` });
  } catch (err) {
    console.error("Server error in updating application status " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in updating application status",
      });
  }
};

const getCompletedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      providerId: req.user.userId,
      status: "completed",
    }).populate({
      path: "applicants.workerId",
      select: "name rating reviews",
    });

    return res.json({ success: true, jobs });
  } catch (err) {
    console.error("Server error in fetching completed jobs " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in fetching completed jobs",
      });
  }
};

const submitRating = async (req, res) => {
  try {
    const { jobId, rating, feedback } = req.body;

    const job = await Job.findById(jobId);
    if (!job || job.status !== "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job or not completed" });
    }

    // Find the booking associated with the job
    const booking = await Booking.findOne({
      jobId: job._id,
      providerId: req.user.userId,
    });

    if (!booking) {
      return res
        .status(400)
        .json({ success: false, message: "Booking not found" });
    }

    // Update the worker's rating if not already rated
    if (booking.rating.workerRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this worker",
      });
    }

    booking.rating.workerRating = rating;
    await booking.save();

    const workerApplicant = job.applicants.find(
      (applicant) => applicant.status === "accepted"
    );

    if (!workerApplicant || !workerApplicant.workerId) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    // Find the worker in the User model
    const worker = await User.findById(workerApplicant.workerId);

    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found in User model" });
    }

    // Add the rating and feedback to the worker
    worker.reviews.push({
      reviewerId: req.user.userId,
      comment: feedback,
      rating,
    });

    const totalRatings = worker.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const newRating = totalRatings / worker.reviews.length;
    worker.rating = parseFloat(newRating.toFixed(2));

    await worker.save();

    return res.json({
      success: true,
      message: "Rating submitted successfully",
    });
  } catch (err) {
    console.error("Server error in submitting rating " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in submitting rating" });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const providerId = req.user.userId;

    // Total Expenses Overview
    const totalExpenses = await Booking.aggregate([
      {
        $match: {
          providerId: new mongoose.Types.ObjectId(providerId),
          paymentStatus: "paid",
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $project: {
          compensation: {
            $toDouble: {
              $arrayElemAt: [{ $split: ["$job.compensation", "₹"] }, 1],
            },
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$compensation" } } },
    ]);

    // Expenses by Category (Expertise)
    const categoryExpenses = await Booking.aggregate([
      {
        $match: {
          providerId: new mongoose.Types.ObjectId(providerId),
          paymentStatus: "paid",
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $project: {
          expertise: "$job.requiredExpertise",
          compensation: {
            $toDouble: {
              $arrayElemAt: [{ $split: ["$job.compensation", "₹"] }, 1],
            },
          },
        },
      },
      {
        $group: {
          _id: "$expertise",
          total: { $sum: "$compensation" },
        },
      },
    ]);

    // const categoryExpenses = [
    //   { _id: ["Plumber"], total: 500 },
    //   { _id: ["Painter"], total: 400 },
    //   { _id: ["Electrician"], total: 300 },
    // ];

    // console.log(categoryExpenses);

    // Detailed Expense Report
    const detailedReport = await Booking.aggregate([
      {
        $match: {
          providerId: new mongoose.Types.ObjectId(providerId),
          paymentStatus: "paid",
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $lookup: {
          from: "users",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: "$worker" },
      {
        $project: {
          jobTitle: "$job.title",
          workerName: {
            $concat: [
              "$worker.name",
              " ",
              { $ifNull: ["$worker.surname", ""] },
            ],
          },
          compensation: {
            $toDouble: {
              $arrayElemAt: [{ $split: ["$job.compensation", "₹"] }, 1],
            },
          },
          paymentStatus: "$paymentStatus",
        },
      },
    ]);

    // Payment History
    const paymentHistory = await Booking.aggregate([
      { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
      {
        $lookup: {
          from: "users",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: "$worker" },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $project: {
          date: "$updatedAt",
          workerName: {
            $concat: [
              "$worker.name",
              " ",
              { $ifNull: ["$worker.surname", ""] },
            ],
          },
          jobTitle: "$job.title",
          compensation: {
            $toDouble: {
              $arrayElemAt: [{ $split: ["$job.compensation", "₹"] }, 1],
            },
          },
          status: "$paymentStatus",
        },
      },
    ]);

    return res.json({
      totalOverview: {
        totalExpenses: totalExpenses[0]?.total || 0,
        categoryExpenses,
        totalPaidWorkers: detailedReport.length,
      },
      detailedReport,
      paymentHistory,
    });
  } catch (err) {
    console.error("Server error in  generating invoice " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in  generating invoice" });
  }
};

export {
  getProviderDashboardStats,
  getJobAnalytics,
  getJobs,
  getJobApplications,
  updateJobApplicationStatus,
  updateJobStatus,
  getCompletedJobs,
  submitRating,
  getPaymentDetails,
};
