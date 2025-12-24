-- Allow non-escrow/direct payments to store a neutral payment status.
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'NOT_APPLICABLE';
