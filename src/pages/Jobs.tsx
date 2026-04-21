import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Plus, Search, MapPin, DollarSign, Inbox, ArrowLeft, Loader2, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { parseContactMethods, type ContactMethod } from "@/lib/contactMethods";

// Supabase types are auto-generated and don't yet include the new `jobs` /
// `job_applications` tables. Cast the client to bypass the typed table list.
const supabase = typedSupabase as any;

type Job = {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category: string;
  budget: number | null;
  city: string | null;
  status: string;
  created_at: string;
};

type Application = {
  id: string;
  job_id: string;
  applicant_id: string;
  status: "pending" | "accepted" | "rejected";
  message: string;
  created_at: string;
  applicant?: { full_name: string; city: string | null; contact_methods: ContactMethod[] };
};

const CATEGORIES = ["general", "plumbing", "electrical", "carpentry", "cleaning", "delivery", "tutoring", "other"];
const BUDGET_RANGES = [
  { label: "Any budget", min: 0, max: Infinity },
  { label: "Under 5k", min: 0, max: 5000 },
  { label: "5k – 20k", min: 5000, max: 20000 },
  { label: "20k – 100k", min: 20000, max: 100000 },
  { label: "100k+", min: 100000, max: Infinity },
];

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [cityFilter, setCityFilter] = useState("");
  const [selected, setSelected] = useState<Job | null>(null);
  const [showPost, setShowPost] = useState(false);
  const [showApplications, setShowApplications] = useState<Job | null>(null);

  const userCity = useMemo(() => (user?.user_metadata?.city as string) || "", [user]);

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setJobs((data as Job[]) || []);
    setLoading(false);
  };

  useEffect(() => { void loadJobs(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = BUDGET_RANGES[budgetIdx];
    const cf = cityFilter.trim().toLowerCase();
    let list = jobs.filter((j) => {
      if (q && !`${j.title} ${j.description} ${j.city ?? ""}`.toLowerCase().includes(q)) return false;
      if (category !== "all" && j.category !== category) return false;
      const b = j.budget ?? 0;
      if (b < range.min || b > range.max) return false;
      if (cf && !(j.city ?? "").toLowerCase().includes(cf)) return false;
      return true;
    });
    // Boost jobs that match the user's own city to the top (nearby-by-city heuristic)
    if (userCity) {
      const uc = userCity.toLowerCase();
      list = [...list].sort((a, b) => {
        const am = (a.city ?? "").toLowerCase() === uc ? 0 : 1;
        const bm = (b.city ?? "").toLowerCase() === uc ? 0 : 1;
        return am - bm;
      });
    }
    return list;
  }, [jobs, search, category, budgetIdx, cityFilter, userCity]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-muted p-2.5"><Briefcase className="h-6 w-6 text-secondary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Job Konnect</h1>
              <p className="text-sm text-muted-foreground">Post jobs, apply nearby, get hired.</p>
            </div>
          </div>
          {user && (
            <Button onClick={() => setShowPost(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Post a Job
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-9" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(budgetIdx)} onValueChange={(v) => setBudgetIdx(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Budget" /></SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES.map((b, i) => <SelectItem key={b.label} value={String(i)}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder={userCity ? `City (yours: ${userCity})` : "Filter by city"} />
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto mb-3 inline-flex rounded-2xl p-3 bg-muted"><Inbox className="h-6 w-6 text-secondary" /></div>
            <p className="text-muted-foreground">No jobs match your filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelected(job)}
                className="text-left"
              >
                <Card className="p-4 hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold leading-snug">{job.title}</h3>
                    <Badge variant="secondary" className="capitalize shrink-0">{job.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description || "No description."}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {job.budget != null && <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{Number(job.budget).toLocaleString()}</span>}
                    {job.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.city}</span>}
                    {user?.id === job.poster_id && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setShowApplications(job); }}
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                      >
                        View applicants
                      </span>
                    )}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </main>

      <JobDetailDialog job={selected} onClose={() => setSelected(null)} onChanged={loadJobs} onOpenApplications={(j) => { setSelected(null); setShowApplications(j); }} />
      <PostJobDialog open={showPost} onClose={() => setShowPost(false)} onCreated={loadJobs} userCity={userCity} />
      <ApplicationsDialog job={showApplications} onClose={() => setShowApplications(null)} />
    </div>
  );
}

