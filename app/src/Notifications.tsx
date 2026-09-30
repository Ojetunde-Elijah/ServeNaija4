import { useEffect, useRef } from "react";
import { usePlatform, type NotificationAudience } from "./PlatformContext";

const kindIcon: Record<string, string> = { booking: "📅", job: "🛠", escrow: "₦", partner: "✓", system: "•" };

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export function useUnread(audience: NotificationAudience, recipientId?: string) {
  const platform = usePlatform();
  return platform.notificationsFor(audience, recipientId).filter((item) => !item.read).length;
}

export default function NotificationCenter({ audience, recipientId, open, onClose }: { audience: NotificationAudience; recipientId?: string; open: boolean; onClose: () => void }) {
  const platform = usePlatform();
  const ref = useRef<HTMLElement>(null);
  const items = platform.notificationsFor(audience, recipientId);
  const unread = items.filter((item) => !item.read);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node) && !(event.target as HTMLElement).closest("[data-ntf-toggle]")) onClose(); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <section className="ntf-panel" ref={ref} role="dialog" aria-label="Notifications">
      <div className="ntf-head"><strong>Notifications{unread.length ? ` · ${unread.length} new` : ""}</strong><button disabled={!unread.length} onClick={() => platform.markNotificationsRead(unread.map((item) => item.id))}>Mark all read</button></div>
      <div className="ntf-list">
        {items.slice(0, 30).map((item) => (
          <button key={item.id} className={`ntf-item ${item.read ? "" : "unread"}`} onClick={() => platform.markNotificationsRead([item.id])}>
            <i className={`ntf-icon ${item.kind}`}>{kindIcon[item.kind]}</i>
            <span><strong>{item.title}</strong><small>{item.body}</small><em>{ago(item.createdAt)}{item.refId && item.refId.startsWith("SN-") ? ` · ${item.refId}` : ""}</em></span>
          </button>
        ))}
        {!items.length && <p className="ntf-empty">You're all caught up. Booking updates, job dispatches and escrow releases will appear here.</p>}
      </div>
    </section>
  );
}
