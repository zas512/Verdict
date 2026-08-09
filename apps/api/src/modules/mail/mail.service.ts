import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../config/env.validation";
import type { UserRole } from "../../generated/prisma/enums";

export interface InviteEmailInput {
  to: string;
  inviteUrl: string;
  firmName: string | null;
  role: UserRole;
}

/**
 * Sends transactional email through the Resend REST API. Raw fetch keeps the
 * dependency surface at zero; Resend's REST contract is stable and simple.
 * When RESEND_API_KEY is missing the service degrades to `{ ok: false }` and
 * the caller still returns the invite link so the flow stays usable.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async sendInviteEmail(input: InviteEmailInput): Promise<{ ok: boolean }> {
    const apiKey = this.config.get("RESEND_API_KEY", { infer: true });
    if (!apiKey) {
      return { ok: false };
    }
    const from = this.config.get("RESEND_FROM_EMAIL", { infer: true });
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.firmName
            ? `You're invited to ${input.firmName}`
            : "You're invited to start your firm",
          html: this.inviteHtml(input)
        })
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.logger.warn(`Resend rejected invite email: ${res.status} ${body}`);
        return { ok: false };
      }

      return { ok: true };
    } catch (err) {
      this.logger.warn(
        `Failed to send invite email to ${input.to}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return { ok: false };
    }
  }

  private roleLabel(role: UserRole): string {
    switch (role) {
      case "OWNER":
        return "founder/owner";
      case "ADMIN":
        return "admin";
      default:
        return "associate";
    }
  }

  private inviteHtml(input: InviteEmailInput): string {
    const { to, inviteUrl, firmName, role } = input;
    const heading = firmName
      ? `Join <strong>${firmName}</strong>`
      : "Create your firm";
    const body = firmName
      ? `You have been invited to <strong>${firmName}</strong> as an <strong>${this.roleLabel(
          role
        )}</strong>.`
      : "You have been invited to set up your own firm.";
    return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111827; margin-bottom: 8px;">${heading}</h2>
  <p style="color: #4b5563; font-size: 14px;">${body}</p>
  <p style="color: #4b5563; font-size: 14px;">This invitation is for <strong>${to}</strong> and expires in 7 days.</p>
  <div style="margin: 24px 0;">
    <a href="${inviteUrl}"
       style="display: inline-block; background: #2563EB; color: #ffffff; text-decoration: none;
              padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Accept invitation
    </a>
  </div>
  <p style="color: #9ca3af; font-size: 12px;">If the button does not work, copy this link into your browser: ${inviteUrl}</p>
</div>`;
  }
}
