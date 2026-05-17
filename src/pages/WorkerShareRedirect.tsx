import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { isValidWorkerUid, normalizeWorkerUid } from "@/lib/workerUid";
import AppLayout from "@/components/AppLayout";

const WorkerShareRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const forwardState = location.state ?? undefined;

  useEffect(() => {
    const run = async () => {
      if (!id) {
        navigate("/discover", { replace: true });
        return;
      }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        navigate(`/worker/${id}`, { replace: true, state: forwardState });
        return;
      }
      const uid = normalizeWorkerUid(id);
      if (!isValidWorkerUid(uid)) {
        navigate("/discover", { replace: true });
        return;
      }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/worker-share/${uid}?format=json`;
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            accept: "application/json",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.id) {
            navigate(`/worker/${json.id}`, { replace: true, state: forwardState });
            return;
          }
        }
      } catch {
        // fall through
      }
      navigate("/discover", { replace: true });
    };
    void run();
  }, [id, navigate, forwardState]);

  return (
    <AppLayout hideMobileHeader>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </AppLayout>
  );
};

export default WorkerShareRedirect;
