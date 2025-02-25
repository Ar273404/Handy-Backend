import User from "../Models/User.js";
import Job from "../Models/Job.js";
import Booking from "../Models/Booking.js";
import Chat from "../Models/Chat.js";
import mongoose from "mongoose";
import Sentiment from "sentiment";

// Fetch Worker Dashboard Data
const getWorkerDashboard = async (req, res) => {
  try {
    const workerId = req.user.userId;

    // // Fetch worker profile
    // const worker = await User.findById(workerId).select('-password');
    // if (!worker || worker.userType !== 'worker') {
    //   return res.status(404).json({ success: false, message: 'Worker not found.' });
    // }

    // // Fetch testimonials (reviews)
    // const testimonials = worker.reviews;

    // // Fetch completed jobs
    // const completedJobs = await Job.find({ 'applicants.workerId': workerId, status: 'completed' }).populate(
    //   'providerId',
    //   'name email'
    // );

    // return res.status(200).json({ success: true, worker, testimonials, completedJobs });

    // Fetch worker data
    const worker = await User.findById(workerId);
    if (!worker)
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });

    // Fetch completed jobs
    const completedJobs = await Booking.find({
      workerId,
      status: "completed",
    }).populate("jobId");

    // Fetch applied jobs
    const appliedJobs = await Job.find({ "applicants.workerId": workerId });

    // Fetch job stats for charts
    const monthlyJobs = await Booking.aggregate([
      { $match: { workerId, status: "completed" } },
      { $group: { _id: { $month: "$startTime" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const jobTypes = await Job.aggregate([
      { $match: { "applicants.workerId": workerId } },
      { $unwind: "$requiredExpertise" },
      { $group: { _id: "$requiredExpertise", count: { $sum: 1 } } },
    ]);

    const earnings = await Booking.aggregate([
      { $match: { workerId } },
      { $group: { _id: null, total: { $sum: "$paymentStatus" } } },
    ]);

    return res.json({
      success: true,
      message: "Dashboard data fetched successfully",
      worker,
      completedJobs,
      appliedJobs,
      jobStats: {
        monthlyJobs,
        jobTypes,
        earnings,
      },
    });
  } catch (err) {
    console.error("Server error in worker dashboard " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in worker dashboard" });
  }
};

const getWorkerSummary = async (req, res) => {
  try {
    const workerId = req.user.userId;

    // Total Jobs Applied
    const totalJobsApplied = await Job.countDocuments({
      "applicants.workerId": workerId,
    });

    // Total Completed Jobs
    const totalCompletedJobs = await Job.countDocuments({
      "applicants.workerId": workerId,
      status: "completed",
    });

    // Average Rating (from Reviews in User model)
    const worker = await User.findById(workerId);
    const avgRating = worker.reviews.length
      ? worker.reviews.reduce((acc, review) => acc + review.rating, 0) /
        worker.reviews.length
      : 0;

    const totalEarnings = await Booking.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(workerId), // Ensure workerId is an ObjectId
          status: "completed",
          paymentStatus: "paid",
        },
      },
      {
        $lookup: {
          from: "jobs", // The collection name for Job model
          localField: "jobId",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      {
        $unwind: "$jobDetails", // Unwind the jobDetails array from lookup
      },
      {
        $project: {
          compensation: "$jobDetails.compensation", // Extract compensation from jobDetails
        },
      },
      {
        $group: {
          _id: null,
          totalCompensation: {
            $sum: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$compensation", "₹"] }, 1],
                  },
                  chars: " ",
                },
              },
            },
          },
        },
      },
    ]);

    // Find all completed bookings where paymentStatus is pending and workerId matches
    const pendingPayments = await Booking.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(workerId), // Ensure workerId is an ObjectId
          status: "completed",
          paymentStatus: "pending",
        },
      },
      {
        $lookup: {
          from: "jobs", // The collection name for Job model
          localField: "jobId",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      {
        $unwind: "$jobDetails", // Unwind the jobDetails array from lookup
      },
      {
        $project: {
          compensation: "$jobDetails.compensation", // Extract compensation from jobDetails
        },
      },
      {
        $group: {
          _id: null,
          totalCompensation: {
            $sum: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$compensation", "₹"] }, 1],
                  },
                  chars: " ",
                },
              },
            },
          },
        },
      },
    ]);

    return res.json({
      success: true,
      summary: {
        totalJobsApplied,
        totalCompletedJobs,
        avgRating: avgRating.toFixed(1),
        totalEarnings: totalEarnings,
        pendingPayments: pendingPayments,
      },
    });
  } catch (err) {
    console.error("Server error in worker summary " + err);
    return res
      .status(500)
      .json({ success: false, message: "Server error in worker summary" });
  }
};

