import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'node:fs';
import { entityContentDir, entityId } from './lib/paths.js';

// An entity with a config and no content directory builds zero pages and then
// fails somewhere further down with something that does not mention content.
// Say it here instead — this is the normal state of a site that has been
// configured and not yet written.
if (!fs.existsSync(entityContentDir)) {
  throw new Error(`no content for entity "${entityId}": ${entityContentDir} does not exist. `
    + `Each entity's pages live in content/<entity>/.`);
}

/**
 * Page content, as data.
 *
 * The homepage was 406 lines of hand-assembled JSX with ~1,100 words of prose
 * baked into it. Twenty-four more pages built that way would diverge one
 * component at a time — which is exactly how the font, colour and band-tone
 * inconsistencies happened at the scale of one page.
 *
 * Everything structural lives in frontmatter and is validated here, so a page
 * missing a required field is a BUILD ERROR rather than something noticed weeks
 * later. Everything narrative lives in the markdown body: H2 sections and
 * paragraphs, which is exactly the shape the content generator emits.
 *
 * Links are never written into the markdown. A prose block names the anchor it
 * carries and marks the spot with [[anchor]]; the template injects the link.
 * That way "the link sits inside its 70-100 word context" is guaranteed by
 * construction rather than checked afterwards.
 */

/** A body section that carries one in-silo link. */
const linked = z.object({
  /** Slug of the page this links to, relative to its silo. */
  to: z.string(),
  heading: z.string(),
  /** Anchor text — must be unique site-wide; the linter enforces that. */
  anchor: z.string(),
  /** The section's paragraphs, in order. EXACTLY ONE must contain [[anchor]] —
      that paragraph becomes the link's 70-100 word context; the rest render
      around it as ordinary prose. A generated section of 450 words cannot be one
      block and still satisfy the context rule. */
  paragraphs: z.array(z.string()).min(1),
  /** This section's photograph. Omit it and the page gets a placeholder — never
      another page's picture. Reusing an image is worse than a placeholder: the
      placeholder is a visible task, a borrowed photo is a silent inaccuracy. */
  image: z.object({ slug: z.string(), alt: z.string() }).optional(),
}).refine((s) => s.paragraphs.filter((p) => p.includes('[[anchor]]')).length === 1, {
  message: 'exactly one paragraph must contain [[anchor]] — the link needs one home, ' +
           'and it must sit inside its context rather than follow it',
});

