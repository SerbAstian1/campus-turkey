/**
 * The four non-education services. Education is not here: it is the Study hub, which
 * has its own screen and its own shape.
 *
 * Each record carries everything `screens/Service.tsx` renders — hero, points, process,
 * what is and is not included, indicative prices, trust lines and FAQ. Prices are
 * ranges and every screen says so; they are not quotes.
 */

import type { Service } from "./types";

export const services: Service[] = [
  {
    slug: "medical",
    icon: "heart-pulse",
    title: "Medical Tourism",
    eyebrow: "Health services",
    lead: "Treatment in accredited Turkish hospitals, arranged end to end. You get a written quote before you travel.",
    points: [
      { icon: "clipboard-list", title: "Free first consultation", body: "Send your reports. A doctor reviews them and we come back with options and a price." },
      { icon: "building", title: "Hospital and doctor matching", body: "We work with JCI accredited hospitals in Istanbul, Ankara and Izmir." },
      { icon: "plane", title: "Invitation, visa and travel", body: "Invitation letter, visa support, airport transfer, hotel and a translator with you at every appointment." },
    ],
    tags: ["Hair transplant", "Dental treatment", "Eye surgery", "Cardiology", "Orthopaedics", "IVF and fertility", "Oncology", "Cosmetic surgery"],
    stats: [
      { value: "18", label: "Partner hospitals", description: "JCI accredited, in three cities." },
      { value: "40+", label: "Procedures covered", description: "From dental to cardiology." },
      { value: "6", label: "Languages on site", description: "A translator at every appointment." },
      { value: "72h", label: "Quote turnaround", description: "From the day we get your reports." },
    ],
    steps: [
      { meta: "Step 1", title: "Send your reports", description: "Photos or PDFs on WhatsApp. Nothing is charged at this stage.", icon: "file-text" },
      { meta: "Step 2", title: "Doctor review", description: "A specialist reads your file and confirms whether the treatment is suitable.", icon: "stethoscope" },
      { meta: "Step 3", title: "Written quote", description: "Procedure, hospital, surgeon, nights, transfers and total price in one document.", icon: "receipt" },
      { meta: "Step 4", title: "Travel and treatment", description: "Invitation letter, visa support, transfers, hotel and a translator with you throughout.", icon: "plane" },
      { meta: "Step 5", title: "Aftercare", description: "Follow-up appointments before you fly, and a remote check-in for three months.", icon: "heart-pulse" },
    ],
    includes: [
      { title: "Included", items: ["Hospital and surgeon fees as quoted", "Airport transfers and hospital transport", "Hotel nights named in the quote", "Translator at every appointment", "Follow-up for three months"] },
      { title: "Not included", items: ["International flights", "Extra nights beyond the plan", "Treatment of unrelated conditions", "Companion visa fees"] },
    ],
    pricing: [
      { item: "Hair transplant", price: "$1,500 to $3,000", note: "3 to 4 nights" },
      { item: "Dental implant, per tooth", price: "$400 to $700", note: "2 visits, 5 nights" },
      { item: "LASIK, both eyes", price: "$1,200 to $1,900", note: "3 nights" },
      { item: "Knee replacement", price: "$8,000 to $12,000", note: "7 to 10 nights" },
      { item: "IVF cycle", price: "$3,000 to $4,500", note: "14 to 18 nights" },
    ],
    trust: ["JCI accredited hospitals only", "No commission taken from your treatment price", "Written quote before any payment", "Named coordinator for your whole stay"],
    faq: [
      { question: "How much does treatment cost?", answer: "It depends on the procedure. A hair transplant package runs $1,500 to $3,000, dental implants $400 to $700 each. You always get a written quote before you book." },
      { question: "Will someone translate for me?", answer: "Yes. A translator is with you at every appointment in English, Arabic or French." },
      { question: "How long should I stay?", answer: "Most procedures need 3 to 7 days in Türkiye. We tell you the exact number before you book flights." },
      { question: "Who pays for the consultation?", answer: "Nobody. The first review of your reports is free and carries no obligation." },
      { question: "Can a family member travel with me?", answer: "Yes. We arrange the companion invitation letter, hotel and transfers on the same file." },
    ],
    cta: "Book a Consultation",
  },
  {
    slug: "business",
    icon: "briefcase",
    title: "Business Facilitation",
    eyebrow: "Business services",
    lead: "Meet the right Turkish suppliers, visit their factories and travel with the paperwork already handled.",
    points: [
      { icon: "mail", title: "Invitation letters", body: "Official invitation letters for you and your delegation, prepared for your visa appointment." },
      { icon: "handshake", title: "B2B meetings", body: "We shortlist suppliers in your sector, verify them and book the meetings." },
      { icon: "factory", title: "Company and factory visits", body: "Transport, translation and a full itinerary for every visit." },
    ],
    tags: ["Textiles", "Furniture", "Construction materials", "Food and agriculture", "Machinery", "Cosmetics", "Automotive parts", "Trade fairs"],
    stats: [
      { value: "900+", label: "Verified suppliers", description: "Checked for registration and export history." },
      { value: "12", label: "Sectors covered", description: "Textiles to machinery." },
      { value: "2 days", label: "Invitation letters", description: "Once your schedule is confirmed." },
      { value: "60+", label: "Delegations hosted", description: "Chambers, associations and companies." },
    ],
    steps: [
      { meta: "Step 1", title: "Tell us your sourcing brief", description: "Product, volume, target price and certification needs.", icon: "clipboard-list" },
      { meta: "Step 2", title: "Supplier shortlist", description: "We verify registration, capacity and export history before proposing anyone.", icon: "search-check" },
      { meta: "Step 3", title: "Schedule and invitation", description: "Meetings booked, factory visits confirmed, invitation letter issued for your visa.", icon: "calendar-check" },
      { meta: "Step 4", title: "On the ground", description: "Transport, translation and a coordinator with you at every meeting.", icon: "handshake" },
      { meta: "Step 5", title: "Follow through", description: "Meeting notes, quotations collected and introductions kept warm after you fly home.", icon: "file-check" },
    ],
    includes: [
      { title: "Included", items: ["Supplier research and verification", "Meeting scheduling and confirmations", "Invitation letter for your visa", "Interpreter and coordinator", "Written meeting report"] },
      { title: "Not included", items: ["Flights and hotels unless requested", "Customs duties or freight", "Product testing fees", "Legal or contract drafting"] },
    ],
    pricing: [
      { item: "Sourcing report, one sector", price: "$450", note: "5 working days" },
      { item: "Three-day meeting programme", price: "$1,200", note: "Per delegation of up to 4" },
      { item: "Trade fair support", price: "$800", note: "Per fair, per day" },
      { item: "Delegation of 10 to 20", price: "From $3,500", note: "Full itinerary" },
      { item: "Ongoing representation", price: "Monthly retainer", note: "Quoted per scope" },
    ],
    trust: ["Suppliers verified before they reach your list", "We never take a cut from the supplier", "Interpreter present at every meeting", "Written report after the visit"],
    faq: [
      { question: "Can you get me a business visa invitation?", answer: "Yes. We prepare the invitation letter once your meeting schedule is confirmed, usually within two working days." },
      { question: "Do you verify suppliers?", answer: "Yes. We check registration, export history and capacity before we put a supplier on your list." },
      { question: "Do you attend the meetings?", answer: "Yes. A translator and a coordinator attend with you." },
      { question: "Can you help after the trip?", answer: "We collect quotations, send you meeting notes and keep the introductions warm while you decide." },
      { question: "Do you work with chambers of commerce?", answer: "Regularly. Chamber delegations are one of our largest groups." },
    ],
    cta: "Book a Consultation",
  },
  {
    slug: "employment",
    icon: "hard-hat",
    title: "Employment Services",
    eyebrow: "Work in Türkiye",
    lead: "Legal and seasonal work placements with employers who sponsor the permit. No agency fees paid by the worker.",
    points: [
      { icon: "file-badge", title: "Work permit support", body: "Your employer applies, we prepare and track the file with the Ministry of Labour." },
      { icon: "search", title: "Matching", body: "Hospitality, agriculture, logistics, manufacturing and skilled trades." },
      { icon: "shield-check", title: "Contract review", body: "We read the contract with you before you sign, in your language." },
    ],
    tags: ["Hospitality", "Agriculture", "Logistics", "Manufacturing", "Construction", "Healthcare support", "Retail", "Skilled trades"],
    stats: [
      { value: "0", label: "Fee to workers", description: "Employers pay us, never you." },
      { value: "30-45", label: "Days for a permit", description: "From the day the employer files." },
      { value: "8", label: "Sectors hiring", description: "Hospitality to skilled trades." },
      { value: "100%", label: "Contracts reviewed", description: "In your language, before you sign." },
    ],
    steps: [
      { meta: "Step 1", title: "Send your CV", description: "Experience, languages and the work you are looking for.", icon: "file-text" },
      { meta: "Step 2", title: "Matching", description: "We only present roles where the employer sponsors the work permit.", icon: "search" },
      { meta: "Step 3", title: "Interview", description: "Usually one video call, sometimes two. We prepare you for both.", icon: "video" },
      { meta: "Step 4", title: "Contract and permit", description: "We read the contract with you, then track the Ministry of Labour file.", icon: "file-badge" },
      { meta: "Step 5", title: "Arrival", description: "Airport pickup, accommodation, residence permit and your first pay cycle explained.", icon: "home" },
    ],
    includes: [
      { title: "Included", items: ["Job matching with permit-sponsoring employers", "Contract review in your language", "Work permit file tracking", "Arrival and residence support", "Help opening a bank account"] },
      { title: "Not included", items: ["Any placement fee from you", "Flights unless the employer pays", "Family residence applications before your permit is issued"] },
    ],
    pricing: [
      { item: "Worker placement", price: "Free to the worker", note: "Employer pays" },
      { item: "Contract review", price: "Free with a placement", note: "48 hours" },
      { item: "Work permit tracking", price: "Included", note: "30 to 45 days" },
      { item: "Family residence application", price: "$150 per person", note: "After your permit" },
      { item: "Employer recruitment package", price: "Quoted per role", note: "Employer side" },
    ],
    trust: ["No worker ever pays a placement fee", "Only permit-sponsoring employers", "Contract explained before you sign", "We stay reachable after you arrive"],
    faq: [
      { question: "Do I pay a fee to get a job?", answer: "No. Employers pay us. You never pay a placement fee." },
      { question: "How long does a work permit take?", answer: "Usually 30 to 45 days from the day your employer files the application." },
      { question: "Can my family come with me?", answer: "Once your permit is issued you can apply for family residence. We handle that application too." },
      { question: "Is seasonal work available?", answer: "Yes, mostly in hospitality and agriculture, with contracts from three to nine months." },
      { question: "What if the job is not as described?", answer: "Tell us. We hold the employer to the contract we reviewed with you, and we will move you if it cannot be fixed." },
    ],
    cta: "Contact us",
  },
  {
    slug: "tours",
    icon: "bus-front",
    title: "Educational & Business Tours",
    eyebrow: "Group travel",
    lead: "Campus visits, study tours and trade missions for schools, agencies, chambers and companies.",
    points: [
      { icon: "map", title: "Full itinerary", body: "Universities, companies, transfers, hotels and meals planned as one schedule." },
      { icon: "users", title: "Groups from 6 to 60", body: "One coordinator travels with the group for the whole visit." },
      { icon: "camera", title: "Reporting pack", body: "Photos, attendance lists and a written report for your institution." },
    ],
    tags: ["University open days", "Study tours", "Trade missions", "Chamber delegations", "Teacher training visits", "Cultural tours", "Summer schools", "Graduation trips"],
    stats: [
      { value: "6-60", label: "Group size", description: "One coordinator travels with you." },
      { value: "40", label: "Cities available", description: "Campus, company and cultural stops." },
      { value: "4 weeks", label: "Minimum lead time", description: "Six weeks if visas are needed." },
      { value: "120+", label: "Tours delivered", description: "Schools, agencies and chambers." },
    ],
    steps: [
      { meta: "Step 1", title: "Set the purpose", description: "Recruitment, study, trade or culture. The itinerary follows from it.", icon: "target" },
      { meta: "Step 2", title: "Draft itinerary", description: "Universities, companies, transfers, hotels and meals in one schedule with costs.", icon: "map" },
      { meta: "Step 3", title: "Confirm and invite", description: "Bookings locked, invitation letters issued for the group visa file.", icon: "mail" },
      { meta: "Step 4", title: "On tour", description: "A coordinator travels with the group from arrival to departure.", icon: "bus-front" },
      { meta: "Step 5", title: "Reporting pack", description: "Photos, attendance lists and a written report for your institution.", icon: "camera" },
    ],
    includes: [
      { title: "Included", items: ["Full itinerary and bookings", "Coach transport and transfers", "Coordinator for the whole visit", "Invitation letters for the group", "Photo and report pack"] },
      { title: "Not included", items: ["International flights", "Visa fees", "Personal spending", "Optional excursions"] },
    ],
    pricing: [
      { item: "Three-day campus tour", price: "From $380 per person", note: "Group of 15" },
      { item: "Five-day study tour", price: "From $640 per person", note: "Group of 20" },
      { item: "Trade mission, three days", price: "From $520 per person", note: "Group of 10" },
      { item: "Summer school, two weeks", price: "From $1,250 per person", note: "Group of 25" },
      { item: "Custom delegation", price: "Quoted per plan", note: "Any size" },
    ],
    trust: ["One coordinator with the group at all times", "Costed itinerary before you commit", "Universities confirmed in writing", "Report pack for your records"],
    faq: [
      { question: "What is the minimum group size?", answer: "Six people. Below that we plan an individual visit instead." },
      { question: "How far ahead should we book?", answer: "Six weeks is comfortable. Four weeks is possible if visas are not needed." },
      { question: "Do you handle group visas?", answer: "Yes. We prepare the invitation letters and the group file." },
      { question: "Can students meet current undergraduates?", answer: "Yes. We arrange student hosts on every campus visit." },
      { question: "Do you provide a report afterwards?", answer: "Yes. Photos, attendance and a written summary for your institution." },
    ],
    cta: "Book a Consultation",
  },
];

export const getService = (slug: string): Service | undefined =>
  services.find((s) => s.slug === slug);
