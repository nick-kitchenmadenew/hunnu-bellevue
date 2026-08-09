/**
 * Lead capture: the site's own form posts here, this posts to GoHighLevel.
 *
 * PLANNING.md §9a decided this on 2026-07-25 — "forms post to a serverless
 * function → GoHighLevel API. No embedded GHL form." The embedded iframe that
 * has been running instead cost a day: invisible on iOS because WebKit collapses
 * an iframe with no intrinsic height, 3.5 MB of third-party transfer, five
 * Cloudflare challenge payloads, third-party cookies, and PageSpeed unable to
 * finish a run. None of that exists once the form is ours.
 *
 * ATTRIBUTION IS THE POINT, NOT A DETAIL. A GHL-hosted form records where a lead
 * came from by itself. An API post records nothing, so every lead lands as
 * "direct" and the ad reporting inside GHL goes blind — which is worse than the
 * iframe was. The browser collects utm_* and the referrer on first landing and
 * sends them here; this passes them to GHL as attributionSource.
 *
 * The token lives only in the Vercel environment. It is never in this repo, and
 * the code never logs it or echoes it back in a response.
 */

/**
 * CREATE, not upsert.
 *
 * Three live tests went to /contacts/upsert. All three returned 200, all three
 * saved the contact, and none of them recorded a scrap of attribution — including
 * the one sent with the exact key names from GHL's own schema. Upsert exists to
 * merge a record that may already be there; where someone came from is a
 * property of the visit, not of the person, and it looks like upsert simply drops
 * it. The sample payload carrying attributionSource is the create payload.
 *
 * Duplicates are the trade, and UPSERT is kept as the fallback below: if create
 * refuses because the contact exists, the lead still lands. A second copy of a
 * real enquiry is a nuisance; a silently lost enquiry is lost money.
 */
const GHL_CREATE = 'https://services.leadconnectorhq.com/contacts/';
const GHL_UPSERT = 'https://services.leadconnectorhq.com/contacts/upsert';
const GHL_NOTES = (id) => `https://services.leadconnectorhq.com/contacts/${id}/notes`;

/**
 * v3, not 2021-07-28.
 *
 * Four live tests stored no attribution while returning 200 every time. The
 * first three were my own errors — wrong custom-field mechanism, wrong key
 * names, wrong endpoint. The fourth was not: the header said 2021-07-28, which
 * is two versions behind current (2023-02-21, then v3), and an old API version
 * quietly ignoring a field it does not know is exactly this shape of failure.
 * Nick spotted it by reading the docs I had been guessing at.
 *
 * From v3 onward GHL uses named identifiers rather than dates.
 *
 * Notes stay on 2021-07-28 because that call demonstrably works, and changing
 * two things at once turns one clear test into two ambiguous ones.
 */
const GHL_VERSION = 'v3';
const GHL_NOTES_VERSION = '2021-07-28';

/** Trim, cap, and coerce to a string. Length caps are the cheap half of not
    forwarding junk to a CRM that charges by the contact. */
