import crypto from 'node:crypto';

const COOKIE_NAME = 'archivio_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function createAuth({ password, secret }) {
  // La chiave dipende anche dalla password: cambiandola si invalidano tutti gli accessi.
  const key = sha256(`${secret}::${password}`);
  const sign = (value) => crypto.createHmac('sha256', key).update(value).digest('base64url');

  // Limite semplice ai tentativi di accesso (per IP)
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 10;

  function tooManyAttempts(ip) {
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || entry.reset < now) {
      attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
      return false;
    }
    entry.count += 1;
    return entry.count > MAX_ATTEMPTS;
  }

  function checkPassword(input) {
    return crypto.timingSafeEqual(sha256(input ?? ''), sha256(password));
  }

  function issueSession(req, res) {
    const expires = String(Date.now() + MAX_AGE_MS);
    res.cookie(COOKIE_NAME, `${expires}.${sign(expires)}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      maxAge: MAX_AGE_MS,
      path: '/',
    });
  }

  function clearSession(res) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  function isAuthenticated(req) {
    const value = req.cookies?.[COOKIE_NAME];
    if (!value) return false;
    const [expires, signature] = value.split('.');
    if (!expires || !signature) return false;
    if (Number(expires) < Date.now()) return false;
    return safeEqual(signature, sign(expires));
  }

  function requireAuth(req, res, next) {
    if (isAuthenticated(req)) return next();
    res.status(401).json({ error: 'Accesso richiesto' });
  }

  return { checkPassword, issueSession, clearSession, isAuthenticated, requireAuth, tooManyAttempts };
}
