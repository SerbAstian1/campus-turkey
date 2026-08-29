/**
 * The server-rendered text for each public route.
 *
 * **Read from the content modules, not retyped.** `src/content/*` already holds the
 * services, articles, institutions, scholarships and company records that the design
 * system screens render, and the universities come from the same database rows the page
 * already loaded. Composing from those means this cannot drift into a second, quietly
 * different version of the site, which is the failure mode that makes a fallback worse
 * than none: two descriptions of the same page competing in an index.
 *
 * Every string passes through `t()` for the same reason the screens do. A French page
 * that advertises `hreflang="fr"` and serves English body text is a worse result than an
 * English page, because it wastes the click.
 *
 * These are async server components. They run only on the server, they never touch the
 * design system, and their output is what `Hydrated` shows until the bundle resolves.
 */

import {
  articles,
  getArticle,
  getInstitution,
  getService,
  services,
  institutions,
  serviceCards,
  stats,
  journey,
  scholarships,
  studentLife,
  generalFaq,
  offices,
  milestones,
  accreditations,
  contact,
  partnerBenefits,
  representative,
  representativeSteps,
} from "@/content";
import { privacyNotice } from "@/content/privacy";
import { getTranslator } from "@/i18n/messages";
import { localePath, type Locale } from "@/i18n/locales";
import type { FaqItem, Point } from "@/content";
import {
  SeoDocument,
  SeoFacts,
  SeoLinks,
  SeoList,
  SeoParagraphs,
  SeoSection,
  SeoText,
  SeoTitle,
} from "./Content";

type Translate = (key: string) => string;

/** Icon-led points, flattened to prose. The icon is decoration and has no text value. */
function pointsSection(t: Translate, heading: string, points: readonly Point[]) {
  return (
    <SeoSection heading={heading}>
      {points.map((point) => (
        <SeoText key={point.title}>
          <strong>{t(point.title)}</strong>. {t(point.body)}
        </SeoText>
      ))}
    </SeoSection>
  );
}

/**
 * Questions and answers as a description list.
 *
 * The design system renders these in an accordion, where the answers are hidden until
 * clicked. Hidden text is worth little to a crawler and nothing to a reader mode, so
 * here they are simply open.
 */
function faqSection(t: Translate, heading: string, faq: readonly FaqItem[]) {
  if (faq.length === 0) return null;
  return (
    <SeoSection heading={heading}>
      <SeoFacts items={faq.map((item) => [t(item.question), t(item.answer)] as const)} />
    </SeoSection>
  );
}

/* ------------------------------------------------------------------ home */

export async function HomeSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);
  const path = (route: string) => localePath(route, locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Study in Türkiye, without the guesswork")}
        lead={t("Campus Turkey places international students in Turkish universities and handles the visa, the housing and the arrival. We have worked with Turkish universities, hospitals and chambers of commerce since 2014.")}
      />

      <SeoSection heading={t("What we do")}>
        {serviceCards.map((card) => (
          <SeoText key={card.title}>
            <strong>{t(card.title)}</strong>. {t(card.description)}
          </SeoText>
        ))}
      </SeoSection>

      <SeoSection heading={t("Campus Turkey in numbers")}>
        <SeoFacts items={stats.map((stat) => [t(stat.label), t(stat.value)] as const)} />
      </SeoSection>

      <SeoSection heading={t("How an application runs")}>
        {journey.map((step) => (
          <SeoText key={step.title}>
            <strong>{t(step.title)}</strong>. {t(step.description)}
          </SeoText>
        ))}
      </SeoSection>

      <SeoLinks
        heading={t("Where to go next")}
        links={[
          { href: path("/universities"), label: t("Browse the university directory") },
          { href: path("/study-in-turkiye"), label: t("Study in Türkiye") },
          { href: path("/services"), label: t("Services") },
          { href: path("/apply"), label: t("Apply Now") },
          { href: path("/partnerships"), label: t("Partners") },
          { href: path("/about"), label: t("About Campus Turkey") },
          { href: path("/contact"), label: t("Contact Campus Turkey") },
        ]}
      />
    </SeoDocument>
  );
}

