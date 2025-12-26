# QA: Subscriptions V1 Manual Tests

1) Individual hauler can open Subscription page (`/hauler/subscription`) and see current status, billing cycle, period end, and free trip usage.
2) Monthly subscribe: choose Monthly, pay -> subscription_status ACTIVE, period end ~+1 month, charged_amount = monthly price.
3) Yearly subscribe: choose Yearly, pay -> charged_amount = monthly price * 10, period end ~+12 months.
4) After free trip is used and offers are blocked, the “Upgrade” button on loadboard opens the Subscription page.
5) Super Admin monitoring (`/admin/subscriptions`) lists users and filters Paid vs Unpaid correctly by subscription status/period end.