const getWorkerJobs = async (req, res) => {
  try {
    const workerId = req.user.userId;

    // Fetch ongoing jobs (status not 'completed')
    const ongoingJobs = await Job.find({
      applicants: {
        $elemMatch: {
          workerId: new mongoose.Types.ObjectId(workerId),
          status: "accepted",
        },
      },
      status: "in progress",
    });

    // Fetch completed jobs with employer details (provider information)
    const completedJobs = await Job.aggregate([
      {
        $match: {
          applicants: {
            $elemMatch: {
              workerId: new mongoose.Types.ObjectId(workerId),
              status: "accepted",
            },
          },
          status: "completed",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
        },
      },
      {
        $unwind: "$provider",
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "jobId",
          as: "bookingDetails",
        },
      },
      {
        $unwind: "$bookingDetails",
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          location: 1,
          compensation: 1,
          duration: 1,
          startTime: "$bookingDetails.startTime",
          endTime: "$bookingDetails.endTime",
          paymentStatus: "$bookingDetails.paymentStatus",
          provider: {
            name: "$provider.name",
            email: "$provider.email",
            phone: "$provider.phone",
          },
        },
      },
    ]);

    return res.json({
      success: true,
      ongoingJobs,
      completedJobs,
    });
  } catch (err) {
    console.error("Server error in fetching worker jobs: " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in fetching worker jobs.",
      });
  }
};

const markJobAsCompleted = async (req, res) => {
  try {
    const { jobId } = req.params;
    const workerId = req.user.userId;

    // Find the job and mark it as completed
    const job = await Job.findOneAndUpdate(
      { _id: jobId, "applicants.workerId": workerId, status: "in progress" },
      { $set: { status: "completed" } },
      { new: true }
    );

    if (!job) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Job not found or already completed",
        });
    }

    // Update the booking status to completed as well
    const booking = await Booking.findOneAndUpdate(
      { jobId: job._id, workerId },
      { $set: { status: "completed" } },
      { new: true }
    );

    return res.json({ success: true, job });
  } catch (err) {
    console.error("Error marking job as completed: " + err);
    return res
      .status(500)
      .json({ success: false, message: "Error marking job as completed" });
  }
};

const rateProvider = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { rating, feedback } = req.body;
    const workerId = req.user.userId;

    const job = await Job.findOne({
      _id: jobId,
      "applicants.workerId": workerId,
      status: "completed",
    });
    if (!job) {
      return res
        .status(400)
        .json({ success: false, message: "Job not found or not completed" });
    }

    const booking = await Booking.findOne({
      jobId: job._id,
      workerId: req.user.userId,
      status: "completed",
    });
    if (!booking) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Booking not found or not completed",
        });
    }

    if (booking.rating.providerRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this worker",
      });
    }

    booking.rating.providerRating = rating;
    await booking.save();

    const provider = await User.findById(booking.providerId);
    provider.reviews.push({
      reviewerId: workerId,
      comment: feedback,
      rating: rating,
    });
    await provider.save();

    // Step 5: Calculate the average rating for the worker
    const allReviews = provider.reviews;
    const totalRating = allReviews.reduce(
      (acc, review) => acc + review.rating,
      0
    );
    const averageRating = totalRating / allReviews.length;

    provider.rating = averageRating; // Update the worker's overall rating
    await provider.save();

    // Step 6: Send a success response
    return res.json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (err) {
    console.error("Error submitting feedback: " + err);
    return res
      .status(500)
      .json({ success: false, message: "Error submitting feedback" });
  }
};

const changePaymentStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const workerId = req.user.userId;
    console.log(workerId);

    // Find the booking associated with the job and worker, and that is marked as completed
    const booking = await Booking.findOne({
      jobId: jobId,
      workerId: workerId,
      status: "completed",
    });

    console.log(booking);

    if (!booking) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Booking not found or not completed",
        });
    }

    // Check if payment is already marked as paid
    if (booking.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payment already marked as paid" });
    }

    // Update payment status to 'paid'
    booking.paymentStatus = "paid";
    await booking.save();

    // Return a success response
    return res.json({
      success: true,
      message: "Payment status updated to paid",
    });
  } catch (err) {
    console.error("Error updating payment status: " + err);
    return res
      .status(500)
      .json({ success: false, message: "Error updating payment status" });
  }
};

const withdrawApplication = async (req, res) => {
  try {
    console.log("hi");
    const jobId = req.params.jobId;
    console.log(jobId);
    const workerId = req.user.userId;

    // Find the job and remove the worker from the applicants array
    const job = await Job.findById(jobId);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    const applicantIndex = job.applicants.findIndex(
      (applicant) => applicant.workerId.toString() === workerId.toString()
    );
    if (applicantIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "You have not applied to this job" });

    // Remove the application
    job.applicants.splice(applicantIndex, 1);
    await job.save();

    return res.json({
      success: true,
      message: "Application withdrawn successfully",
    });
  } catch (err) {
    console.error("Server error in withdrawing application " + err);
    return res.status(500).json({
      success: false,
      message: "Server error in withdrawing application",
    });
  }
};