/* ---------------------------------------------------------- universities */

interface DirectoryEntry {
  slug: string;
  name: string;
  city: string;
  type: string;
  languages: string[];
  tuition: string;
  programs: number;
}

export async function UniversitiesSeo({
  locale,
  entries,
}: {
  locale: Locale;
  entries: readonly DirectoryEntry[];
}) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Turkish universities")}
        lead={t("Every university we place students into, with tuition, languages of instruction and the number of programs on offer. Filter and map view load with the full page.")}
      />

      <SeoSection heading={t("The directory")}>
        {entries.map((entry) => (
          <SeoText key={entry.slug}>
            <a href={localePath(`/universities/${entry.slug}`, locale)} style={{ color: "var(--green-700)" }}>
              {entry.name}
            </a>
            {". "}
            {entry.city}
            {". "}
            {t(entry.type === "PUBLIC" ? "Public" : "Private")}
            {". "}
            {t("Tuition")}: {entry.tuition}
            {". "}
            {t("Programs")}: {entry.programs}
            {". "}
            {t("Taught in")}: {entry.languages.join(", ")}
            {"."}
          </SeoText>
        ))}
      </SeoSection>
    </SeoDocument>
  );
}

interface UniversityFacts {
  slug: string;
  name: string;
  city: string;
  type: string;
  about: string;
  languages: string[];
  tuition: string;
  programs: number;
  scholarship: boolean | null;
  founded: number | null;
  students: string | null;
  ranking: string | null;
  faculties: string[];
  deadlines: [string, string][];
}

export async function UniversityDetailSeo({
  locale,
  university,
  similar,
}: {
  locale: Locale;
  university: UniversityFacts;
  similar: readonly { slug: string; name: string; city: string }[];
}) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle title={`${university.name}, ${university.city}`} lead={university.about} />

      <SeoSection heading={t("The facts")}>
        <SeoFacts
          items={[
            [t("City"), university.city],
            [t("Type"), t(university.type === "PUBLIC" ? "Public" : "Private")],
            [t("Founded"), university.founded],
            [t("Students"), university.students],
            [t("Programs"), university.programs],
            [t("Tuition"), university.tuition],
            [t("Taught in"), university.languages.join(", ")],
            [t("Ranking"), university.ranking],
            [t("Scholarships"), university.scholarship === null ? null : t(university.scholarship ? "Available" : "Not offered")],
          ]}
        />
      </SeoSection>

      {university.faculties.length > 0 ? (
        <SeoSection heading={t("Faculties")}>
          <SeoList items={university.faculties} />
        </SeoSection>
      ) : null}

      {university.deadlines.length > 0 ? (
        <SeoSection heading={t("Intake deadlines")}>
          <SeoFacts items={university.deadlines.map(([label, value]) => [t(label), value] as const)} />
        </SeoSection>
      ) : null}

      <SeoLinks
        heading={t("Similar universities")}
        links={similar.map((s) => ({
          href: localePath(`/universities/${s.slug}`, locale),
          label: `${s.name}, ${s.city}`,
        }))}
      />

      <SeoLinks
        heading={t("Where to go next")}
        links={[
          { href: localePath("/universities", locale), label: t("Browse the university directory") },
          { href: localePath("/apply", locale), label: t("Apply Now") },
        ]}
      />
    </SeoDocument>
  );
}

/* -------------------------------------------------------------- services */

export async function ServicesSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Services")}
        lead={t("Education is what we are built around. The other services exist because families asked for them.")}
      />

      <SeoSection heading={t("What we offer")}>
        {services.map((service) => (
          <SeoText key={service.slug}>
            <a href={localePath(`/services/${service.slug}`, locale)} style={{ color: "var(--green-700)" }}>
              {t(service.title)}
            </a>
            {". "}
            {t(service.lead)}
          </SeoText>
        ))}
      </SeoSection>
    </SeoDocument>
  );
}

