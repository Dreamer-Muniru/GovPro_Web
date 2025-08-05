// import express from 'express';
// import Project from '../models/Project.js'; // Adjust import path as needed

// const router = express.Router();

// // GET /api/regions/stats
// router.get('/stats', async (req, res) => {
//   try {
//     const stats = await Project.aggregate([
//       {
//         $group: {
//           _id: { region: "$region", status: "$status" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.region",
//           data: {
//             $push: {
//               status: "$_id.status",
//               count: "$count"
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           region: "$_id",
//           completed: {
//             $ifNull: [{ $arrayElemAt: [ { $filter: {
//               input: "$data",
//               as: "item",
//               cond: { $eq: [ "$$item.status", "completed" ] }
//             } }, 0 ] }, { count: 0 }]
//           },
//           abandoned: {
//             $ifNull: [{ $arrayElemAt: [ { $filter: {
//               input: "$data",
//               as: "item",
//               cond: { $eq: [ "$$item.status", "abandoned" ] }
//             } }, 0 ] }, { count: 0 }]
//           },
//           pending: {
//             $ifNull: [{ $arrayElemAt: [ { $filter: {
//               input: "$data",
//               as: "item",
//               cond: { $eq: [ "$$item.status", "pending" ] }
//             } }, 0 ] }, { count: 0 }]
//           }
//         }
//       }
//     ]);

//     res.json(stats.map(item => ({
//       region: item.region,
//       completed: item.completed.count,
//       abandoned: item.abandoned.count,
//       pending: item.pending.count
//     })));
//   } catch (err) {
//     console.error("Error generating region stats", err);
//     res.status(500).json({ error: "Failed to fetch stats" });
//   }
// });

// export default router;
