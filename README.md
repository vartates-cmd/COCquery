This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



Let me check the actual current state rather than answer from memory.

Ran 2 commands

Short answer: the build is finished, the deployment isn't verified yet. Phases 0–10 are complete and tested. Phase 11 is genuinely incomplete, and the evidence is unambiguous.

Your LoginAttempts tab still holds only two rows, both from 21 August with IP ::1 — no one has ever signed in successfully in production. So the redirect_uri fix either hasn't been applied yet or hasn't been retried.

Against the plan's Definition of Done
Item	Status
Unlisted account blocked and logged with IP	✅ verified locally
User sees only their own records	✅ verified — a stranger's page contains none of another account's data
Admin create / edit / delete reflected in the sheet	✅ verified through the real UI
CSV and JSON import validates, previews, commits, reports per row	✅ 20-row test with deliberate faults
Deferred forces a reason and displays it prominently	✅ rejected server-side, shown in its own block
Login attempts viewable, filterable, exportable	✅ 62 attempts, filters, filtered CSV export
Admins added/removed, self- and last-admin removal blocked	✅ verified by tampering with the form, not just clicking
Every protected page guarded server-side	✅ non-admin session got 307 from all admin routes
Works on a phone	✅ no horizontal overflow at 375px
Deployed with production OAuth configured and smoke-tested	❌ not done
What's actually left

Three things, all in your consoles — no code changes:

The redirect URI. Change it in Google from https://cda-coc-query.vercel.app/ to https://cda-coc-query.vercel.app/api/auth/callback/google. Your app is sending the right value; Google just doesn't have it registered.
The consent screen. If it's still in Testing, only listed test users can sign in — every cooperative would be locked out. Publish it, or add test users.
The repo is still public. I re-checked just now: private: false. You chose to make it private and that hasn't happened yet. No credentials are exposed, but it's your call sitting unexecuted.

Then the smoke test: sign in as admin, as a mapped user, and with an unlisted account. You'll know it worked when a new row appears in LoginAttempts with a real IP address instead of ::1.

One loose end worth fixing

Your only Data row is still ID=1, RegNo=1, blank status. The app handles it gracefully — that's why the dashboard shows "Unnamed cooperative" and "Not set" — but ID is meant to be an app-generated UUID, and two hand-typed rows both numbered 1 would collide on edit. Cleanest fix now that the admin UI works: delete it in /admin/records and re-create it through the form.

Tell me when the redirect URI is updated and I'll verify the production sign-in end to end from here — I can watch the log for a row with a real IP and confirm the whole chain works.