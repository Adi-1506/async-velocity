"use client";
import { useState, useEffect, FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
import { User } from "@/types";
export default function Page() {
  const { activeTeam, user } = useTeam();
  const [data, setData] = useState<{ admins: User[]; members: User[] }>({
      admins: [],
      members: [],
    }),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    if (activeTeam)
      api<typeof data>("/api/teams/" + activeTeam._id + "/members?page=" + page)
        .then((d) => {
          if (live) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(message(e));
        });
    return () => {
      live = false;
    };
  }, [activeTeam, page, revision]);
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    try {
      await api("/api/teams/" + activeTeam._id + "/invite", {
        method: "POST",
        body: JSON.stringify({ email: f.get("email") }),
      });
      form.reset();
      setRevision((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function act(id: string, action: string) {
    if (
      !activeTeam ||
      !window.confirm(
        "Confirm " +
          action +
          "? Existing sessions for this user will be revoked.",
      )
    )
      return;
    try {
      await api(
        "/api/teams/" +
          activeTeam._id +
          "/" +
          (action === "remove" ? "members/" : action + "/") +
          id,
        { method: action === "remove" ? "DELETE" : "POST", body: "{}" },
      );
      setRevision((x) => x + 1);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <AppShell title="Team members">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card">
        <h2>Add a registered member</h2>
        <p className="muted">
          Ask the person to register first, then enter their email.
        </p>
        <form className="inline-form" onSubmit={invite}>
          <label>
            Email
            <input name="email" type="email" required maxLength={254} />
          </label>
          <button disabled={busy || !activeTeam}>Add member</button>
        </form>
      </section>
      <section className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Team role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...data.admins.map((u) => ({ ...u, isAdmin: true })),
              ...data.members.map((u) => ({ ...u, isAdmin: false })),
            ].map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.isAdmin ? "Admin" : "Member"}</td>
                <td className="actions">
                  {!u.isAdmin && (
                    <button
                      className="secondary"
                      onClick={() => act(u._id, "remove")}
                    >
                      Remove
                    </button>
                  )}
                  {user?.role === "superadmin" && u.role !== "superadmin" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        act(u._id, u.isAdmin ? "demote" : "promote")
                      }
                    >
                      {u.isAdmin ? "Demote" : "Promote"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={data.admins.length < 25 && data.members.length < 25}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </AppShell>
  );
}
