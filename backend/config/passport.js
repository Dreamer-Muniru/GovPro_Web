// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/User')

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: '/auth/google/callback',
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         const existingUser = await User.findOne({ googleId: profile.id });
//         if (existingUser) return done(null, existingUser);

//         const newUser = new User({
//           username: profile.displayName,
//           googleId: profile.id,
//         });
//         await newUser.save();
//         done(null, newUser);
//       } catch (err) {
//         done(err, null);
//       }
//     }
//   )
// );
