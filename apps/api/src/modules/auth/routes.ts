import { Router, type CookieOptions, type Request, type Response } from "express";
import {
  changePasswordInput,
  forgotPasswordInput,
  loginInput,
  resetPasswordInput,
} from "@portfolio/shared";
import { requireAuth } from "../../middleware/auth";
import { createRateLimit, minutes } from "../../middleware/rate-limit";
import { ok, noContent, parse } from "../../lib/http";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";
import {
  changePassword,
  createPasswordResetToken,
  resetPasswordWithToken,
  toSessionDTO,
  verifyCredentials,
} from "./service";
import { createSession, loadSession, revokeSession, revokeUserSessions } from "./sessions";

function emailKey(req: Request): string | null {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.length < 300
    ? `email:${email.trim().toLowerCase()}`
    : null;
}

export function authRouter(deps: AppDeps): Router {
  const router = Router();
  const { config, db, logger, mailer } = deps;

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: "lax",
    path: "/",
  };

  // Only failed sign-ins count. The per-email limit matches the lockout
  // threshold, so an unknown address and a locked account answer alike.
  const tooManyLogins = "Too many sign-in attempts. Try again in a few minutes.";
  const loginByIp = createRateLimit({
    windowMs: minutes(15),
    limit: 30,
    message: tooManyLogins,
    skipSuccessfulRequests: true,
  });
  const loginByEmail = createRateLimit({
    windowMs: minutes(config.login.lockoutMinutes),
    limit: config.login.maxAttempts,
    message: tooManyLogins,
    key: emailKey,
    keyOnly: true,
    skipSuccessfulRequests: true,
  });
  const resetLimit = createRateLimit({
    windowMs: minutes(60),
    limit: 5,
    message: "Too many password reset requests. Try again later.",
    key: emailKey,
  });

  const setSessionCookie = (res: Response, token: string, expiresAt: Date) => {
    res.cookie(config.session.cookieName, token, { ...cookieOptions, expires: expiresAt });
  };

  router.post("/login", loginByIp, loginByEmail, async (req, res) => {
    const input = parse(loginInput, req.body, "Enter your email and password");
    const result = await verifyCredentials(db, config.login, input.email, input.password);
    if (!result.ok) {
      await recordAudit(db, req, {
        action: "auth.login_failed",
        entityType: "user",
        entityId: result.userId,
        summary: `Failed sign-in for ${input.email}`,
        actor: { id: result.userId, email: input.email, name: null },
      });
      logger.warn({ requestId: req.id, userId: result.userId }, "failed sign-in");
      throw result.error;
    }
    // A fresh session on every login prevents session fixation.
    if (req.auth) await revokeSession(db, req.auth.sessionId);
    const session = await createSession(db, config.session, result.userId, {
      ipAddress: req.ip ?? null,
      userAgent: req.header("user-agent") ?? null,
    });
    const auth = await loadSession(db, config.session, session.token);
    if (!auth) throw new Error("Session could not be loaded after creation");
    req.auth = auth;
    await recordAudit(db, req, {
      action: "auth.login",
      entityType: "user",
      entityId: result.userId,
      summary: `${result.email} signed in`,
    });
    logger.info({ requestId: req.id, userId: result.userId }, "signed in");
    setSessionCookie(res, session.token, session.expiresAt);
    ok(res, toSessionDTO(auth));
  });

  router.post("/logout", async (req, res) => {
    if (req.auth) {
      await revokeSession(db, req.auth.sessionId);
      await recordAudit(db, req, {
        action: "auth.logout",
        entityType: "user",
        entityId: req.auth.user.id,
        summary: `${req.auth.user.email} signed out`,
      });
    }
    res.clearCookie(config.session.cookieName, cookieOptions);
    noContent(res);
  });

  router.get("/session", requireAuth, (req, res) => {
    ok(res, toSessionDTO(req.auth!));
  });

  router.post("/password/forgot", resetLimit, async (req, res) => {
    const input = parse(forgotPasswordInput, req.body, "Enter a valid email address");
    const reset = await createPasswordResetToken(db, input.email);
    if (reset) {
      const link = `${config.appUrl}/admin/reset-password?token=${encodeURIComponent(reset.token)}`;
      const sent = await mailer.send({
        to: reset.email,
        subject: "Reset your portfolio admin password",
        text:
          `Hello ${reset.name},\n\nSomeone (hopefully you) asked to reset the password for the portfolio admin.\n\n` +
          `Open this link within one hour to choose a new password:\n${link}\n\n` +
          "If you did not ask for this, you can ignore this email; your password stays the same.\n",
      });
      if (!sent && !config.isProduction && !config.isTest) {
        // Development convenience only: without SMTP the link is otherwise unreachable.
        logger.info(`password reset link (development only): ${link}`);
      }
      await recordAudit(db, req, {
        action: "auth.password_reset_requested",
        entityType: "user",
        entityId: reset.userId,
        summary: `Password reset requested for ${reset.email}`,
        actor: { id: reset.userId, email: reset.email, name: reset.name },
      });
    }
    // Same response whether or not the account exists.
    res.status(202).json({
      success: true,
      data: { message: "If an account exists for that email, a reset link is on its way." },
    });
  });

  router.post("/password/reset", resetLimit, async (req, res) => {
    const input = parse(resetPasswordInput, req.body);
    const userId = await resetPasswordWithToken(db, input.token, input.password);
    await revokeUserSessions(db, userId);
    await recordAudit(db, req, {
      action: "auth.password_reset",
      entityType: "user",
      entityId: userId,
      summary: "Password reset with emailed link",
      actor: { id: userId, email: null, name: null },
    });
    res.clearCookie(config.session.cookieName, cookieOptions);
    ok(res, { message: "Password updated. Sign in with your new password." });
  });

  router.post("/password/change", requireAuth, async (req, res) => {
    const input = parse(changePasswordInput, req.body);
    const auth = req.auth!;
    await changePassword(db, auth.user.id, input.currentPassword, input.newPassword);
    await revokeUserSessions(db, auth.user.id, auth.sessionId);
    await recordAudit(db, req, {
      action: "auth.password_changed",
      entityType: "user",
      entityId: auth.user.id,
      summary: `${auth.user.email} changed their password`,
    });
    ok(res, { message: "Password changed. Other sessions were signed out." });
  });

  return router;
}
