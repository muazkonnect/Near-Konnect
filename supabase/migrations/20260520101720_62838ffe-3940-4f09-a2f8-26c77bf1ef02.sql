
REVOKE ALL ON FUNCTION public._spend_sparks(uuid, uuid, int, public.sparks_reason, uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_ad_campaign(uuid, public.ad_type, int, int, double precision, double precision, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ad_campaign(uuid, public.ad_type, int, int, double precision, double precision, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_campaign_status(uuid, public.ad_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_campaign_status(uuid, public.ad_status) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_sparks(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_sparks(uuid, int, text) TO authenticated;

REVOKE ALL ON FUNCTION public.expire_campaigns() FROM PUBLIC, anon, authenticated;
