import {SessionOptions} from 'express-session';
import {Config} from '../configuration';

export const sessionOptions = (conf: Config): SessionOptions => ({
  secret: conf.SESSION_SECRET,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'strict',
    secure: conf.PUBLIC_URL.startsWith('https://'),
  },
});