export async function ServiceDetailSeo({ locale, slug }: { locale: Locale; slug: string }) {
  const t = await getTranslator(locale);
  const service = getService(slug);
  if (!service) return null;

  return (
    <SeoDocument>
      <SeoTitle title={t(service.title)} lead={t(service.lead)} />

      {pointsSection(t, t("What this covers"), service.points)}

      {service.includes.map((group) => (
        <SeoSection key={group.title} heading={t(group.title)}>
          <SeoList items={group.items.map((item) => t(item))} />
        </SeoSection>
      ))}

      {service.pricing.length > 0 ? (
        <SeoSection heading={t("Indicative pricing")}>
          <SeoFacts items={service.pricing.map((row) => [t(row.item), `${t(row.price)}. ${t(row.note)}`] as const)} />
        </SeoSection>
      ) : null}

      {service.trust.length > 0 ? (
        <SeoSection heading={t("What you can rely on")}>
          <SeoList items={service.trust.map((line) => t(line))} />
        </SeoSection>
      ) : null}

      {faqSection(t, t("Common questions"), service.faq)}

      <SeoLinks
        heading={t("Where to go next")}
        links={[
          { href: localePath("/services", locale), label: t("Services") },
          { href: localePath("/contact", locale), label: t("Contact Campus Turkey") },
        ]}
      />
    </SeoDocument>
  );
}

/* ---------------------------------------------------------- institutions */

export async function InstitutionSeo({ locale, slug }: { locale: Locale; slug: string }) {
  const t = await getTranslator(locale);
  const institution = getInstitution(slug);
  if (!institution) return null;

  return (
    <SeoDocument>
      <SeoTitle title={t(institution.title)} lead={t(institution.lead)} />

      {pointsSection(t, t("What this covers"), institution.points)}

      {institution.stats.length > 0 ? (
        <SeoSection heading={t("In numbers")}>
          <SeoFacts items={institution.stats.map((stat) => [t(stat.label), t(stat.value)] as const)} />
        </SeoSection>
      ) : null}

      {institution.list.length > 0 ? (
        <SeoSection heading={t("Included")}>
          <SeoList items={institution.list.map((item) => t(item))} />
        </SeoSection>
      ) : null}

      <SeoLinks
        heading={t("Where to go next")}
        links={institutions
          .filter((other) => other.slug !== institution.slug)
          .map((other) => ({
            href: localePath(`/institutions/${other.slug}`, locale),
            label: t(other.title),
          }))}
      />
    </SeoDocument>
  );
}

/* ------------------------------------------------------------- resources */

export async function ResourcesSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Resources")}
        lead={t("Guides, checklists and explainers on applying to a Turkish university, the visa, and what the first month costs.")}
      />

      <SeoSection heading={t("Articles")}>
        {articles.map((article) => (
          <SeoText key={article.slug}>
            <a href={localePath(`/resources/${article.slug}`, locale)} style={{ color: "var(--green-700)" }}>
              {t(article.title)}
            </a>
            {". "}
            {t(article.body)}
          </SeoText>
        ))}
      </SeoSection>
    </SeoDocument>
  );
}

export async function ArticleSeo({ locale, slug }: { locale: Locale; slug: string }) {
  const t = await getTranslator(locale);
  const article = getArticle(slug);
  if (!article) return null;

  return (
    <SeoDocument>
      <SeoTitle title={t(article.title)} lead={t(article.body)} />

      <SeoFacts
        items={[
          [t("Type"), t(article.tag)],
          [t("Reading time"), t(article.read)],
          [t("Published"), article.date],
          [t("Author"), article.author],
        ]}
      />

      {article.sections.map((section) => (
        <SeoSection key={section.heading} heading={t(section.heading)}>
          <SeoParagraphs paragraphs={section.paragraphs.map((paragraph) => t(paragraph))} />
        </SeoSection>
      ))}

      <SeoLinks
        heading={t("More resources")}
        links={articles
          .filter((other) => other.slug !== article.slug)
          .slice(0, 4)
          .map((other) => ({
            href: localePath(`/resources/${other.slug}`, locale),
            label: t(other.title),
          }))}
      />
    </SeoDocument>
  );
}

