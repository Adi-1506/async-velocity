"use client";
import { useState, useEffect, FormEvent } from "react";
import { UserPlus, Users } from "lucide-react";
import AppShell from "../AppShell";
import { Alert, Avatar, Empty, Field, Pager, RowsSkeleton, Spinner, SubmitButton } from "../ui";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
import { User } from "@/types";

const PAGE = 25;
type Action = "remove" | "promote" | "demote";

export default function Members() {
  const { activeTeam, user } = useTeam();
  const [data, setData] = useState<{ admins: User[]; members: User[] }>({
      admins: [],
      members: [],
    }),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [loadedKey, setLoadedKey] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(""),
    [busy, setBusy] = useState(false);
  const key = activeTeam?._id + "|" + page;
  const loading = loadedKey !== key;
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
        })
        .finally(() => {
          if (live) setLoadedKey(activeTeam._id + "|" + page);
        });
    return () => {
      live = false;
    };
  }, [activeTeam, page, revision]);

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    const form = e.currentTarget,
      email = String(new FormData(form).get("email") || "").trim();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/teams/" + activeTeam._id + "/invite", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      form.reset();
      setNotice(email + " was added to " + activeTeam.name + ".");
      setRevision((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function act(person: User, action: Action) {
    if (!activeTeam) return;
    const question = {
      remove: "Remove " + person.name + " from " + activeTeam.name + "?",
      promote: "Make " + person.name + " a team admin of " + activeTeam.name + "?",
      demote: "Change " + person.name + " back to a member of " + activeTeam.name + "?",
    }[action];
    if (
      !window.confirm(
        question + "\n\nThey'll be signed out on every device and will need to sign in again.",
      )
    )
      return;
    setPending(person._id + action);
    setError("");
    setNotice("");
    try {
      await api(
        "/api/teams/" +
          activeTeam._id +
          "/" +
          (action === "remove" ? "members/" : action + "/") +
          person._id,
        { method: action === "remove" ? "DELETE" : "POST", body: "{}" },
      );
      setNotice(
        {
          remove: person.name + " was removed from the team.",
          promote: person.name + " is now a team admin.",
          demote: person.name + " is now a member.",
        }[action],
      );
      setRevision((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setPending("");
    }
  }

  const people = [
    ...data.admins.map((u) => ({ ...u, isAdmin: true })),
    ...data.members
      .filter((u) => !data.admins.some((a) => a._id === u._id))
      .map((u) => ({ ...u, isAdmin: false })),
  ];
  const isSuper = user?.role === "superadmin";

  return (
    <AppShell
      title="Members"
      description={activeTeam && "People who can see and post in " + activeTeam.name + "."}
    >
      <section className="panel mb-6" aria-labelledby="add-member">
        <h2 className="section-title" id="add-member">
          Add someone
        </h2>
        <p className="section-desc mb-4">
          They need a Daybrief account first. Send them to the sign-up page,
          then add the email they registered with.
        </p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={invite}>
          <div className="grow basis-64">
            <Field label="Email">
              {({ id }) => (
                <input
                  id={id}
                  className="input"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="off"
                  placeholder="name@company.com"
                />
              )}
            </Field>
          </div>
          <SubmitButton busy={busy} busyLabel="Adding…" disabled={!activeTeam}>
            <UserPlus size={16} aria-hidden="true" />
            Add to team
          </SubmitButton>
        </form>
      </section>

      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {loading && people.length === 0 ? (
          <RowsSkeleton />
        ) : people.length === 0 ? (
          <Empty icon={Users} title="No one on this team yet">
            Add people above once they&apos;ve created an account.
          </Empty>
        ) : (
          <ul className="rows" aria-label="Team members" aria-busy={loading}>
            {people.map((u) => (
              <li key={u._id}>
                <Avatar name={u.name} seed={u._id} />
                <div className="row-main">
                  <p className="font-semibold">
                    {u.name}
                    {u._id === user?._id && <span className="meta"> (you)</span>}
                  </p>
                  <p className="meta overflow-hidden text-ellipsis">{u.email}</p>
                </div>
                <span className={"pill " + (u.isAdmin ? "pill-teal" : "")}>
                  {u.role === "superadmin" ? "Workspace admin" : u.isAdmin ? "Team admin" : "Member"}
                </span>
                <div className="row-actions">
                  {isSuper && u.role !== "superadmin" && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!!pending}
                      onClick={() => act(u, u.isAdmin ? "demote" : "promote")}
                    >
                      {pending === u._id + (u.isAdmin ? "demote" : "promote") && (
                        <Spinner size={14} />
                      )}
                      {u.isAdmin ? "Make member" : "Make admin"}
                      <span className="sr-only">: {u.name}</span>
                    </button>
                  )}
                  {!u.isAdmin && (
                    <button
                      className="btn btn-danger-quiet btn-sm"
                      disabled={!!pending}
                      onClick={() => act(u, "remove")}
                    >
                      {pending === u._id + "remove" && <Spinner size={14} />}
                      Remove
                      <span className="sr-only"> {u.name}</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager
        page={page}
        hasNext={data.admins.length >= PAGE || data.members.length >= PAGE}
        busy={loading}
        onChange={setPage}
      />
    </AppShell>
  );
}
