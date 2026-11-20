import { useEffect, useState } from "react";
import { sfx } from "./sfx";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import {
  API,
  ApiError,
  GOOGLE_ID,
  googleSignIn,
  pullSave,
  signIn,
} from "./online";

// The login page, as in Babi Life: the name of the game and what it is, how many bosses play and how many are
// online now, then « Je me connecte » / « Je crée mon compte » (a boss name and a password). Signed in with a
// game saved online, it comes back on this phone; a new account goes on to the character and the home place.

const User = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
const Lock = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const Eye = ({ off }: { off: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

/** How many bosses play, how many are online now. */
function useStats() {
  const [s, setS] = useState<{ players: number; online: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const get = () =>
      fetch(`${API}/api/v1/stats`)
        .then((r) => r.json())
        .then((j) => alive && setS(j))
        .catch(() => undefined);
    get();
    const t = setInterval(get, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return s;
}

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

/** `onDone(boss, created)`: signed in (an account with no game yet, or a new one); `onGuest`: play without. */
export function LoginPage({
  onDone,
  onGuest,
}: {
  onDone: (boss: string, created: boolean) => void;
  onGuest: () => void;
}) {
  const stats = useStats();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [boss, setBoss] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  // a new Google account: its credential kept while the player picks a boss name
  const [google, setGoogle] = useState<{ credential: string } | null>(null);

  const afterSignIn = async (name: string, created: boolean) => {
    // an account that already has a game: it comes back on this phone
    if (!created && (await pullSave())) {
      location.reload();
      return;
    }
    sfx.unlock();
    onDone(name, created);
  };
  const withGoogle = async (credential: string, name?: string) => {
    setBusy(true);
    setErr("");
    try {
      const r = await googleSignIn(credential, name);
      if ("needName" in r) {
        setGoogle({ credential });
        if (r.suggestion && !name) setBoss(r.suggestion);
        if (r.error) setErr(r.error);
      } else await afterSignIn(r.name, r.created);
    } catch (e) {
      setErr((e as ApiError).message);
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (google) {
        await withGoogle(google.credential, boss.trim());
        return;
      }
      const s = await signIn(boss.trim(), password, register);
      await afterSignIn(s.name, register);
    } catch (e) {
      setErr((e as ApiError).message);
    }
    setBusy(false);
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 overflow-y-auto bg-[linear-gradient(180deg,#ffe8cc_0%,#ffd8a8_45%,#f4a261_100%)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* the colours of the flag, as on Babi Life */}
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-1 bg-[#f77f00]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#009e60]" />
      </div>
      <main
        className="mx-auto flex min-h-[calc(100%-6px)] w-full max-w-md flex-col justify-center gap-4 px-4 py-6"
        style={{
          paddingTop: "max(24px, env(safe-area-inset-top))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <section className="text-center">
          <div className="text-5xl drop-shadow-[0_4px_0_rgba(0,0,0,.12)]">
            🍛👑
          </div>
          <h1
            className="mt-1 text-[52px] leading-[0.9] font-extrabold text-[var(--color-orange)]"
            style={{ textShadow: "3px 3px 0 #2b1a12" }}
          >
            BABILAND <span className="text-[var(--color-green)]">BOSS</span>
          </h1>
          <p className="mt-2 text-lg leading-snug font-extrabold">
            Du petit coin sur le trottoir au boss de toute la bouffe à Babi.
          </p>
          <p className="text-sm font-semibold opacity-75">
            Garba, alloco, choukouya… Prends les quartiers, trahis les boss,
            deviens la légende.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-sm font-extrabold">
            <span>🍛 {stats ? fmt(stats.players) : "…"} boss</span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#2f9e44]" />{" "}
              {stats ? fmt(stats.online) : "…"} en ligne
            </span>
          </div>
        </section>

        {google ? (
          <section className="card !p-4">
            <h2 className="text-2xl font-extrabold">Ton nom de boss</h2>
            <p className="text-sm font-semibold opacity-75">
              Ton compte Google est confirmé. Comment on t’appelle à Babi ?
            </p>
            <form className="mt-3 flex flex-col gap-2" onSubmit={submit}>
              <label className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-60">
                  <User />
                </span>
                <input
                  className="w-full rounded-xl border-[3px] border-[var(--color-ink)] bg-white py-2.5 pr-3 pl-10 text-base font-bold outline-none"
                  maxLength={20}
                  value={boss}
                  onChange={(e) => setBoss(e.target.value)}
                  aria-label="Nom de boss"
                  autoFocus
                />
              </label>
              {err && (
                <p
                  className="rounded-lg bg-[#ffe3e3] px-2.5 py-1.5 text-sm font-extrabold text-[#c92a2a]"
                  role="alert"
                >
                  {err}
                </p>
              )}
              <button
                className="btn btn-green mt-1 w-full !py-3 !text-xl"
                disabled={busy || boss.trim().length < 3}
              >
                {busy ? "…" : "C’est parti !"}
              </button>
            </form>
          </section>
        ) : (
          <section className="card !p-4">
            <h2 className="text-2xl font-extrabold">
              {register ? "Je crée mon compte" : "Je me connecte"}
            </h2>
            <div
              className="mt-2 flex gap-1 rounded-xl bg-[#f1e4cc] p-1 text-sm font-extrabold"
              role="tablist"
            >
              {(["register", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className={`flex-1 rounded-lg py-2 ${mode === m ? "bg-white shadow" : "opacity-60"}`}
                  onClick={() => {
                    setMode(m);
                    setErr("");
                  }}
                >
                  {m === "register" ? "Créer un compte" : "Se connecter"}
                </button>
              ))}
            </div>
            {/* Google first, as in Babi Life (shown once VITE_GOOGLE_CLIENT_ID is set) */}
            {GOOGLE_ID && (
              <>
                <div className="mt-3 flex h-[44px] justify-center [&>div]:w-full">
                  <GoogleOAuthProvider clientId={GOOGLE_ID}>
                    <GoogleLogin
                      onSuccess={(r) =>
                        r.credential && void withGoogle(r.credential)
                      }
                      onError={() => setErr("Connexion Google annulée")}
                      text={register ? "signup_with" : "continue_with"}
                      shape="pill"
                      size="large"
                      width="320"
                    />
                  </GoogleOAuthProvider>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs font-extrabold opacity-70">
                  <span className="h-px flex-1 bg-[#2b1a12]/25" />
                  ou avec ton nom de boss
                  <span className="h-px flex-1 bg-[#2b1a12]/25" />
                </div>
              </>
            )}
            <form className="mt-3 flex flex-col gap-2" onSubmit={submit}>
              <label className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-60">
                  <User />
                </span>
                <input
                  className="w-full rounded-xl border-[3px] border-[var(--color-ink)] bg-white py-2.5 pr-3 pl-10 text-base font-bold outline-none"
                  placeholder={
                    register
                      ? "Ton nom de boss (ex. : Tantie Aya)"
                      : "Nom de boss"
                  }
                  autoComplete="username"
                  maxLength={20}
                  value={boss}
                  onChange={(e) => setBoss(e.target.value)}
                  aria-label="Nom de boss"
                />
              </label>
              <label className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-60">
                  <Lock />
                </span>
                <input
                  className="w-full rounded-xl border-[3px] border-[var(--color-ink)] bg-white py-2.5 pr-11 pl-10 text-base font-bold outline-none"
                  type={show ? "text" : "password"}
                  placeholder={
                    register
                      ? "Mot de passe (6 caractères min.)"
                      : "Mot de passe"
                  }
                  autoComplete={register ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="Mot de passe"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 p-1 opacity-60"
                  onClick={() => setShow(!show)}
                  aria-label={
                    show ? "Cacher le mot de passe" : "Afficher le mot de passe"
                  }
                >
                  <Eye off={show} />
                </button>
              </label>
              {err && (
                <p
                  className="rounded-lg bg-[#ffe3e3] px-2.5 py-1.5 text-sm font-extrabold text-[#c92a2a]"
                  role="alert"
                >
                  {err}
                </p>
              )}
              <button
                className="btn btn-green mt-1 w-full !py-3 !text-xl"
                disabled={busy || boss.trim().length < 3 || password.length < 6}
              >
                {busy ? "…" : register ? "Créer mon compte" : "Me connecter"}
              </button>
            </form>
            <p className="mt-2 text-center text-xs font-semibold opacity-70">
              {register
                ? "Ta partie est sauvegardée en ligne : tu la retrouves sur n’importe quel téléphone."
                : "Ta partie revient telle que tu l’as laissée."}
            </p>
          </section>
        )}

        <button
          className="self-center py-2 text-sm font-extrabold underline underline-offset-4 opacity-70"
          onClick={onGuest}
        >
          Jouer sans compte
        </button>
      </main>
    </div>
  );
}
