import { Router, type CookieOptions, type Request, type Response } from "express";
import { parseCookie } from "cookie";
import {
  changePasswordInput,
  forgotPasswordInput,
  loginInput,
  resetPasswordInput,
  type AuthProvidersDTO,
  type GoogleSignInError,
} from "@portfolio/shared";
import { requireAuth } from "../../middleware/auth";
import { createRateLimit, minutes } from "../../middleware/rate-limit";
import { ok, noContent, parse } from "../../lib/http";
import type { AppDeps } from "../../types";
import { GoogleSignInError as GoogleFailure } from "../../integrations/google";
import { recordAudit } from "../audit/service";
import {
  GOOGLE_FLOW_MAX_AGE_MS,
  codeChallenge,
  newGoogleFlow,
  openGoogleFlow,
  resolveGoogleUser,
  sealGoogleFlow,
  unlinkGoogle,
} from "./google";
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

  const googleLimit = createRateLimit({
    windowMs: minutes(15),
    limit: 30,
    message: tooManyLogins,
  });

  // The Google flow cookie is only sent back to the Google routes. SameSite=Lax
  // lets it travel on the top-level redirect back from Google.
  const googleCookieName = `${config.session.cookieSecure ? "__Secure-" : ""}portfolio_google`;
  const googleCookieOptions: CookieOptions = { ...cookieOptions, path: "/api/auth/google" };

  /** Replaces any session on the request (prevents session fixation) and sets the cookie. */
  const startSession = async (req: Request, res: Response, userId: string) => {
    if (req.auth) await revokeSession(db, req.auth.sessionId);
    const session = await createSession(db, config.session, userId, {
      ipAddress: req.ip ?? null,
      userAgent: req.header("user-agent") ?? null,
    });
    const auth = await loadSession(db, config.session, session.token);
    if (!auth) throw new Error("Session could not be loaded after creation");
    req.auth = auth;
    res.cookie(config.session.cookieName, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    return auth;
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
    const auth = await startSession(req, res, result.userId);
    await recordAudit(db, req, {
      action: "auth.login",
      entityType: "user",
      entityId: result.userId,
      summary: `${result.email} signed in`,
    });
    logger.info({ requestId: req.id, userId: result.userId }, "signed in");
    ok(res, toSessionDTO(auth));
  });

  // ── Google sign-in ─────────────────────────────────────────────────────
  router.get("/providers", (_req, res) => {
    const providers: AuthProvidersDTO = { google: deps.google !== null };
    ok(res, providers);
  });

  const toLogin = (res: Response, error: GoogleSignInError, next = "/admin") => {
    const query = new URLSearchParams({ error });
    if (next !== "/admin") query.set("next", next);
    res.redirect(302, `${config.appUrl}/admin/login?${query.toString()}`);
  };

  router.get("/google", googleLimit, (req, res) => {
    const google = deps.google;
    if (!google) return toLogin(res, "google_unavailable");
    const flow = newGoogleFlow(req.query.next);
    res.cookie(googleCookieName, sealGoogleFlow(config.appSecret, flow), {
      ...googleCookieOptions,
      maxAge: GOOGLE_FLOW_MAX_AGE_MS,
    });
    res.redirect(
      302,
      google.authorizationUrl({
        state: flow.state,
        nonce: flow.nonce,
        codeChallenge: codeChallenge(flow.codeVerifier),
      }),
    );
  });

  router.get("/google/callback", googleLimit, async (req, res) => {
    const google = deps.google;
    const cookies = parseCookie(req.headers.cookie ?? "");
    const flow = openGoogleFlow(config.appSecret, cookies[googleCookieName]);
    // Single use: the flow cookie is cleared whatever the outcome.
    res.clearCookie(googleCookieName, googleCookieOptions);
    if (!google) return toLogin(res, "google_unavailable");
    const next = flow?.next ?? "/admin";
    const { code, state, error } = req.query;
    if (typeof error === "string") return toLogin(res, "google_cancelled", next);
    if (
      !flow ||
      typeof code !== "string" ||
      typeof state !== "string" ||
      code.length > 2000 ||
      state !== flow.state
    ) {
      logger.warn({ requestId: req.id }, "Google sign-in with a missing or mismatched state");
      return toLogin(res, "google_failed", next);
    }

    let identity;
    try {
      identity = await google.signIn({ code, codeVerifier: flow.codeVerifier, nonce: flow.nonce });
    } catch (failure) {
      if (!(failure instanceof GoogleFailure)) throw failure;
      logger.warn({ requestId: req.id, reason: failure.message }, "Google sign-in failed");
      return toLogin(res, "google_failed", next);
    }

    const result = await resolveGoogleUser(db, identity);
    if (!result.ok) {
      await recordAudit(db, req, {
        action: "auth.login_failed",
        entityType: "user",
        entityId: result.userId,
        summary: `Failed Google sign-in for ${identity.email}`,
        actor: { id: result.userId, email: identity.email, name: null },
      });
      logger.warn({ requestId: req.id, userId: result.userId }, "failed Google sign-in");
      return toLogin(res, result.error, next);
    }

    await startSession(req, res, result.userId);
    await recordAudit(db, req, {
      action: "auth.login",
      entityType: "user",
      entityId: result.userId,
      summary: result.linked
        ? `${result.email} signed in with Google (account linked)`
        : `${result.email} signed in with Google`,
    });
    logger.info({ requestId: req.id, userId: result.userId }, "signed in with Google");
    res.redirect(302, `${config.appUrl}${next}`);
  });

  router.delete("/google/link", requireAuth, async (req, res) => {
    const auth = req.auth!;
    if (await unlinkGoogle(db, auth.user.id)) {
      await recordAudit(db, req, {
        action: "auth.google_unlinked",
        entityType: "user",
        entityId: auth.user.id,
        summary: `${auth.user.email} unlinked their Google account`,
      });
    }
    noContent(res);
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