const clean = (v, max = 300) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = process.env.GHL_LEAD_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    // Loud in the logs, vague to the caller: a misconfigured deploy is our
    // problem to see and not a visitor's to read.
    console.error('lead: GHL_LEAD_TOKEN or GHL_LOCATION_ID missing from env');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  // Honeypot. A field no human sees and every naive bot fills. Answer 200 so the
  // bot has nothing to learn from the difference.
  if (clean(body.company)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 4000);

  // A name plus one way to reply. Anything less is not a lead, it is a typo.
  if (!name || (!email && !phone)) {
    return res.status(400).json({ ok: false, error: 'missing_contact_details' });
  }

  const [firstName, ...rest] = name.split(/\s+/);

  // Not hardcoded 'kitchenmadenew.com': this one function handles every entity
  // on the domain (root, /oakville/, /northyork/, and whatever a future site
  // adds) from one Vercel deployment, and req.headers.host is the domain the
  // request actually arrived on.
  const source = clean(req.headers.host, 200) || 'website';

  // Was `tags: ['website', 'oakville']`, unconditionally — hardcoded on a
  // function that serves all three entities, silently mistagging every GTA
  // and North York lead. Found while checking whether this file could be
  // copied into client-starter/ as a template, which it could not have been
  // like this.
  //
  // The obvious fix — read the city out of `landing_url`'s first path
  // segment — is wrong for GTA, the root entity: its pages have no city
  // prefix at all, so `/refacing/` would tag a lead "refacing". A real fix
  // needs the page to state its own entity explicitly rather than have this
  // function guess one from a URL shape, and that is client-side work for
  // another change. Until then: no per-entity tag rather than a wrong one —
  // the same reasoning gbp_to_config.py gives for leaving a TODO blank
  // instead of writing a plausible placeholder into it.
  const tags = ['website'];

  const payload = {
    locationId,
    firstName,
    lastName: rest.join(' '),
    name,
    source,
    tags,
    ...(email && { email }),
    ...(phone && { phone }),
    // NOT customFields. The first live test sent the message as
    // { key: 'message' } and GHL returned customFields: [] — a custom field has
    // to already exist in the account to be addressed by key, and silently
    // vanishes if it does not. The message is the whole reason the form exists,
    // so it goes in a note below instead: notes need no setup and cannot be
    // dropped for referring to something that was never created.
    // Custom fields, NOT attributionSource.
    //
    // Five live tests tried to write attributionSource and every one returned
    // 200 with nothing stored. It is not a writable field: GHL fills that panel
    // from its own tracking script on its own forms and funnels, which is
    // exactly what PLANNING.md §9a says — "GHL's built-in tracking-code feature
    // applies only to GHL-hosted sites/funnels — not applicable here." The same
    // section says what to do instead, and this is it.
    //
    // Keys are the ones GHL actually generated, read off the merge tags Nick
    // sent, NOT the ones suggested when asking for them: the click id field is
    // `google_click_id`, not `gclid`. A key that does not exist is dropped in
    // silence, so these are copied rather than assumed.
    customFields: [
      ['utm_source', clean(body.utm_source, 120)],
      ['utm_medium', clean(body.utm_medium, 120)],
      ['utm_campaign', clean(body.utm_campaign, 200)],
      ['google_click_id', clean(body.gclid, 300)],
      ['landing_page', clean(body.landing_url, 500)],
      ['referrer', clean(body.referrer, 500)],
      // The message goes here as well as into the note. The note is the copy
      // that cannot be lost; this one is filterable and usable in a workflow.
      ['details', message],
      // Answered 2026-07-30: a GHL file field DOES hold an external URL, and
      // renders it as a working link. So hosting enquiry photographs ourselves
      // and passing the URLs here works — the route is open whenever uploads
      // are built. Nothing sends photo_urls today; the contact page still uses
      // the GHL form, which takes its own uploads. See DISCREPANCIES.md #30.
      ['pictures_and_videos', clean(body.photo_urls, 2000)],
    ]
      .filter(([, v]) => v)
      .map(([key, field_value]) => ({ key, field_value })),
  };

  const post = (url, data) => fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
    // A lead is worth waiting for, but not worth hanging the page on.
    signal: AbortSignal.timeout(9000),
  });

  try {
    let r = await post(GHL_CREATE, payload);

    // 400/409 from create is generally "this contact already exists". Upsert
    // takes it instead — losing the attribution, which upsert ignores anyway,
    // but keeping the lead. Logged so a run of these is visible rather than
    // quietly normal.
    if (r.status === 400 || r.status === 409) {
      const why = await r.text().catch(() => '');
      console.warn(`lead: create refused ${r.status}, falling back to upsert`, why.slice(0, 300));
      r = await post(GHL_UPSERT, payload);
    }

    if (!r.ok) {
      // Log the status and GHL's message — never the token, never the headers.
      const detail = await r.text().catch(() => '');
      console.error(`lead: GHL responded ${r.status}`, detail.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'upstream' });
    }

    // The contact is saved. Everything below is best-effort: a note that failed
    // to attach must not turn a captured lead into an error the visitor sees.
    const created = await r.json().catch(() => ({}));
    const contactId = created?.contact?.id || created?.id;

    const noteBody = [
      message && `Message:\n${message}`,
      phone && `Phone: ${phone}`,
      email && `Email: ${email}`,
      '',
      'Where they came from:',
      `  source:   ${clean(body.utm_source, 120) || 'direct'}`,
      `  medium:   ${clean(body.utm_medium, 120) || '—'}`,
      `  campaign: ${clean(body.utm_campaign, 200) || '—'}`,
      `  landed:   ${clean(body.landing_url, 500) || '—'}`,
      `  referrer: ${clean(body.referrer, 500) || 'none'}`,
      clean(body.utm_content, 200) && `  content:  ${clean(body.utm_content, 200)}`,
      clean(body.utm_term, 200) && `  term:     ${clean(body.utm_term, 200)}`,
      // gclid also goes to its own custom field; fbclid has nowhere else to go,
      // so the note is the only record of a Meta-sourced click.
      clean(body.gclid, 300) && `  gclid:    ${clean(body.gclid, 300)}`,
      clean(body.fbclid, 300) && `  fbclid:   ${clean(body.fbclid, 300)}`,
    ].filter((l) => l !== undefined && l !== false && l !== '').join('\n');

    if (contactId) {
      try {
        const n = await fetch(GHL_NOTES(contactId), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_NOTES_VERSION,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ body: noteBody }),
          signal: AbortSignal.timeout(6000),
        });
        if (n.ok) {
          console.log(`lead: contact ${contactId} saved, note attached`);
        } else {
          const d = await n.text().catch(() => '');
          console.error(`lead: contact ${contactId} saved, NOTE FAILED ${n.status}`, d.slice(0, 300));
        }
      } catch (e) {
        console.error(`lead: contact ${contactId} saved, note threw`, e?.name, e?.message);
      }
    } else {
      // Worth shouting about: the lead is in, but the message is not, and
      // nothing in GHL will show that it was ever sent.
      console.error('lead: contact saved but no id in response — message not attached',
        JSON.stringify(created).slice(0, 300));
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead: request to GHL failed', err?.name, err?.message);
    return res.status(502).json({ ok: false, error: 'upstream' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

// The fbc/fbp assembly that lived here is gone with attributionSource. There is
// no Meta custom field in the account and no pixel on the site, so there is
// nowhere for it to go and nothing to build it from. The raw fbclid still
// reaches the note, so a Meta-sourced lead is not anonymous in the meantime.
// PLANNING.md §9a wants a deferred pixel for remarketing; wire this back up then.
