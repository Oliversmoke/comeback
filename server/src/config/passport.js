import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';

const configurePassport = () => {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email }).select('+password');
          if (!user) return done(null, false, { message: 'Invalid email or password' });
          if (user.provider !== 'local') return done(null, false, { message: 'Use Google login' });
          const isMatch = await user.comparePassword(password);
          if (!isMatch) return done(null, false, { message: 'Invalid email or password' });
          return done(null, user.toPublicJSON());
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.id);
          if (!user) return done(null, false);
          return done(null, user.toPublicJSON());
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user ? user.toPublicJSON() : null);
    } catch (error) {
      done(error);
    }
  });
};

export default configurePassport;
