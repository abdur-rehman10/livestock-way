# QA: Individual Plans Signup & Payment Flow

1) Admin can edit FREE/PAID packages; cannot delete  
- Login as super-admin -> `/admin/pricing`  
- Open “Individual Hauler Packages” section; click Edit on FREE then PAID; update name/description/features; save and confirm values persist.  
- Verify there is no delete option and codes are fixed (FREE/PAID only).

2) Signup for individual shows plan step  
- Go to `/login`, choose role Hauler, keep company toggle OFF.  
- Fill required info and submit; confirm a “Choose your plan” step appears with Free/Paid cards and pricing.

3) Choosing FREE completes signup; user sees CTAs later  
- Select Free Plan and finish signup.  
- Confirm account is created, onboarding completes, and user lands in hauler dashboard.  
- Visit `/hauler/subscription` and see FREE card with “Upgrade to Paid” CTA.

4) Choosing PAID routes to dummy payment; after pay user is ACTIVE  
- Sign up as individual hauler and select Paid Plan.  
- After account creation, ensure you are routed to `/hauler/payment`.  
- Click “Pay Monthly (Dummy)” or “Pay Yearly (Dummy, 2 months free)”; expect success toast and redirect to hauler dashboard.  
- Confirm subscription status shows ACTIVE in `/hauler/subscription`.

5) Packages appear identically on Subscription page  
- Visit `/hauler/subscription`; ensure FREE and PAID cards mirror names/descriptions/features from admin packages and show monthly/yearly pricing.

6) Unpaid PAID users are gated in backend + frontend  
- Create a PAID-plan hauler but skip payment (do not hit dummy pay).  
- Try placing an offer or paid-only action: backend returns `PAYMENT_REQUIRED` and frontend blocks.  
- Confirm subscription page shows “Complete payment” CTA linking to `/hauler/payment`.
