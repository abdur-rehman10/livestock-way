CREATE OR REPLACE VIEW load_offer_counts AS
SELECT
  load_id,
  COUNT(*)::int AS offer_count
FROM load_offers
GROUP BY load_id;
