"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { api, Button, ErrorNotice, useResource } from "./ui";
export const authClient = createAuthClient();
export function Account() {
  const router = useRouter();
  const { data, error } = useResource<{
    user?: { id: string; name: string; email: string; emailVerified: boolean };
    isAdmin: boolean;
  }>("/api/session");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  async function remove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ confirmation: f.get("confirmation") }),
      });
      setMessage("Account and associated data deleted.");
      router.push("/");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Deletion failed");
    }
  }
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Your account</div>
        <h1>Account & privacy</h1>
        <p>Manage access and business-contact data responsibly.</p>
      </div>
      <ErrorNotice message={error ?? failure} />
      {message && <div className="notice">{message}</div>}
      {data?.user ? (
        <>
          <div className="card account-info">
            <h3>{data.user.name}</h3>
            <p>{data.user.email}</p>
            <p className="small">
              {data.isAdmin && (
                <>
                  Account ID: <code>{data.user.id}</code>
                  <br />
                </>
              )}
              Role: {data.isAdmin ? "Source administrator" : "Workspace user"}
              <br />
              Email ownership:{" "}
              {data.user.emailVerified
                ? "Verified"
                : "Not yet verified. Request a verification link from the sign-in page."}
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                await authClient.signOut();
                router.push("/sign-in");
              }}
            >
              Sign out
            </Button>
          </div>
          <div className="card">
            <h3>Data controls</h3>
            <p className="small">
              Reports and opt-outs immediately suppress affected leads from
              subsequent exports. Account deletion removes your searches,
              sessions, imported records, saved leads and audit history.
              Previously downloaded files are outside LeadAtlas storage.
            </p>
            <p className="small">
              <Link className="link" href="/forgot-password">
                Reset your password
              </Link>{" "}
              using a secure email link.
            </p>
            <Link className="link" href="/privacy">
              Read the privacy policy
            </Link>
            <hr className="divider" />
            <form className="stack" onSubmit={remove}>
              <label>
                Type DELETE MY ACCOUNT to permanently remove your data
                <input
                  name="confirmation"
                  required
                  pattern="DELETE MY ACCOUNT"
                />
              </label>
              <Button variant="danger">Delete my account and data</Button>
            </form>
          </div>
        </>
      ) : (
        <div className="card">
          <p>Sign in to manage your account.</p>
          <Link className="button" href="/sign-in">
            Sign in / create account
          </Link>
        </div>
      )}
    </div>
  );
}
