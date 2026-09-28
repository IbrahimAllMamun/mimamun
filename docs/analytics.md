# Analytics

First-party, privacy-preserving visit statistics, built into the API.
Analytics loads no third-party scripts, sets no cookies, uses no browser
storage and stores no IP addresses. Code: `apps/web/src/components/site/analytics-beacon.tsx`,
`apps/api/src/modules/analytics`.

## What is recorded

Three event types:

| Event            | When                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `page_view`      | a public page is shown, including client-side navigations                                                   |
| `download`       | a link to an uploaded file (`/media/…`) is followed, or the CV is downloaded via `/cv` (counted by the API) |
| `outbound_click` | a link to another site is followed                                                                          |

Each event row (`analytics_events`) stores:

| Field               | Detail                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| type, time          |                                                                                                      |
| path                | without query string or fragment                                                                     |
| entity              | project, research, post or credential slug, derived from the path                                    |
| referrer host       | only for the first page view after the site is opened, only external hosts, host name only (no path) |
| target              | the file or external URL (origin + path) for downloads and outbound clicks                           |
| device, browser, OS | coarse categories from the user agent (e.g. mobile / Chrome / Android)                               |
| country             | only when `ANALYTICS_COUNTRY_HEADER` names a header your CDN sets; otherwise empty                   |
| visitor hash        | see below                                                                                            |

### Counting visitors without identifying them

`visitor_hash = SHA-256(daily salt | IP address | user agent)`, truncated.
A new random salt is created each day and deleted after two days
(`analytics_salts`). The same person is therefore counted once per day, can
not be followed from one day to the next, and once the salt is gone the hash
cannot be recomputed from an IP address. The IP address itself is never
stored.

## What is never recorded

- Visitors whose browser sends **Do Not Track** (`DNT: 1`) or **Global
  Privacy Control** (`Sec-GPC: 1`): the browser script sends nothing, and the
  API ignores events that carry either header anyway.
- Bots and requests without a user agent.
- Admin screens and draft previews (`/admin/*`, `/preview/*`), both in the
  browser and on the server.
- Anything at all while analytics is switched off.

## Controls

**Admin → Settings → Analytics**:

- **Record anonymous page views** — on by default. When off, the site does
  not load the beacon and the API drops events.
- **Keep events for (days)** — 30 to 1095, default 395 (13 months). The
  daily maintenance job deletes older events.

Ingestion (`POST /api/analytics/events`) always answers `204` and is limited
to 60 events per minute per IP.

## Reports

**Admin → Analytics** (`analytics:read`) shows, for the last 7, 30, 90 or
365 days: page views and visitors with the change against the previous
period, a daily chart (with a data table), top pages, the most viewed
projects, research, posts and credentials, referrers, devices, browsers,
countries, downloads and outbound clicks. The dashboard shows the last seven
days.

## Tests

`apps/api/test/integration/contact-analytics.test.ts` checks that page views
are stored without IPs or cookies, that DNT, GPC and bots are ignored, that
admin and preview paths are never counted, that nothing is stored while
analytics is off, that malformed events are rejected, and the summary
figures.
