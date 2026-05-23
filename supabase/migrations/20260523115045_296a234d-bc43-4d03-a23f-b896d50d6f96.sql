INSERT INTO public.app_settings (key, value, description) VALUES
  ('spark_price_pkr', '10'::jsonb, 'Price of 1 Spark in PKR (shown in Pakistan)'),
  ('spark_price_usdt', '0.036'::jsonb, 'Price of 1 Spark in USDT (shown outside Pakistan)')
ON CONFLICT (key) DO NOTHING;