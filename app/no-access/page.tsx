import Link from "next/link";

export default function NoAccessPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16 text-center">
      <h1 className="font-gdl-display text-2xl font-bold text-slate-900">No organization access</h1>
      <p className="mt-4 text-slate-600">
        Your account is signed in, but you are not a member of any organization yet. Ask a site admin or
        organization owner for an invite link.
      </p>
      <Link
        href="/login"
        className="mt-8 font-semibold text-[#3d7d6c] underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
