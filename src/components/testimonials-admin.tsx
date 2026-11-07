"use client";
import { useState } from "react";
import { api, Button, ErrorNotice, useResource } from "./ui";
type Review = {
  id: string;
  displayName: string;
  roleOrBusiness: string;
  text: string;
  photoPath: string | null;
  photoPermission: boolean;
  permissionStatus: "PENDING" | "GRANTED" | "REVOKED";
  permissionEvidence: string;
  approvalStatus: "DRAFT" | "APPROVED";
  publishedAt: string | null;
};
export function TestimonialsAdmin() {
  const {
    data,
    error: loadError,
    refresh,
  } = useResource<{ reviews: Review[] }>("/api/admin/testimonials");
  const [selected, setSelected] = useState<Review | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="stack">
      <div className="page-intro">
        <h1>Customer testimonials</h1>
        <p>
          Publish only the exact words and photograph the reviewer has
          permitted. Permission evidence stays private.
        </p>
      </div>
      <ErrorNotice message={loadError ?? error} />
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
      <form
        key={selected?.id ?? "new"}
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setMessage("");
          setBusy(true);
          const form = new FormData(event.currentTarget);
          try {
            await api("/api/admin/testimonials", {
              method: "POST",
              body: JSON.stringify({
                id: selected?.id,
                displayName: form.get("displayName"),
                roleOrBusiness: form.get("roleOrBusiness"),
                text: form.get("text"),
                photoPath: form.get("photoPath") || null,
                photoPermission: form.get("photoPermission") === "on",
                permissionStatus: form.get("permissionStatus"),
                permissionEvidence: form.get("permissionEvidence"),
                approvalStatus: form.get("approvalStatus"),
                publishedAt: form.get("publishedAt")
                  ? new Date(String(form.get("publishedAt"))).toISOString()
                  : null,
              }),
            });
            setMessage(
              "Review saved. Only approved, permitted reviews with a reached publication date appear publicly.",
            );
            setSelected(null);
            refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save review.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{selected ? "Edit review" : "New review"}</h2>
        <div className="formgrid">
          <label>
            Customer display name
            <input
              required
              name="displayName"
              maxLength={100}
              defaultValue={selected?.displayName}
            />
          </label>
          <label>
            Role or business
            <input
              required
              name="roleOrBusiness"
              maxLength={160}
              defaultValue={selected?.roleOrBusiness}
            />
          </label>
          <label className="full">
            Approved testimonial text
            <textarea
              required
              name="text"
              minLength={10}
              maxLength={1200}
              rows={4}
              defaultValue={selected?.text}
            />
          </label>
          <label>
            Publication permission
            <select
              name="permissionStatus"
              defaultValue={selected?.permissionStatus ?? "PENDING"}
            >
              <option value="PENDING">Pending</option>
              <option value="GRANTED">Granted by reviewer</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </label>
          <label>
            Approval
            <select
              name="approvalStatus"
              defaultValue={selected?.approvalStatus ?? "DRAFT"}
            >
              <option value="DRAFT">Draft / unpublished</option>
              <option value="APPROVED">Approved for publication</option>
            </select>
          </label>
          <label className="full">
            Private permission evidence
            <textarea
              name="permissionEvidence"
              rows={2}
              maxLength={1000}
              defaultValue={selected?.permissionEvidence}
              placeholder="Record where and when the reviewer approved this exact text."
            />
          </label>
          <label>
            Publication date and time
            <input
              name="publishedAt"
              type="datetime-local"
              defaultValue={
                selected?.publishedAt
                  ? new Date(
                      new Date(selected.publishedAt).getTime() -
                        new Date(selected.publishedAt).getTimezoneOffset() *
                          60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
            />
          </label>
          <label>
            Approved photograph asset (optional)
            <input
              name="photoPath"
              defaultValue={selected?.photoPath ?? ""}
              placeholder="/testimonials/approved-photo.webp"
            />
          </label>
          <label className="check full">
            <input
              name="photoPermission"
              type="checkbox"
              defaultChecked={selected?.photoPermission}
            />
            <span>
              The reviewer explicitly permitted publication of this photograph.
            </span>
          </label>
        </div>
        <div className="row">
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save review"}
          </Button>
          {selected && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setSelected(null)}
            >
              Cancel edit
            </Button>
          )}
        </div>
      </form>
      <section className="stack" aria-label="Private review records">
        <h2>Review records</h2>
        {data && !data.reviews.length && (
          <p>No reviews have been supplied. The public section stays hidden.</p>
        )}
        {data?.reviews.map((review) => (
          <div className="review-record" key={review.id}>
            <div>
              <strong>{review.displayName}</strong>
              <p className="small">{review.roleOrBusiness}</p>
              <p className="small muted">
                {review.permissionStatus.toLowerCase()} /{" "}
                {review.approvalStatus.toLowerCase()}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(review);
                setError("");
                setMessage("");
              }}
            >
              Edit {review.displayName}
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