const pages = defineCollection({
  // Content sits in the payload beside the config, not inside site/. The config
  // and the content are the business; site/ is how it is built.
  //
  // ABSOLUTE, from paths.js. It was '../content', relative — which Astro resolves
  // against the project root, so it only worked while the schema and the project
  // were the same repository. From inside a package that relationship is not
  // knowable, and a wrong base is silent: the collection simply comes back empty
  // and the build succeeds with no pages.
  loader: glob({ pattern: '**/*.md', base: entityContentDir }),
  schema: z.object({
    type: z.enum(['pillar', 'service', 'location', 'utility', 'hub', 'supporting']),

    /** The GBP category this page belongs to. Checked against config by the linter. */
    silo: z.string(),

    /** Title tag — carries the re-themed keyword. Bounds here are a runaway
        guard, not the SEO advice: Google truncates nearer 60 characters, and the
        linter warns past that. A build should not fail over four characters. */
    title: z.string().min(20).max(80),
    description: z.string().min(70).max(170),

    /** H1. For a pillar this MUST carry the GBP category verbatim. */
    h1: z.string(),
    /** Sits above the H1. On a re-themed page this is where the target keyword
        goes, because the H1 is reserved for the GBP category. */
    eyebrow: z.string().optional(),
    lede: z.string(),

    /** Which sections this page has. Order is fixed by the template, not here. */
    sections: z.array(z.string()).min(2),

    /** How many entries in `services` get the big illustrated treatment before the
        rest fall back to the compact hairline list. Defaults to 2. The homepage
        raises it to 3 so refacing, painting and refinishing — the three services
        that earn the money — are the illustrated ones. Per page, because a pillar
        with four services should not be forced to feature three of them just
        because the homepage does. */
    featured_services: z.number().int().min(0).max(6).optional(),

    /** Opts out of the before/after hero entirely — a plain H1 + lede instead.
        A contact page has no transformation to show, and giving it one would mean
        two more photographs whose only job is to fill a slot. */
    plainHero: z.boolean().optional(),

    /** The hero before/after pair. Defaults to the first gallery entry. */
    /** Either a pair — `slug` plus `ext`, resolving to <slug>-before/-after — or
        `single`, one filename for one photograph. A pair is the better argument
        where one exists; `single` is for a page whose best image is one frame,
        which beats a plate standing next to a photograph. */
    hero: z.object({
      slug: z.string().optional(), ext: z.string().optional(),
      single: z.string().optional(),
      alt: z.string(), caption: z.string(),
    }).refine((h) => Boolean(h.single) !== Boolean(h.slug && h.ext),
      { message: 'hero needs either `single`, or both `slug` and `ext` — not both and not neither' })
      .optional(),

    /** Named people, grouped. `where` on the group is load-bearing: who comes to
        the house and who works at the shop is a fact customers act on. */
    team: z.array(z.object({
      label: z.string(),
      note: z.string().optional(),
      people: z.array(z.object({
        name: z.string(),
        role: z.string(),
        photo: z.string().optional(),   // omitted → placeholder plate
      })).min(1),
    })).optional(),

    /** A walkthrough of one finished kitchen. `file` is a filename under
        public/video/, not an import — video does not go through the asset
        pipeline, and Astro would not transform it if it did.

        `duration` and `uploaded` exist for the VideoObject schema rather than for
        the page: Google will not treat a video as a video without them. Both are
        required for that reason — an optional field here means a page that renders
        fine and is invisible as video, which is the one failure nobody notices. */
    video: z.object({
      file: z.string(),
      poster: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
      /** Paragraphs beside the frame. A list rather than one string because the
          video is portrait and tall — a single paragraph next to 700px of video
          leaves the column mostly empty, and what belongs there is the scope of
          the job, which does not fit in one. */
      body: z.array(z.string()).optional(),
      /** ISO 8601 duration, e.g. PT1M11S. */
      duration: z.string().regex(/^PT(\d+M)?(\d+S)?$/, 'duration must be ISO 8601, e.g. PT1M11S'),
      uploaded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'uploaded must be YYYY-MM-DD'),
    }).optional(),

    // ── optional structured sections ──────────────────────────────────
    stats: z.array(z.object({
      figure: z.string(), label: z.string(), star: z.boolean().optional(),
    })).optional(),

    compare: z.object({
      a: z.string(), b: z.string(),
      lede: z.string().optional(),
      rows: z.array(z.object({ label: z.string(), a: z.string(), b: z.string() })),
    }).optional(),

    /** Reference numbers pulled out of one prose section's own paragraph —
        `section` is 1-indexed against that page's body H2s, the same count
        `<!-- image: -->`'s section-N naming already uses. Unvalidated, same as
        that convention already is: lint.mjs walks built HTML only and never
        opens a content file's frontmatter, so a `section` past the real H2
        count renders nothing and nothing catches it — the existing risk this
        shares rather than a new one.

        `after` names one of that section's own ### subheadings, verbatim, and
        the card renders right after ITS paragraphs — before the next ### or
        the end of the section, whichever comes first. Omitted, or naming a
        heading the section doesn't have, falls back to the end of the whole
        section, which is correct whenever it has no ### subheadings to land
        in the wrong place among. */
    specs: z.array(z.object({
      section: z.number().int().positive(),
      after: z.string().optional(),
      label: z.string(),
      rows: z.array(z.object({ label: z.string(), value: z.string() })),
    })).optional(),

    process: z.object({
      lede: z.string().optional(),
      steps: z.array(z.object({
        day: z.string(), title: z.string(), body: z.string(),
      })),
    }).optional(),

    services: z.array(linked).optional(),
    categories: z.array(linked).optional(),

    /** Location pages only. The second contextual link — to the service this
        neighbourhood argues for, alongside the up-link to the root. Which service
        is legal is declared in config as `for`; this supplies the words. */
    service_link: linked.optional(),

    /** Supporting articles only. The one lateral link in the model: on to the
        next article in this topic's circle. `to` is a sibling slug. */
    sibling: linked.optional(),

    /** A service page's link up to its parent pillar. `to` is ignored — the
        destination is the parent, which the silo already knows. */
    uplink: linked.optional(),

    /** An FAQ entry, optionally carrying the link down to the supporting article
        that answers the question at length. `to` is the article slug relative to
        this page; `anchor` marks the words in `a` that become the link.

        This is where the method puts it — Caleb calls the block of question and
        short answer "the FAQ", and the article points back "up to the URL where
        the FAQ is". So the FAQ grows by one entry per supporting article rather
        than the articles hanging off a separate section. */
    faq: z.array(z.object({
      q: z.string(),
      a: z.string(),
      to: z.string().optional(),
      anchor: z.string().optional(),
    }).refine((f) => !f.to || (f.anchor && f.a.includes('[[anchor]]')), {
      message: 'an FAQ entry with `to` needs `anchor` and a [[anchor]] marker in the answer',
    })).optional(),

    /** Which reviewers to show, by name. Omit to show all.
        A review naming a different service is not wrong, but one that describes
        the OPPOSITE service undercuts the page it sits on — a reface review
        praising new doors, on a page whose argument is that your doors stay. */
    reviews: z.array(z.string()).optional(),

    cta: z.object({ heading: z.string(), body: z.string() }).optional(),

    /** Headings for the generated sections, so copy stays out of the template. */
    /** Services hub only. A blurb per silo, keyed by silo slug ('home' for the
        primary silo, whose slug is empty). Which services appear in the index is
        read from the config, not from here — only the prose is editorial. */
    index_notes: z.record(z.string()).optional(),

    /** One line describing this service, for the card that links TO this page
        from its pillar and from the services hub. It lives here rather than in
        config-oakville.yaml for two reasons: the config mirrors the GBP profile
        and this is editorial copy, and a description kept on the page it
        describes cannot drift from it. Both card grids read this same string. */
    card: z.string().min(30).max(110).optional(),

    /** Location pages only. The service this neighbourhood page is actually
        about, named exactly as it should appear in the Service schema node.
        Without it the node reports the silo's CATEGORY, so a page arguing for
        cabinet refacing in one neighbourhood told Google it was a kitchen
        remodeler serving five cities. Does not affect linking. */
    service_focus: z.string().min(6).max(60).optional(),

    /** Pillar only. The "why choose us" argument for this category, as a short
        list of reasons. Per silo on purpose: the reason to choose a cabinet
        painter is not the reason to choose a countertop contractor, and a list
        that would suit both is a list that argues for neither. */
    why: z.array(z.object({
      title: z.string().min(8).max(70),
      body: z.string().min(40).max(320),
    })).min(2).max(5).optional(),

    /** About only. The facts a reader checks before hiring anybody — licences,
        insurance, warranty terms, who is actually on the payroll.

        `body` is capped short on purpose. These are rows in a scanned grid, not
        an argument: a credential that needs a paragraph to stand up is not a
        credential, it is a section, and the prose above this one is where it
        belongs. The cap is the only thing keeping the block from drifting back
        into being more prose. */
    credentials: z.array(z.object({
      title: z.string().min(6).max(48),
      body: z.string().min(40).max(260),
    })).min(3).max(8).optional(),

    headings: z.record(z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      lede: z.string().optional(),

      /** The three below are read only by the `consultation` section. They live
          here rather than in their own top-level block because this is already
          where that section's copy is written, and splitting one section's words
          across two places is how they drift apart.

          They exist because Consultation.astro used to hardcode all three, so
          every pillar claimed "100+ kitchens refaced" and described laying out
          "samples, finishes and hardware" — refacing copy, printed under the
          countertop page's heading about templating stone. `verb` is required by
          lint on any page with a consultation section, so a new pillar cannot
          inherit the wrong one by saying nothing. */
      verb: z.string().optional(),
      body: z.string().optional(),
      points: z.array(z.string()).min(1).optional(),

      /** Read only by the `form` section, where it is the label on a button
          linking to the contact page. Setting it replaces the embedded GHL form
          on that page — see the note in Pillar.astro. */
      button: z.string().optional(),

      /** Demotes this section's heading to an h3. Sections are h2 by default
          and should stay that way; this is for the explanatory asides that are
          not top-level sections of the page. The prose equivalent is the
          `<!-- level: 3 -->` marker — see SectionHead.astro for the two rules
          bounding where either can be used. */
      level: z.union([z.literal(2), z.literal(3)]).optional(),
    })).optional(),
  }),
});

export const collections = { pages };
