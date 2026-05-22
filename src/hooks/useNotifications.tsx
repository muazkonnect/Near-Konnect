import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  type: "message" | "booking" | "blood_request" | "contact_request" | "featured_request";
  title: string;
  body: string;
  created_at: string;
  link: string;
  read: boolean;
}

const sb = supabase as any;

// Module-scoped singleton state
let store: AppNotification[] = [];
let readKeys = new Set<string>();
let subs: ((n: AppNotification[]) => void)[] = [];
let channel: ReturnType<typeof supabase.channel> | null = null;
let initUserId: string | null = null;
let initializing = false;

const broadcast = () => {
  const snapshot = store.map((n) => ({ ...n, read: readKeys.has(n.id) }));
  subs.forEach((fn) => fn(snapshot));
};

const upsert = (n: AppNotification) => {
  store = [n, ...store.filter((x) => x.id !== n.id)].slice(0, 25);
  broadcast();
};

export const removeNotification = (id: string) => {
  const before = store.length;
  store = store.filter((x) => x.id !== id);
  if (store.length !== before) broadcast();
};

const loadReadKeys = async (userId: string) => {
  const { data } = await sb.from("notification_reads").select("notification_key").eq("user_id", userId);
  readKeys = new Set((data || []).map((r: any) => r.notification_key as string));
};

const init = async (userId: string) => {
  if (initializing || initUserId === userId) return;
  initializing = true;
  initUserId = userId;

  await loadReadKeys(userId);

  const list: AppNotification[] = [];

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, message_text, created_at, profiles!messages_sender_id_fkey_profiles(full_name)")
    .eq("receiver_id", userId)
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(10);

  msgs?.forEach((m: any) => {
    list.push({
      id: `msg-${m.id}`,
      type: "message",
      title: `Message from ${m.profiles?.full_name || "Someone"}`,
      body: m.message_text?.slice(0, 60) || "New message",
      created_at: m.created_at,
      link: `/chat/${m.sender_id}`,
      read: false,
    });
  });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, service_description, created_at, booking_date, customer_id, worker_id")
    .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(5);

  bookings?.forEach((b: any) => {
    list.push({
      id: `book-${b.id}`,
      type: "booking",
      title: `Booking ${b.status}`,
      body: `${b.service_description} on ${b.booking_date}`,
      created_at: b.created_at,
      link: "/dashboard",
      read: false,
    });
  });

  // Pending contact-reveal requests where current user is the worker
  const { data: reveals } = await sb
    .from("contact_reveals")
    .select("id, client_user_id, created_at, status")
    .eq("worker_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const r of reveals || []) {
    const { data: cp } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", r.client_user_id)
      .maybeSingle();
    list.push({
      id: `reveal-${r.id}`,
      type: "contact_request",
      title: "Contact request",
      body: `${cp?.full_name || "Someone"} wants your contact info`,
      created_at: r.created_at,
      link: `/chat/${r.client_user_id}`,
      read: false,
    });
  }
  // Featured & Verification requests for admins
  const { data: adminRole } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  const isAdmin = !!adminRole;
  if (isAdmin) {
    const { data: featReqs } = await sb
      .from("featured_requests")
      .select("id, user_id, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    for (const fr of (featReqs || []) as any[]) {
      const { data: rp } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", fr.user_id)
        .maybeSingle();
      list.push({
        id: `featreq-${fr.id}`,
        type: "featured_request",
        title: "Featured request",
        body: `${rp?.full_name || "A worker"} requested to be featured`,
        created_at: fr.created_at,
        link: "/admin",
        read: false,
      });
    }
  }
  store = list.slice(0, 25);
  broadcast();
  initializing = false;

  if (channel) supabase.removeChannel(channel);
  const ch = supabase.channel(`notif-${userId}`);

  ch.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
    async (payload: any) => {
      const { data: sp } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", payload.new.sender_id)
        .maybeSingle();
      const senderName = sp?.full_name || "Someone";
      upsert({
        id: `msg-${payload.new.id}`,
        type: "message",
        title: `Message from ${senderName}`,
        body: payload.new.message_text?.slice(0, 60) || "New message",
        created_at: payload.new.created_at,
        link: `/chat/${payload.new.sender_id}`,
        read: false,
      });
      toast.info(`💬 ${senderName}`, { description: payload.new.message_text?.slice(0, 80) });
    }
  );

  ch.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "bookings" },
    (payload: any) => {
      if (payload.new.customer_id !== userId && payload.new.worker_id !== userId) return;
      upsert({
        id: `book-${payload.new.id}`,
        type: "booking",
        title: "New Booking",
        body: `${payload.new.service_description} on ${payload.new.booking_date}`,
        created_at: payload.new.created_at,
        link: "/dashboard",
        read: false,
      });
      toast.info("📋 New Booking", { description: payload.new.service_description });
    }
  );


  ch.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "contact_reveals", filter: `worker_user_id=eq.${userId}` },
    async (payload: any) => {
      const { data: cp } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", payload.new.client_user_id)
        .maybeSingle();
      const name = cp?.full_name || "Someone";
      upsert({
        id: `reveal-${payload.new.id}`,
        type: "contact_request",
        title: "Contact request",
        body: `${name} wants your contact info`,
        created_at: payload.new.created_at,
        link: `/chat/${payload.new.client_user_id}`,
        read: false,
      });
      toast.info("🔒 Contact request", { description: `${name} wants your contact info` });
    }
  );

  ch.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "contact_reveals", filter: `worker_user_id=eq.${userId}` },
    (payload: any) => {
      if (payload.new?.status && payload.new.status !== "pending") {
        removeNotification(`reveal-${payload.new.id}`);
      }
    }
  );

  ch.on(
    "postgres_changes",
    { event: "DELETE", schema: "public", table: "contact_reveals" },
    (payload: any) => {
      if (payload.old?.id) removeNotification(`reveal-${payload.old.id}`);
    }
  );

  if (isAdmin) {
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "featured_requests" },
      async (payload: any) => {
        const { data: rp } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", payload.new.user_id)
          .maybeSingle();
        const name = rp?.full_name || "A worker";
        upsert({
          id: `featreq-${payload.new.id}`,
          type: "featured_request",
          title: "Featured request",
          body: `${name} requested to be featured`,
          created_at: payload.new.created_at,
          link: "/admin",
          read: false,
        });
        toast.info("⭐ Featured request", { description: `${name} requested to be featured` });
      }
    );
  }

  ch.subscribe();
  channel = ch;
};

