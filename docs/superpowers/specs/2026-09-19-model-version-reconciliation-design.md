# Model Version Reconciliation Migration Design

Add one forward-only, idempotent Supabase migration that reconciles every current and historical MeatLens model identity in `public.model_versions`. The migration inserts all catalog keys plus the prior August primary key used by historical records, uses `ON CONFLICT (version_key) DO NOTHING`, and never updates or deletes existing rows.

The migration covers the September 19 primary, preserved September 18 model, September 18 prior primary, August model3 primary, seed123 model2, legacy MobileNetV3, ResNet50, and ensemble. The existing migration test will assert every key and the idempotency clause.
