"use client";
import { useState } from "react";
import { clearAtlas060Token, hasAtlas060Token, setAtlas060Token } from "@/lib/studio/githubActions";

export default function GitHubAtlasPanel() {
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(() => hasAtlas060Token());
  const save = () => {
    if (!token.trim()) return;
    setAtlas060Token(token);
    setToken("");
    setConnected(true);
  };
  return (
    <section className="ws-panel rounded-xl border p-5" style={{borderColor:"var(--ws-line-strong)"}}>
      <h3 className="text-base font-semibold ws-text">ATLAS-060 — original private Python engine</h3>
      <p className="ws-sub mt-2">
        Your research Studio still runs in the browser. This solver runs privately on GitHub Actions
        in your separate private repository. No paid hosting or Codespaces required, but private
        Actions jobs use your GitHub account's available minutes.
      </p>
      <p className="ws-sub mt-2">
        To authorize your own runs, create a{" "}
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" className="underline ws-accent">
          fine-grained GitHub personal access token
        </a>{" "}
        restricted to repository <strong>westfall-atlas-commercial</strong>, with
        <strong> Actions: Read and write</strong> and <strong>Contents: Read-only</strong>.
        Never share the token in chat. It is kept only in this browser tab&apos;s memory;
        it is not saved or sent to WESTFALL servers.
      </p>
      <label htmlFor="atlas060-token" className="mt-4 block text-sm font-semibold ws-text">
        Private GitHub token
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="atlas060-token" type="password" autoComplete="off" spellCheck={false}
          value={token} onChange={e => setToken(e.target.value)}
          placeholder={connected ? "Authorized for this tab" : "github_pat_…"}
          className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
          style={{ background:"var(--ws-raised)", borderColor:"var(--ws-line-strong)", color:"var(--ws-text)" }}
        />
        <button type="button" onClick={save} disabled={!token.trim()}
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{background:"var(--ws-accent)", color:"#051227"}}>
          {connected ? "Replace token" : "Authorize"}
        </button>
        {connected && <button type="button" className="ws-accent underline text-sm" onClick={() => {
          clearAtlas060Token(); setConnected(false); setToken("");
        }}>Disconnect</button>}
      </div>
      <p className="ws-sub mt-2">
        {connected ? "Authorized for this tab. You can run ATLAS-060 from the normal Run button." :
          "Not connected. Other browser solvers remain available without a token."}
      </p>
      <p className="ws-sub mt-2">
        Experimental limits: 3–60 integer items, 10–120 seconds of solver time.
        GitHub Actions startup adds queue time. Fallback to ATLAS-032 is disabled for memory safety.
        Closing or cancelling the browser job stops polling; an already-dispatched workflow may still finish.
      </p>
    </section>
  );
}
