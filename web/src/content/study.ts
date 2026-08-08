/**
 * The Study in Türkiye hub: scholarships, cost of living and the questions students
 * actually ask before they commit.
 *
 * `generalFaq` is shared with the homepage. It is education-first because that is the
 * core service, and it answers money questions before it answers anything else.
 */

import type { FaqItem, Point, Scholarship } from "./types";

export const scholarships: Scholarship[] = [
  {
    name: "Türkiye Bursları",
    who: "Government scholarship for international students",
    covers: "Full tuition, monthly stipend, accommodation, health insurance and flights",
    when: "Applications open every January",
    competitive: "Highly competitive",
  },
  {
    name: "Private university merit awards",
    who: "Applicants with strong grades",
    covers: "25 to 75 percent of tuition, renewed each year on results",
    when: "Rolling, earlier rounds award more",
    competitive: "Realistic for most good students",
  },
  {
    name: "Country and regional quotas",
    who: "Applicants from specific countries",
    covers: "Reduced tuition at selected public universities",
    when: "Announced with each intake",
    competitive: "Depends on your country",
  },
  {
    name: "Sibling and alumni discounts",
    who: "Families already studying in Türkiye",
    covers: "5 to 15 percent off private tuition",
    when: "Any time",
    competitive: "Automatic when you qualify",
  },
];

/** Cost of living, in the categories a student budgets by. */
export const studentLife: Point[] = [
  { icon: "home", title: "Housing", body: "State dormitories run about $60 to $150 per month. A shared private flat in Istanbul runs $200 to $350 per person." },
  { icon: "utensils", title: "Food", body: "Campus canteens serve a full meal for about $1.50. A monthly grocery budget of $130 is normal." },
  { icon: "train-front", title: "Getting around", body: "A student transport card costs about $8 per month in most cities and covers metro, tram and bus." },
  { icon: "stethoscope", title: "Health", body: "Health insurance is mandatory and costs about $60 per year. University clinics are free to students." },
  { icon: "briefcase", title: "Working", body: "Bachelor students may work part time after their first year. Master and PhD students may work from the start." },
  { icon: "users", title: "Community", body: "Every campus has country societies. We introduce you to students from your country before you fly." },
];

export const generalFaq: FaqItem[] = [
  { question: "Do I have to pay any money before admission?", answer: "No, you only pay after your student visa is approved." },
  { question: "How much does a public university cost?", answer: "Public universities are heavily subsidised. Most programs run between $600 and $2,000 per year, and we confirm the exact figure before you apply." },
  { question: "Can I get a scholarship?", answer: "Private universities offer scholarships from 25 to 75 percent. We tell you what you qualify for before you spend anything." },
  { question: "Do you help with the student visa?", answer: "Yes. We prepare your documents, book the appointment and walk you through the interview." },
  { question: "Do I need to speak Turkish?", answer: "No. Many programs are taught fully in English. If you want a Turkish-taught program we arrange a language year first." },
  { question: "What happens when I land?", answer: "Airport pickup, accommodation, residence permit and your first week are arranged before you travel." },
  { question: "Do you work with agencies?", answer: "Yes. Agencies, consultants and country representatives can register in one short form and get a partner account." },
];