/* ---------------- Job detail ---------------- */
function JobDetailDialog({ job, onClose, onChanged, onOpenApplications }: { job: Job | null; onClose: () => void; onChanged: () => void; onOpenApplications: (j: Job) => void }) {
  const { user } = useAuth();
  const [myApp, setMyApp] = useState<Application | null>(null);
  const [posterContacts, setPosterContacts] = useState<ContactMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const isPoster = user && job && user.id === job.poster_id;

  useEffect(() => {
    if (!job || !user || isPoster) { setMyApp(null); setPosterContacts([]); return; }
    void (async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", job.id)
        .eq("applicant_id", user.id)
        .maybeSingle();
      setMyApp((data as Application) || null);
      if (data && (data as Application).status === "accepted") {
        const { data: prof } = await supabase
          .from("profiles")
          .select("contact_methods")
          .eq("user_id", job.poster_id)
          .maybeSingle();
        setPosterContacts(parseContactMethods(prof?.contact_methods));
      }
    })();
  }, [job, user, isPoster]);

  const apply = async () => {
    if (!user || !job) return;
    setLoading(true);
    const { error } = await supabase.from("job_applications").insert({ job_id: job.id, applicant_id: user.id, message: "" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Application sent!");
    setMyApp({ id: "", job_id: job.id, applicant_id: user.id, status: "pending", message: "", created_at: new Date().toISOString() });
  };

  const deleteJob = async () => {
    if (!job) return;
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    if (error) return toast.error(error.message);
    toast.success("Job deleted");
    onClose(); onChanged();
  };

  if (!job) return null;
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6">{job.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{job.category}</Badge>
            {job.budget != null && <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />{Number(job.budget).toLocaleString()}</Badge>}
            {job.city && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{job.city}</Badge>}
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description || "No description provided."}</p>

          {!user ? (
            <Link to="/login"><Button className="w-full">Log in to apply</Button></Link>
          ) : isPoster ? (
            <div className="flex gap-2">
              <Button onClick={() => onOpenApplications(job)} className="flex-1">View applicants</Button>
              <Button variant="outline" onClick={deleteJob}>Delete</Button>
            </div>
          ) : myApp ? (
            <div className="space-y-2">
              <div className="rounded-md border p-3 text-sm">
                Status: <span className="font-semibold capitalize">{myApp.status}</span>
              </div>
              {myApp.status === "accepted" && posterContacts.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contact the poster:</p>
                  <ContactMethodsBar methods={posterContacts} />
                </div>
              )}
              {myApp.status === "accepted" && posterContacts.length === 0 && (
                <p className="text-xs text-muted-foreground">Poster hasn't added contact methods yet.</p>
              )}
            </div>
          ) : (
            <Button onClick={apply} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quick Apply"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Post job ---------------- */
function PostJobDialog({ open, onClose, onCreated, userCity }: { open: boolean; onClose: () => void; onCreated: () => void; userCity: string }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setCity(userCity || ""); }, [open, userCity]);

  const submit = async () => {
    if (!user) return;
    const t = title.trim();
    if (!t) return toast.error("Title is required");
    if (t.length > 120) return toast.error("Title too long");
    if (description.length > 2000) return toast.error("Description too long");
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({
      poster_id: user.id,
      title: t,
      description: description.trim(),
      category,
      budget: budget ? Number(budget) : null,
      city: city.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Job posted!");
    setTitle(""); setDescription(""); setCategory("general"); setBudget(""); setCity(userCity || "");
    onClose(); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Post a Job</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix kitchen sink leak" maxLength={120} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work..." maxLength={2000} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget</Label>
              <Input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Applications ---------------- */
function ApplicationsDialog({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!job) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data as Application[]) || [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((a) => a.applicant_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, city, contact_methods")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      list.forEach((a) => {
        const p = map.get(a.applicant_id);
        if (p) a.applicant = { full_name: p.full_name, city: p.city, contact_methods: parseContactMethods(p.contact_methods) };
      });
    }
    setApps(list);
    setLoading(false);
  };

  useEffect(() => { if (job) void load(); }, [job?.id]);

  const setStatus = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Accepted" : "Rejected");
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  if (!job) return null;
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Applicants — {job.title}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : apps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No applications yet.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {apps.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-medium">{a.applicant?.full_name || "Applicant"}</p>
                    {a.applicant?.city && <p className="text-xs text-muted-foreground">{a.applicant.city}</p>}
                  </div>
                  <Badge variant={a.status === "accepted" ? "default" : a.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{a.status}</Badge>
                </div>
                {a.status === "accepted" && a.applicant?.contact_methods?.length ? (
                  <div className="mt-2"><ContactMethodsBar methods={a.applicant.contact_methods} /></div>
                ) : a.status === "pending" ? (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => setStatus(a.id, "accepted")} className="flex-1">Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "rejected")} className="flex-1"><X className="h-3.5 w-3.5 mr-1" />Reject</Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