/* --------------------------------------------------------- study hub */

export async function StudySeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Study in Türkiye")}
        lead={t("Public universities are heavily subsidised and private universities offer scholarships. We confirm what you will actually pay before you apply.")}
      />

      {faqSection(t, t("Common questions"), generalFaq)}

      <SeoLinks
        heading={t("Where to go next")}
        links={[
          { href: localePath("/study-in-turkiye/application-process", locale), label: t("Application process") },
          { href: localePath("/study-in-turkiye/scholarships", locale), label: t("Scholarships") },
          { href: localePath("/study-in-turkiye/student-life", locale), label: t("Student life") },
          { href: localePath("/universities", locale), label: t("Browse the university directory") },
        ]}
      />
    </SeoDocument>
  );
}

export async function ScholarshipsSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Scholarships")}
        lead={t("What each scholarship covers, who it is for, and how competitive it actually is. We do not imply a guarantee.")}
      />

      {scholarships.map((scholarship) => (
        <SeoSection key={scholarship.name} heading={t(scholarship.name)}>
          <SeoFacts
            items={[
              [t("Who it is for"), t(scholarship.who)],
              [t("What it covers"), t(scholarship.covers)],
              [t("When to apply"), t(scholarship.when)],
              [t("How competitive"), t(scholarship.competitive)],
            ]}
          />
        </SeoSection>
      ))}
    </SeoDocument>
  );
}

export async function StudentLifeSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Student life")}
        lead={t("Housing, everyday costs, working while you study, and what the first month in Türkiye actually looks like.")}
      />
      {pointsSection(t, t("What to expect"), studentLife)}
    </SeoDocument>
  );
}

export async function ApplicationProcessSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Application process")}
        lead={t("From first enquiry to your first week in Türkiye, and what we need from you at each stage.")}
      />

      <SeoSection heading={t("The stages")}>
        {journey.map((step) => (
          <SeoText key={step.title}>
            <strong>{t(step.title)}</strong>. {t(step.description)}
          </SeoText>
        ))}
      </SeoSection>

      <SeoLinks
        heading={t("Where to go next")}
        links={[{ href: localePath("/apply", locale), label: t("Apply Now") }]}
      />
    </SeoDocument>
  );
}

/* ---------------------------------------------------------- partnerships */

export async function PartnershipsSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Partners")}
        lead={t("Agencies, country representatives and universities work with Campus Turkey under one agreement and one portal.")}
      />

      {pointsSection(t, t("What partners get"), partnerBenefits)}

      <SeoLinks
        heading={t("Partner routes")}
        links={[
          { href: localePath("/partnerships/agents", locale), label: t("For agencies") },
          { href: localePath("/partnerships/representatives", locale), label: t("For country representatives") },
          { href: localePath("/partnerships/universities", locale), label: t("For universities") },
        ]}
      />
    </SeoDocument>
  );
}

export async function AgentsSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("For agencies")}
        lead={t("Register your agency, refer students, and track every application and commission in one portal.")}
      />
      {pointsSection(t, t("What you get"), partnerBenefits)}
    </SeoDocument>
  );
}

export async function RepresentativesSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("For country representatives")}
        lead={t("Represent Campus Turkey in your country, with a defined territory and a published commission schedule.")}
      />

      {pointsSection(t, t("What you get"), representative.benefits)}

      <SeoSection heading={t("How it works")}>
        {representativeSteps.map((step) => (
          <SeoText key={step.title}>
            <strong>{t(step.title)}</strong>. {t(step.description)}
          </SeoText>
        ))}
      </SeoSection>

      {representative.requirements.length > 0 ? (
        <SeoSection heading={t("What we ask of you")}>
          <SeoList items={representative.requirements.map((line) => t(line))} />
        </SeoSection>
      ) : null}

      {representative.earnings.length > 0 ? (
        <SeoSection heading={t("What you earn")}>
          <SeoFacts
            items={representative.earnings.map(
              ([what, howMuch, when]) => [t(what), `${t(howMuch)}. ${t(when)}`] as const,
            )}
          />
        </SeoSection>
      ) : null}

      {faqSection(t, t("Common questions"), representative.faq)}
    </SeoDocument>
  );
}

