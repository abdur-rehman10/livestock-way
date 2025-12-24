# Dev Manual Tests: Direct vs Escrow Payments

1) Escrow trip happy path  
   - Post a load with Escrow (default).  
   - Accept/assign so a trip is created.  
   - Fund escrow and confirm delivery; PaymentCard shows escrow status and disputes are enabled.  
   - Verify dispute creation works.

2) Direct trip happy path  
   - Post a load selecting “Direct Payment” and accept the warning.  
   - Trip skips escrow UI: no fund/release buttons; badge shows “Payment: Direct (No escrow)”.  
   - Dispute buttons are hidden/disabled; server should reject dispute attempts.  
   - Deliver/complete without funding escrow; trip should complete successfully.

3) Admin view  
   - Admin disputes list should not show DIRECT trips.  
   - Admin trip/payment view shows `payment_mode` and disclaimer acceptance timestamp/version for DIRECT.

4) Backward compatibility  
   - Existing trips without `payment_mode` default to ESCROW: escrow UI and disputes still function.
