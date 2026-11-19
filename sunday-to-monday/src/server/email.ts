export type Email = { to: string; subject: string; text: string };

/**
 * Sends one email. Only the "console" driver exists for now: it prints the
 * email to the server log so the flow can be tested without a provider.
 * A real provider (picked later) plugs in here and nothing else changes.
 */
export async function sendEmail(email: Email): Promise<void> {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  if (driver === "console") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_CONSOLE_EMAIL !== "1") {
      throw new Error("No email provider is set up. Set EMAIL_DRIVER before going live.");
    }
    console.log(
      `\n----- email (console driver) -----\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n----------------------------------\n`,
    );
    return;
  }
  throw new Error(`Unknown EMAIL_DRIVER "${driver}"`);
}

export function devEmailVisible(): boolean {
  return (process.env.EMAIL_DRIVER ?? "console") === "console" && process.env.NODE_ENV !== "production";
}
