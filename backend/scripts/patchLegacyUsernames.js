// const mongoose = require('mongoose');
// const User = require("../models/User") // adjust path as needed

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(async () => {
//   console.log('🔧 Connected to MongoDB');

//   const usersToFix = await User.find({ username: { $exists: false } });
//   console.log(`🧮 Found ${usersToFix.length} legacy users without username`);

//   for (const user of usersToFix) {
//     const fallback =
//       user.name ||
//       user.fullname ||
//       (user.email ? user.email.split('@')[0] : null) ||
//       `user_${user._id.toString().slice(-4)}`;

//     user.username = fallback;
//     await user.save();
//     console.log(`✅ Patched user ${user._id} with username: ${fallback}`);
//   }

//   console.log('🎉 All legacy users updated');
//   mongoose.disconnect();
// }).catch((err) => {
//   console.error('❌ Error connecting to DB:', err);
// });
