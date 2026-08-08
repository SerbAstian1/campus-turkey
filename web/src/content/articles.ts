/**
 * The resources library. Six long-form pieces, rendered by `screens/Resources.tsx` as
 * cards and by `screens/Article.tsx` in full.
 *
 * Sections are typed as paragraph arrays rather than an HTML blob: it keeps the copy
 * out of `dangerouslySetInnerHTML` and survives the move to a CMS without a parser.
 */

import type { Article } from "./types";

export const articles: Article[] = [
  {
    slug: "public-university-costs-2026",
    tag: "Guide",
    title: "What a public university really costs in 2026",
    body: "Tuition, dormitory, food, transport and insurance, added up for six cities.",
    read: "8 min",
    date: "12 January 2026",
    author: "Campus Turkey admissions team",
    sections: [
      { heading: "The short answer", paragraphs: ["A public university in Türkiye costs most international students between $4,800 and $7,200 for a full year, tuition and living together. The range depends far more on the city than on the university."] },
      { heading: "Tuition", paragraphs: ["Public tuition for international students runs from $600 to $2,000 per year for most bachelor programs. Medicine and dentistry are higher, usually $3,000 to $6,000. The figure is set per program and published each year, so we always confirm it in writing before you apply."] },
      { heading: "Housing", paragraphs: ["A state dormitory bed costs $60 to $150 per month including bills. A room in a shared private flat costs $200 to $350 in Istanbul, and $120 to $220 in Adana, Trabzon or Erzurum."] },
      { heading: "Food and transport", paragraphs: ["Campus canteens serve a full meal for about $1.50. Budget $130 per month for groceries and $8 for a student transport card."] },
      { heading: "Insurance and fees", paragraphs: ["Health insurance is mandatory, about $60 per year. Residence permit fees run about $110 for the first year."] },
      { heading: "Putting it together", paragraphs: ["Six cities, one year, dormitory housing: Istanbul $7,200. Ankara $6,400. Izmir $6,100. Antalya $5,700. Adana $5,000. Erzurum $4,800. Ask us for the same table for the exact program you want."] },
    ],
  },
  {
    slug: "student-visa-documents",
    tag: "Checklist",
    title: "Every document you need for a student visa",
    body: "The full list, what needs translating and what needs an apostille.",
    read: "5 min",
    date: "3 February 2026",
    author: "Campus Turkey visa desk",
    sections: [
      { heading: "Before you start", paragraphs: ["You cannot apply for a student visa without an acceptance letter. Everything below is prepared after the university confirms your place."] },
      { heading: "The core file", paragraphs: ["Acceptance letter, passport valid for at least one year, completed visa form, four biometric photos, proof of tuition payment or scholarship, bank statement covering one year, accommodation confirmation and health insurance."] },
      { heading: "Translation and apostille", paragraphs: ["Your diploma and transcript need a sworn translation into Turkish or English. Some consulates also ask for an apostille from your ministry of education. We tell you which applies to your country before you spend money on it."] },
      { heading: "At the appointment", paragraphs: ["Bring the original of everything plus one copy. Answer the officer plainly: which university, which program, who pays, when you arrive."] },
      { heading: "After you land", paragraphs: ["You have 30 days to apply for your residence permit. We book that appointment for you in your first week."] },
    ],
  },
  {
    slug: "turkiye-burslari-who-gets-it",
    tag: "Guide",
    title: "Türkiye Bursları: who actually gets it",
    body: "Eligibility, the timeline and what the selection panel looks for.",
    read: "11 min",
    date: "20 January 2026",
    author: "Campus Turkey scholarships desk",
    sections: [
      { heading: "What it covers", paragraphs: ["Full tuition, a monthly stipend, accommodation, health insurance and one return flight. It is the most generous scholarship available to international students in Türkiye."] },
      { heading: "Who is eligible", paragraphs: ["Bachelor applicants need at least 70 percent in their school leaving results, 90 percent for medicine. Master and PhD applicants need 75 percent. Age limits apply: under 21 for bachelor, under 30 for master, under 35 for PhD."] },
      { heading: "The timeline", paragraphs: ["Applications open in January and close in February. Shortlisting runs to April, interviews to June, results in July. Registration follows in September."] },
      { heading: "What the panel looks for", paragraphs: ["Academic record first. Then a clear reason for choosing your program, evidence you will return and contribute, and consistency between your documents and your interview."] },
      { heading: "Realistic odds", paragraphs: ["Around 5 percent of applicants receive an award. Apply for it, and apply in parallel for a public university place and a private scholarship so a rejection does not cost you the year."] },
    ],
  },
  {
    slug: "english-or-turkish-taught",
    tag: "Explainer",
    title: "English taught or Turkish taught",
    body: "How to choose, and what a preparatory language year involves.",
    read: "6 min",
    date: "8 February 2026",
    author: "Campus Turkey admissions team",
    sections: [
      { heading: "The choice in one line", paragraphs: ["If you want to start your degree immediately, choose an English taught program. If you want the lowest possible tuition and you can spend a year on language first, Turkish taught is cheaper and opens more programs."] },
      { heading: "English taught", paragraphs: ["Hundreds of programs are fully in English, mostly at private universities and at the larger public ones. You need IELTS 6.0 or TOEFL 78, or you sit the university's own exam."] },
      { heading: "Turkish taught", paragraphs: ["Tuition is often half the English taught figure and the program list is far longer. You will need a C1 certificate from a TÖMER language centre."] },
      { heading: "The preparatory year", paragraphs: ["One academic year of intensive Turkish, 20 to 25 hours per week, costing $800 to $1,500. You keep your student residence permit throughout and start your degree the following autumn."] },
      { heading: "Our advice", paragraphs: ["Decide by your budget and your timeline, not by which sounds easier. We model both options with real numbers before you apply."] },
    ],
  },
  {
    slug: "first-week-in-istanbul",
    tag: "Guide",
    title: "Your first week in Istanbul",
    body: "Residence permit, bank account, phone line and transport card, in order.",
    read: "7 min",
    date: "26 January 2026",
    author: "Campus Turkey student services",
    sections: [
      { heading: "Day one", paragraphs: ["Airport pickup, then your accommodation. Sleep. Nothing official happens on day one."] },
      { heading: "Day two and three", paragraphs: ["University registration with your original documents. You leave with a student certificate, which every other office will ask for."] },
      { heading: "Day four", paragraphs: ["Tax number, then a bank account. Both need your passport and the student certificate. A Turkish account makes tuition instalments and rent far simpler."] },
      { heading: "Day five", paragraphs: ["Phone line and a student transport card. Bring your passport, tax number and student certificate."] },
      { heading: "Day six and seven", paragraphs: ["Residence permit appointment, health insurance and your first campus tour. We attend the permit appointment with you."] },
      { heading: "What to carry", paragraphs: ["Passport, four photos, student certificate, tax number, accommodation contract. Keep a photo of each on your phone."] },
    ],
  },
  {
    slug: "how-treatment-packages-are-priced",
    tag: "Explainer",
    title: "How medical treatment packages are priced",
    body: "What a quote includes, what it does not, and what to ask before you pay.",
    read: "4 min",
    date: "15 February 2026",
    author: "Campus Turkey medical desk",
    sections: [
      { heading: "What a real quote contains", paragraphs: ["Procedure, surgeon, hospital, number of nights, transfers, translator and the total in one currency. If any of those is missing, it is an estimate, not a quote."] },
      { heading: "What is usually excluded", paragraphs: ["International flights, extra nights, treatment of unrelated conditions and companion visa fees. Ask for these in writing rather than assuming."] },
      { heading: "Why prices differ", paragraphs: ["Surgeon experience, hospital accreditation, implant or graft brand, and how much aftercare is included. A cheaper number often means fewer nights or a junior surgeon."] },
      { heading: "Questions to ask", paragraphs: ["Who performs the procedure? Is the hospital JCI accredited? What happens if I need a second session? Who pays if there is a complication?"] },
      { heading: "Our position", paragraphs: ["We do not take a commission from your treatment price, and we send you the hospital's own written quote."] },
    ],
  },
];

export const getArticle = (slug: string): Article | undefined =>
  articles.find((a) => a.slug === slug);