// DB-synced read state
export const markRead = async (predicate: (n: AppNotification) => boolean) => {
  if (!initUserId) return;
  const toMark = store.filter((n) => predicate(n) && !readKeys.has(n.id));
  if (!toMark.length) return;
  toMark.forEach((n) => readKeys.add(n.id));
  broadcast();
  const rows = toMark.map((n) => ({ user_id: initUserId!, notification_key: n.id }));
  await sb.from("notification_reads").upsert(rows, { onConflict: "user_id,notification_key", ignoreDuplicates: true });
};

export const markOneRead = async (notificationId: string) => {
  if (!initUserId || readKeys.has(notificationId)) return;
  readKeys.add(notificationId);
  broadcast();
  await sb.from("notification_reads").upsert(
    { user_id: initUserId, notification_key: notificationId },
    { onConflict: "user_id,notification_key", ignoreDuplicates: true }
  );
};

export const markAllRead = async () => {
  if (!initUserId) return;
  const unread = store.filter((n) => !readKeys.has(n.id));
  if (!unread.length) return;
  unread.forEach((n) => readKeys.add(n.id));
  broadcast();
  const rows = unread.map((n) => ({ user_id: initUserId!, notification_key: n.id }));
  await sb.from("notification_reads").upsert(rows, { onConflict: "user_id,notification_key", ignoreDuplicates: true });
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>(() =>
    store.map((n) => ({ ...n, read: readKeys.has(n.id) }))
  );

  useEffect(() => {
    if (!user) return;
    const fn = (n: AppNotification[]) => setItems(n);
    subs.push(fn);
    init(user.id);
    return () => {
      subs = subs.filter((s) => s !== fn);
      if (subs.length === 0 && channel) {
        supabase.removeChannel(channel);
        channel = null;
        initUserId = null;
        store = [];
        readKeys = new Set();
      }
    };
  }, [user]);

  const { unread, unreadByType } = useMemo(() => {
    let message = 0, booking = 0, blood_request = 0, contact_request = 0, total = 0;
    for (const n of items) {
      if (n.read) continue;
      total++;
      if (n.type === "message") message++;
      else if (n.type === "booking") booking++;
      else if (n.type === "blood_request") blood_request++;
      else if (n.type === "contact_request") contact_request++;
    }
    return { unread: total, unreadByType: { message, booking, blood_request, contact_request } };
  }, [items]);

  return { items, unread, unreadByType };
};
