import { requireMember } from "@/server/session";
import { signOut } from "./actions";

export default async function LogPage() {
  const user = await requireMember();
  return (
    <>
      <h1 className="text-3xl font-bold">Log</h1>
      <div className="card mt-6 text-muted">Your private log of each week arrives in milestone 3.</div>
      <div className="card mt-4">
        <p className="label">Signed in as</p>
        <p className="mt-1 break-all">{user.email}</p>
        <form action={signOut} className="mt-4">
          <button className="btn">Sign out</button>
        </form>
      </div>
    </>
  );
}