const getJobAnalytics = async (req, res) => {
  try {
    const workerId = req.user.userId;

    // Fetch jobs completed by worker
    const completedJobs = await Booking.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(workerId),
          status: "completed",
        },
      },
      { $group: { _id: { $month: "$startTime" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Prepare jobs completed per month
    const jobsPerMonth = Array(12).fill(0);
    completedJobs.forEach((item) => {
      jobsPerMonth[item._id - 1] = item.count; // _id is the month number
    });

    // Fetch job types distribution
    const jobTypes = await Job.aggregate([
      {
        $match: {
          "applicants.workerId": new mongoose.Types.ObjectId(workerId),
          status: "completed",
        },
      },
      { $unwind: "$requiredExpertise" },
      { $group: { _id: "$requiredExpertise", count: { $sum: 1 } } },
    ]);

    // Fetch earnings over time (monthly)
    const earningsOverTime = await Booking.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(workerId),
          status: "completed",
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
          month: { $month: "$startTime" },
          compensation: {
            $toDouble: {
              $arrayElemAt: [{ $split: ["$job.compensation", "₹"] }, 1],
            },
          },
        },
      },
      {
        $group: {
          _id: "$month",
          totalEarnings: { $sum: "$compensation" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const earningsOverMonth = earningsOverTime.map((item) => ({
      month: item._id,
      amount: item.totalEarnings,
    }));

    return res.json({
      success: true,
      analytics: {
        months: [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
        jobsPerMonth,
        jobTypes,
        earningsOverTime: earningsOverMonth,
      },
    });
  } catch (err) {
    console.error("Server error in getting analytics of worker " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in getting analytics of worker",
      });
  }
};

// const getWorkerReviews = async (req, res) => {
//   try {
//     const workerId = req.user.userId;

//      // Fetch worker reviews
//      const worker = await User.findById(workerId).select("reviews").populate({
//       path: "reviews.reviewerId",
//       select: "name",
//     });

//     if (!worker) {
//       return res.status(404).json({ message: "Worker not found" });
//     }

//     const sentiment = new Sentiment();

//     // Analyze reviews
//     const analyzedReviews = worker.reviews.map((review) => {
//       const sentimentResult = sentiment.analyze(review.comment);
//       let sentimentLabel = "neutral";

//       if (sentimentResult.score > 2) {
//         sentimentLabel = "positive";
//       } else if (sentimentResult.score < -2) {
//         sentimentLabel = "negative";
//       }

//       return {
//         ...review.toObject(),
//         sentiment: sentimentLabel,
//       };
//     });

//     return res.status(200).json({success : true , analyzedReviews});

//   } catch (err) {
//     console.error("Server error in fetching worker reviews " + err);
//     return res.status(500).json({success: false,message: "Server error in fetching worker reviews",});
//   }
// };

// const getCompletedJobs = async (req, res) => {
//   try {
//     const workerId = req.user.userId;

//      // Find jobs where the worker is listed as an applicant and the job is completed
//      const jobs = await Job.aggregate([
//       {
//         $match: {
//           'applicants.workerId': new mongoose.Types.ObjectId(workerId),
//           status: 'completed',
//         },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'providerId',
//           foreignField: '_id',
//           as: 'provider',
//         },
//       },
//       {
//         $unwind: '$provider',
//       },
//       {
//         $lookup: {
//           from: 'bookings',
//           localField: '_id',
//           foreignField: 'jobId',
//           as: 'bookingDetails',
//         },
//       },
//       {
//         $unwind: '$bookingDetails',
//       },
//       {
//         $project: {
//           _id: 1,
//           title: 1,
//           description: 1,
//           location: 1,
//           compensation: 1,
//           duration: 1,
//           startTime: '$bookingDetails.startTime',
//           endTime: '$bookingDetails.endTime',
//           paymentStatus: '$bookingDetails.paymentStatus',
//           provider: {
//             name: '$provider.name',
//             email: '$provider.email',
//             phone: '$provider.phone',
//           },
//         },
//       },
//     ]);

//     return res.json({success: true,completedJobs: jobs,});
//   } catch (err) {
//     console.error("Server error in fetching worker completed jobs " + err);
//     return res.status(500).json({success: false,message: "Server error in fetching worker completed jobs ",});
//   }
// };

const getWorkerReviews = async (req, res) => {
  try {
    const workerId = req.user.userId;

    // Fetch worker reviews with reviewer details
    const worker = await User.findById(workerId).select("reviews").populate({
      path: "reviews.reviewerId",
      select: "name",
    });

    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    const sentiment = new Sentiment();

    // Analyze reviews
    const analyzedReviews = worker.reviews.map((review) => {
      const sentimentResult = sentiment.analyze(review.comment);
      let sentimentLabel = "neutral";

      if (sentimentResult.score > 2) {
        sentimentLabel = "positive";
      } else if (sentimentResult.score < -2) {
        sentimentLabel = "negative";
      }

      return {
        ...review.toObject(),
        reviewerName: review.reviewerId?.name || "Anonymous",
        sentiment: sentimentLabel,
      };
    });

    return res.status(200).json({ success: true, analyzedReviews });
  } catch (err) {
    console.error("Server error in fetching worker reviews:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in fetching worker reviews",
      });
  }
};

const getMessages = async (req, res) => {
  try {
    const { jobId, providerId } = req.params;

    const chat = await Chat.findOne({
      jobId,
      participants: providerId,
    }).populate("messages.senderId", "name");
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    }

    return res.status(200).json({ success: true, messages: chat.messages });
  } catch (err) {
    console.error("Server error in fetching chat messages " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in fetching worker chat messages",
      });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { jobId, providerId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    let chat = await Chat.findOne({ jobId, participants: providerId });

    if (!chat) {
      chat = new Chat({ jobId, participants: [providerId, userId] });
    }

    const newMessage = {
      senderId: userId,
      message,
    };

    chat.messages.push(newMessage);
    await chat.save();

    return res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Server error in sending chat messages " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in sending worker chat messages",
      });
  }
};

// const getApplications = async (req, res) => {
//   try {
//     const workerId = req.user.userId;

//     const jobs = await Job.find({
//       "applicants.workerId": workerId,
//       status: { $in: ["open", "alloted"] },
//     })
//       .populate("providerId", "name")
//       .populate("applicants.workerId", "name");

//     const categorizedApplications = {
//       applied: [],
//       accepted: [],
//       rejected: [],
//     };

