/**
 * Dialer configuration.
 *
 * The softphone is a demo/development feature. It never ships with
 * credentials baked into source: set the NEXT_PUBLIC_SIP_* variables to
 * point at your own SIP-over-WebSocket endpoint. When any required value is
 * missing the dialer UI renders a configuration notice instead of attempting
 * a registration with bogus credentials.
 *
 * NEXT_PUBLIC_DIALER_FLAG=false disables the dialer entirely (the open
 * button hides itself).
 */

export interface DialerConfig {
  extension: number | null;
  userName: string;
  domain: string;
  password: string;
  port: number | null;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isDialerEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DIALER_FLAG ?? process.env.DIALER_FLAG;
  if (flag !== undefined) {
    const v = flag.trim().toLowerCase();
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return true;
}

export function getDialerConfig(): DialerConfig {
  return {
    extension: toNumber(process.env.NEXT_PUBLIC_SIP_EXTENSION),
    userName: process.env.NEXT_PUBLIC_SIP_USER ?? "",
    domain: process.env.NEXT_PUBLIC_SIP_DOMAIN ?? "",
    password: process.env.NEXT_PUBLIC_SIP_PASSWORD ?? "",
    port: toNumber(process.env.NEXT_PUBLIC_SIP_WSS_PORT)
  };
}

export function isDialerConfigured(): boolean {
  const c = getDialerConfig();
  return (
    c.extension !== null &&
    c.userName.trim().length > 0 &&
    c.domain.trim().length > 0 &&
    c.password.length > 0 &&
    c.port !== null
  );
}
