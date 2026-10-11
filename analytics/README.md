# Portfolio analytics

**Dashboard:** https://phcodesage.github.io/analytics/

The dashboard uses the portfolio’s cream/lilac design and coding cat. A password is required for private statistics. The password is a Cloudflare Worker secret named `ADMIN_TOKEN`, not a frontend value or URL parameter. The initial owner password is saved outside the repository at `/Users/macmini/.config/phcodesage-portfolio/analytics-password.txt` with owner-only file permissions.

The static dashboard lives on GitHub Pages. A separate `portfolio-analytics` Cloudflare Worker collects and aggregates events in the existing `bounty-radar-analytics` D1 database. It adds `portfolio_events` without replacing the original `page_views` archive or changing the Bounty Radar Worker. New page-view events update both tables in one transaction; duplicate event IDs do not increment counts again.

## What is measured

- Page views and approximate daily sessions.
- Countries from Cloudflare edge metadata; browsers cannot supply the country value.
- Project cards and archive entries, plus case-study links to live demos and source repositories.
- Resume and section navigation.
- Contact-section openings, email/WhatsApp/Telegram links, and valid form submission attempts.
- Completed inquiries only after FormSubmit reports success. Analytics never copies the message or contact details.
- Referring hostname and a mobile/tablet/desktop screen-size category.

The dashboard has Today, 7-day and 30-day filters, a daily chart and accessible data table, country and project rankings, traffic sources, contact actions, device categories, and page counts. All periods use calendar dates in Asia/Manila. No historical country or click data is fabricated: detailed events start with this deployment. Earlier page views remain in the public 30-day count.

## Privacy and access

The collector accepts the exact portfolio origin and known event types, paths, project IDs and targets. It limits event sizes, ignores detectable bots, and limits events per daily session. Cloudflare estimates country from the incoming network connection. The application stores no IP addresses, full user agents, full referrer URLs, query strings, names, form contents, or precise location.

The browser keeps a random ID in session storage. The backend transforms it using a server secret and the current Manila date, so stored identifiers change daily. Session counts are approximate; they are not unique-person counts. Global Privacy Control, Do Not Track, and the browser opt-out at `/privacy/` suppress collection. Storage or beacon failure does not block portfolio navigation.

Detailed events expire after 90 days via a daily maintenance trigger. The existing page-view archive is preserved. The public `/api/summary` endpoint exposes only the total views. `/api/stats` requires `Authorization: Bearer <ADMIN_TOKEN>` and never accepts the token in a URL. Responses are not cached. Dashboard access is kept only in the current browser tab and cleared by Sign out.

No Telegram bot, Telegram secrets, or Telegram report schedule is configured.

## Development and deployment

Node 26 was used for validation. The database tests use Node’s built-in SQLite module; Node 22.13 or later is required. Browser checks use installed Google Chrome on macOS and Playwright Chromium elsewhere.

```sh
npm ci
npm run test:analytics
npm run test:analytics:browser
npx wrangler d1 execute bounty-radar-analytics --remote --file analytics/schema.sql
npm run deploy:analytics
```

Required Worker secrets: `ADMIN_TOKEN` (a strong, dedicated dashboard password) and `SESSION_SALT` (a random server-only value). Set them with `wrangler secret put <NAME> --config analytics/wrangler.jsonc`; enter values through stdin. Never commit secrets or put them in browser code. Updating `ADMIN_TOKEN` revokes prior dashboard access on the next request.

Deploy the Worker before publishing a frontend that points to a new endpoint. Push the portfolio to its existing GitHub Pages branch to publish the dashboard, tracking script and arrows. The tracked Wrangler file preserves the database binding and daily retention trigger.

The automated browser test routes portfolio assets and API requests inside an isolated browser and runs the actual Worker against an in-memory SQLite database. It covers view/click aggregation, case-study and demo navigation, inquiry events without form data, opt-out signals, restricted storage, beacon fallback, login and logout, filters, empty states, readable text and responsive layouts. It sends no messages, creates no real inquiries, and writes no production analytics. QA screenshots go to ignored `test-results/`.
