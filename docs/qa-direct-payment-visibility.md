# Direct Payment Visibility QA Checklist

1) Hauler load board shows payment badges  
   - Log in as hauler, open Loadboard; each load card shows “Payment: Escrow/Direct” badge in list and dialogs.

2) Shipper cannot access loadboard (UI + API)  
   - Log in as shipper: sidebar has no Loadboard link; hitting `/shipper/loadboard` redirects to dashboard. Hitting `/api/loadboard` with shipper token returns 403.

3) Shipper offer chat shows payment label  
   - Open Shipper Offers tab, select an offer; header shows “Payment: Escrow/Direct”.

4) Trip page differs by role  
   - Shipper trip view has no expenses section and shows route + payment summary only. Hauler trip view still shows full details/expenses.

5) DIRECT completion requires receipt and displays it  
   - On a direct trip as hauler, click Mark Delivered → modal requires received_amount + method; submit completes trip and trip view shows recorded receipt (amount/method/reference/date) for both hauler and shipper.

6) ESCROW flows unchanged  
   - Escrow trips complete without receipt prompt; payment sections still show escrow status and existing behavior.
