# Taskly

A student research-task marketplace built with Node.js, Express, EJS, React, and SQLite.

## Run locally

1. Install Node.js 22.13 or newer (the project uses Node's built-in SQLite module).
2. Run `npm install`.
3. Run `npm start`.
4. Open [http://localhost:3000](http://localhost:3000).

Research briefs live in `data/tasks.json`. Accounts, password hashes, sessions, individual profiles, typing assessments, assessment attempts, task claims, submission metadata, and uploaded PDF document contents are stored in `data/taskly.sqlite`. Passwords are hashed with Node.js scrypt; raw passwords are never stored. Authentication sessions use random, HTTP-only, SameSite cookies and expire after 14 days. Account data and research activity are scoped to the signed-in user. The profile dashboard is available at `/profile`.

Optional hourly task generation uses the OpenAI Responses API. Set `OPENAI_API_KEY` in the server environment (never in browser code or a committed file) and restart the app. The first batch is scheduled one hour after the scheduler is initialized; successful batches of three are persisted in SQLite and the next batch is scheduled one hour later. Provider failures are logged and retried after five minutes. Without the key, task generation remains disabled. Generated prompts are AI-created practice only, are labeled as such, carry no payment, and are not live client commissions or guaranteed paid work.

Signed-in users can open `/support` for the AI help assistant. It uses the same server-side `OPENAI_API_KEY` and OpenAI Responses API; without the key, the chat reports that it is not configured. Requests are limited to 12 per user per minute, chat history is not saved by Taskly, and provider requests disable response storage. The assistant is instructed not to claim that work was assessed, approved, or paid because those features are not integrated. Do not enter passwords, verification codes, or payment details into chat.

The `/withdraw` page previews an M-Pesa withdrawal, enforces a maximum request amount of KSh 200, and validates a Kenyan phone number in the browser only; the phone number and amount are not submitted or stored because payments are not integrated. No STK prompt or payout is sent. Receiving withdrawals requires a verified account and a Safaricom M-Pesa B2C integration; STK Push is for collecting payments from a customer. Account phone numbers are checked for Kenyan mobile-number format but are not verified by SMS. Do not use them to establish payout ownership until phone verification is implemented.

Before task browsing, each account must complete a one-minute typing assessment with a score of at least 10 WPM. Accuracy is displayed as feedback but does not affect passing; WPM is calculated from the number of characters typed. After submitting, the user sees the original passage beside their typed text, the measured time, WPM, and accuracy. Passing unlocks a button to continue to the task board; scores are calculated and eligibility is enforced by the server. The server validates the attempt duration and stores passing results per account; the browser cannot submit a self-reported typing speed. Starter accounts (below 25 WPM) see tasks estimated at 40 minutes or less, steady accounts (25–44 WPM) see tasks estimated at 50 minutes or less, and advanced accounts (45 WPM or higher) can see all task lengths.

Signup and login are real and use individual SQLite-backed accounts. The login screen checks Kenyan phone-number formatting, supports password-visibility controls, and creates a server-side session on signup/login. Protected pages and APIs require that session. Registration does not request a government ID or payout-account details. M-Pesa collection and payout are not integrated; no access fee or STK Push is taken. The task briefs, requester profiles, and reward amounts are examples rather than live customer work or guaranteed earnings. The payout activity section does not generate transactions; it states that no verified payout data is available while M-Pesa remains disconnected.

Use HTTPS in production so the session cookie is marked Secure. This application still needs deployment-specific review, abuse protection, backups, and an SMS verification/payment-provider integration before handling payout eligibility or money. Existing shared demo profile/task records are retained in legacy tables and are not shown in new accounts.
