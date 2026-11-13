"use client";
import { useState } from "react";
import { CONTACT_ENDPOINT } from "@/lib/site";

/**
 * Commercial inquiry form. It submits to a form-processing endpoint configured at build time
 * (NEXT_PUBLIC_CONTACT_ENDPOINT, e.g. a Formspree form URL; only the public endpoint, never a secret).
 * Without one, the form is shown disabled with an explanation; it never pretends to send.
 */
export default function ContactForm() {
  const configured = Boolean(CONTACT_ENDPOINT);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!configured) return;
    const fd = new FormData(e.currentTarget);
    if (fd.get("website")) return; // honeypot
    setState("sending");
    try {
      const r = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"), email: fd.get("email"), organization: fd.get("organization"),
          topic: fd.get("topic"), message: fd.get("message"), _subject: `Westfall Optimization inquiry: ${fd.get("topic")}`,
        }),
      });
      if (!r.ok) throw new Error(`the form service returned ${r.status}`);
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  };

  if (state === "sent")
    return (
      <div className="card p-8" role="status">
        <h2 className="text-xl font-semibold text-fog-100">Thank you. Your message was sent.</h2>
        <p className="mt-2 text-fog-400">We will reply to the address you provided.</p>
      </div>
    );

  return (
    <form className="card space-y-4 p-6 sm:p-8" onSubmit={onSubmit} aria-describedby="form-status" data-testid="contact-form">
      {!configured && (
        <div id="form-status" className="rounded-md border border-signal-amber/30 bg-signal-amber/5 p-3 text-sm text-fog-300" data-testid="contact-unconfigured">
          <strong className="text-fog-100">The inquiry form is not yet connected.</strong> No message-delivery service has been configured for this deployment, so the form is disabled and nothing would be sent. Please use the GitHub link for now. Configuration steps are in the repository&apos;s <span className="font-mono">docs/deployment.md</span>.
        </div>
      )}
      <fieldset disabled={!configured || state === "sending"} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm"><span className="label">Name</span><input name="name" required maxLength={120} className="field mt-1.5" autoComplete="name" /></label>
          <label className="block text-sm"><span className="label">Email</span><input name="email" type="email" required maxLength={200} className="field mt-1.5" autoComplete="email" /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm"><span className="label">Organization (optional)</span><input name="organization" maxLength={160} className="field mt-1.5" autoComplete="organization" /></label>
          <label className="block text-sm"><span className="label">Topic</span>
            <select name="topic" className="field mt-1.5" defaultValue="Commercial licensing">
              <option>Commercial licensing</option><option>Applying the solvers to a problem</option><option>Research collaboration</option><option>Other</option>
            </select>
          </label>
        </div>
        <label className="block text-sm"><span className="label">Message</span><textarea name="message" required minLength={20} maxLength={5000} rows={7} className="field mt-1.5" /></label>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary">{state === "sending" ? "Sending…" : "Send inquiry"}</button>
          {state === "error" && <span className="text-sm text-signal-red" role="alert">Not sent: {error}. Please try again or use GitHub.</span>}
        </div>
        <p className="text-xs text-fog-500">Your message is delivered by the configured form service and used only to reply to you.</p>
      </fieldset>
    </form>
  );
}
