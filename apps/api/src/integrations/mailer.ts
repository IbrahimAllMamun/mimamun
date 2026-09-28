import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../config/env";
import type { Logger } from "../lib/logger";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  readonly configured: boolean;
  send(message: MailMessage): Promise<boolean>;
}

/** SMTP mailer. Failures are logged and reported as `false`, never thrown to callers. */
export class SmtpMailer implements Mailer {
  readonly configured = true;
  private readonly transporter: Transporter;

  constructor(
    private readonly config: AppConfig["mail"],
    private readonly logger: Logger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host ?? undefined,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: MailMessage): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.config.from ?? undefined,
        to: message.to,
        subject: message.subject,
        text: message.text,
        replyTo: message.replyTo,
      });
      return true;
    } catch (error) {
      this.logger.error({ err: error, subject: message.subject }, "email delivery failed");
      return false;
    }
  }
}

/** Used when SMTP is not configured: nothing is sent. */
export class DisabledMailer implements Mailer {
  readonly configured = false;

  constructor(private readonly logger: Logger) {}

  async send(message: MailMessage): Promise<boolean> {
    this.logger.info({ subject: message.subject }, "email not sent: SMTP is not configured");
    return false;
  }
}

/** Test double that records messages. */
export class MemoryMailer implements Mailer {
  readonly configured = true;
  readonly outbox: MailMessage[] = [];

  async send(message: MailMessage): Promise<boolean> {
    this.outbox.push(message);
    return true;
  }
}

export function createMailer(config: AppConfig["mail"], logger: Logger): Mailer {
  return config.host ? new SmtpMailer(config, logger) : new DisabledMailer(logger);
}