export async function PartnerUniversitiesSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("For universities")}
        lead={t("Reach qualified applicants from Africa, Central Asia and the Middle East through one accountable channel.")}
      />
      {pointsSection(t, t("What we bring"), partnerBenefits)}
    </SeoDocument>
  );
}

/* -------------------------------------------------------------- company */

export async function AboutSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Your gateway to Türkiye")}
        lead={t("Campus Turkey has worked with Turkish universities, hospitals and chambers of commerce since 2014. We help students, patients, businesses, workers and partners reach opportunities here.")}
      />

      <SeoSection heading={t("Campus Turkey in numbers")}>
        <SeoFacts items={stats.map((stat) => [t(stat.label), t(stat.value)] as const)} />
      </SeoSection>

      <SeoSection heading={t("How we got here")}>
        {milestones.map((milestone) => (
          <SeoText key={milestone.title}>
            <strong>
              {milestone.meta}. {t(milestone.title)}
            </strong>
            . {t(milestone.description)}
          </SeoText>
        ))}
      </SeoSection>

      <SeoSection heading={t("Our offices")}>
        <SeoFacts items={offices.map((office) => [`${office.city}. ${t(office.role)}`, office.address] as const)} />
      </SeoSection>

      {accreditations.length > 0 ? (
        <SeoSection heading={t("Accreditations")}>
          <SeoList items={accreditations.map((line) => t(line))} />
        </SeoSection>
      ) : null}
    </SeoDocument>
  );
}

export async function ContactSeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Talk to a person")}
        lead={t("Tell us what you need and we reply within one working day. No call centre and no automated reply.")}
      />

      <SeoSection heading={t("How to reach us")}>
        <SeoFacts
          items={[
            [t("Head office"), contact.address],
            [t("Phone"), contact.phone],
            [t("Email"), contact.email],
            [t("WhatsApp"), contact.whatsapp],
          ]}
        />
      </SeoSection>

      <SeoSection heading={t("Our offices")}>
        <SeoFacts items={offices.map((office) => [`${office.city}. ${t(office.role)}`, `${office.address}. ${office.phone}`] as const)} />
      </SeoSection>
    </SeoDocument>
  );
}

/* -------------------------------------------------------------- privacy */

/**
 * The privacy notice, from the same source the design system screen reads.
 *
 * This one matters more than the marketing pages. A notice that only exists after a
 * bundle has loaded is a notice someone can be told they were shown while their browser
 * showed them a spinner.
 */
export async function PrivacySeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle title={t(privacyNotice.title)} lead={t(privacyNotice.lead)} />

      <SeoText>
        {t("Last updated")}: {privacyNotice.lastUpdated}
      </SeoText>

      {privacyNotice.sections.map((section) => (
        <SeoSection key={section.heading} heading={t(section.heading)}>
          {section.paragraphs ? (
            <SeoParagraphs paragraphs={section.paragraphs.map((paragraph) => t(paragraph))} />
          ) : null}
          {section.list ? <SeoList items={section.list.map((item) => t(item))} /> : null}
        </SeoSection>
      ))}

      <SeoLinks
        heading={t("Questions about this page")}
        links={[{ href: localePath("/contact", locale), label: t("Contact Campus Turkey") }]}
      />
    </SeoDocument>
  );
}

export async function ApplySeo({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale);

  return (
    <SeoDocument>
      <SeoTitle
        title={t("Apply Now")}
        lead={t("One short form starts your application. You pay nothing before admission, and we confirm every cost in writing first.")}
      />

      <SeoSection heading={t("How an application runs")}>
        {journey.map((step) => (
          <SeoText key={step.title}>
            <strong>{t(step.title)}</strong>. {t(step.description)}
          </SeoText>
        ))}
      </SeoSection>

      {faqSection(t, t("Common questions"), generalFaq)}
    </SeoDocument>
  );
}
