import { Link } from 'react-router-dom';

export function AuthShowcase() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_12%,rgba(59,130,246,0.35),transparent_38%),radial-gradient(ellipse_at_85%_80%,rgba(14,165,233,0.2),transparent_34%)]" />
      <div className="absolute inset-0 opacity-14 bg-[linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] bg-size-[64px_64px] mask-[linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="relative flex h-full flex-col">
        <Brand light />
        <div className="my-auto max-w-xl py-20">
          <h2 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-6xl">
            Your files.
            <br />
            <span className="bg-linear-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
              Finally in order.
            </span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            A calmer place for the things you create, share, and want to keep
            close.
          </p>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-400/15 text-blue-200">
                  <FolderIcon />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Project files
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Updated just now
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Synced
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <FileTile
                label="Design.fig"
                color="bg-violet-400/15 text-violet-200"
              />
              <FileTile
                label="Roadmap.pdf"
                color="bg-rose-400/15 text-rose-200"
              />
              <FileTile
                label="Assets.zip"
                color="bg-amber-400/15 text-amber-200"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className="inline-flex w-fit items-center gap-3" to="/">
      <span
        className={`grid size-10 place-items-center rounded-xl ${light ? 'bg-blue-500 text-white' : 'bg-blue-700 text-white'} shadow-lg shadow-blue-950/15`}
      >
        <DriveIcon />
      </span>
      <span
        className={`text-base font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}
      >
        WebFP Drive
      </span>
    </Link>
  );
}

function FileTile({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <div
        className={`mb-3 grid size-9 place-items-center rounded-lg ${color}`}
      >
        <DocumentIcon />
      </div>
      <p className="truncate text-[11px] font-medium text-slate-300">{label}</p>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4.5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-4.5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m8.5 3.75-6 10.5 3.75 6.5h12l3.25-5.75-6.5-11.25h-6.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m2.5 14.25 12.5-.5m-6.5-10 6.5 11.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3.5 7.75a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M3.75 10h16.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.75h6.5l4.75 4.75v11.75H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M13 4v5h5M8.5 13h6M8.5 16.5h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
      <path
        d="M4.167 10h11.666m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