//     jobs.forEach((job) => {
//       job.applicants.forEach((applicant) => {
//         if (String(applicant.workerId._id) === workerId) {
//           if (applicant.status === "applied") categorizedApplications.applied.push(job);
//           else if (applicant.status === "accepted") categorizedApplications.accepted.push(job);
//           else if (applicant.status === "rejected") categorizedApplications.rejected.push(job);
//         }
//       });
//     });

//     return res.status(200).json({ success: true, applications: categorizedApplications });
//   } catch (err) {
//     console.error("Server error in fetching worker applications: ", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error in fetching worker applications",
//     });
//   }
// };

const getApplications = async (req, res) => {
  try {
    const workerId = req.user.userId;

    const jobs = await Job.find({
      "applicants.workerId": workerId,
      status: { $in: ["open", "alloted"] },
    })
      .populate("providerId", "name")
      .populate("applicants.workerId", "name");

    const categorizedApplications = {
      applied: [],
      accepted: [],
      rejected: [],
    };

    jobs.forEach((job) => {
      job.applicants.forEach((applicant) => {
        if (String(applicant.workerId._id) === workerId) {
          if (applicant.status === "applied")
            categorizedApplications.applied.push(job);
          else if (applicant.status === "accepted")
            categorizedApplications.accepted.push(job);
          else if (applicant.status === "rejected")
            categorizedApplications.rejected.push(job);
        }
      });
    });

    return res.status(200).json({
      success: true,
      applications: categorizedApplications,
      totalPages: Math.ceil(jobs.length / 10), // Assuming pagination is implemented
    });
  } catch (err) {
    console.error("Server error in fetching worker applications: ", err);
    return res.status(500).json({
      success: false,
      message: "Server error in fetching worker applications",
    });
  }
};

const withdrawWorkerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const workerId = req.user.userId;

    const job = await Job.findOneAndUpdate(
      { _id: applicationId, "applicants.workerId": workerId },
      { $pull: { applicants: { workerId } } },
      { new: true }
    );

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found." });
    }

    return res
      .status(200)
      .json({ success: true, message: "Application withdrawn successfully." });
  } catch (err) {
    console.error("Server error in withdrawing worker applications " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in withdrawing worker applications",
      });
  }
};

const getWorkerProfile = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const worker = await User.findById(workerId).select("-password");
    if (!worker || worker.userType !== "worker") {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    return res.status(200).json({ success: true, worker });
  } catch (err) {
    console.error("Server error in getting worker profile " + err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error in getting worker profile ",
      });
  }
};

const updateWorkerProfile = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const {
      name,
      phone,
      expertise,
      experience,
      expectedCompensation,
      city,
      state,
      country,
    } = req.body;

    // Find the worker
    const worker = await User.findById(workerId);
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found." });
    }

    // Update profile fields
    worker.name = name || worker.name;
    worker.phone = phone || worker.phone;
    worker.expertise = expertise || worker.expertise;
    worker.experience = experience || worker.experience;
    worker.expectedCompensation =
      expectedCompensation || worker.expectedCompensation;
    worker.location.city = city || worker.location.city;
    worker.location.state = state || worker.location.state;
    worker.location.country = country || worker.location.country;
    worker.profileImage =
      req.files?.profileImage?.[0]?.path || worker.profileImage;

    // if (req.files?.profileImage?.[0]) {
    //   const uploadResult = await cloudinary.uploader.upload(req.files.profileImage[0].path, {
    //     folder: 'profile_images',
    //   });
    //   worker.profileImage = uploadResult.secure_url;
    // }

    // if (city || state || country) {
    //   worker.location = {
    //     ...worker.location,
    //     ...location,
    //   };
    // }

    // Save changes
    await worker.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Error updating profile." });
  }
};

export {
  getWorkerDashboard,
  getWorkerSummary,
  getWorkerJobs,
  withdrawApplication,
  getJobAnalytics,
  getWorkerReviews,
  markJobAsCompleted,
  rateProvider,
  changePaymentStatus,
  getMessages,
  sendMessage,
  getApplications,
  withdrawWorkerApplication,
  getWorkerProfile,
  updateWorkerProfile,
};
