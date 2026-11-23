import { NETPA_DOCUMENTS_URL } from "./netpa";

/**
 * "New at Nova": everything a new student needs in one place.
 * Sources (checked 23 Nov 2026): novasbe.unl.pt → Contacts & Directions, Life at Nova SBE (FAQ,
 * Getting started, Student Advising) and novasu.pt/clubs. Check them again each semester.
 */

export interface EssentialLink {
  title: string;
  description: string;
  href: string;
}

export const ESSENTIAL_LINKS: EssentialLink[] = [
  {
    title: "netPA",
    description: "Enrolment, grades, payments and documents",
    href: "https://netpa.novasbe.pt/netpa/page?stage=difhomestage",
  },
  {
    title: "Moodle",
    description: "Course pages, slides and assignments",
    href: "https://moodle.novasbe.pt/",
  },
  {
    title: "Nova SBE Today",
    description: "SharePoint for students: news, events and guides",
    href: "https://novasbe365.sharepoint.com/sites/NovaSBETodayStudents/",
  },
  {
    title: "Outlook",
    description: "Your Nova e-mail",
    href: "https://outlook.com/novasbe.pt",
  },
  {
    title: "Library",
    description: "Books, databases and study rooms",
    href: "https://library.novasbe.unl.pt/",
  },
  {
    title: "Enrollment certificate",
    description: "Download it in netPA under Documents & Requests",
    href: NETPA_DOCUMENTS_URL,
  },
];

export interface Contact {
  name: string;
  /** What to contact them about. */
  about: string;
  email?: string;
  /** International format, as on the Nova website. */
  phone?: string;
}

export const CONTACTS: Contact[] = [
  {
    name: "Academic Services",
    about: "Enrolment, documents, exams, anything about your programme",
    email: "masters@novasbe.pt",
    phone: "+351 213 801 670",
  },
  {
    name: "IT Service Desk",
    about: "E-mail account, netPA, Wi-Fi and logins",
    email: "servicedesk@novasbe.pt",
    phone: "+351 213 801 623",
  },
  {
    name: "Bursary",
    about: "Tuition fees and payments",
    email: "bursary@novasbe.pt",
    phone: "+351 213 801 688",
  },
  {
    name: "International Mobility",
    about: "Exchange semesters and international students",
    email: "international.mobility@novasbe.pt",
    phone: "+351 213 801 670",
  },
  {
    name: "Career Services",
    about: "Internships, jobs and CV help",
    email: "careers@novasbe.pt",
    phone: "+351 213 822 792",
  },
  {
    name: "Well-being",
    about: "Mental health and personal support",
    email: "wellbeing@novasbe.pt",
  },
  {
    name: "Library",
    about: "Books, databases and study spaces",
    email: "library@novasbe.pt",
    phone: "+351 213 801 602",
  },
  {
    name: "Something broken on campus",
    about: "Report it to Facilities",
    email: "fixit@novasbe.pt",
  },
  {
    name: "Nova SBE reception",
    about: "Anything else",
    phone: "+351 213 801 600",
  },
];

/** Europe-wide emergency number (police, fire, ambulance). */
export const EMERGENCY_NUMBER = "112";

export type ClubCategory =
  | "Finance & investing"
  | "Consulting & business"
  | "Tech & startups"
  | "Impact & society"
  | "Sport & well-being"
  | "Culture & community";

export interface Club {
  name: string;
  category: ClubCategory;
  instagram: string;
}

const ig = (handle: string) => `https://www.instagram.com/${handle}/`;

/** All student clubs listed by the Nova SBE Student Union (novasu.pt/clubs). */
export const CLUBS: Club[] = [
  { name: "Nova Quant Club", category: "Finance & investing", instagram: ig("novaquantclub") },
  {
    name: "Nova Investment Club",
    category: "Finance & investing",
    instagram: ig("novainvestmentclub_ud"),
  },
  {
    name: "Portfolio Management Club",
    category: "Finance & investing",
    instagram: ig("pmcnovasbe"),
  },
  { name: "Nova VCPE Club", category: "Finance & investing", instagram: ig("novavcpeclub") },
  { name: "Nova M&A Club", category: "Finance & investing", instagram: ig("novamaclub") },
  {
    name: "Social Investment Fund",
    category: "Finance & investing",
    instagram: ig("socialinvestmentfund"),
  },
  {
    name: "Nova Real Estate Club",
    category: "Finance & investing",
    instagram: ig("nova_real_estate_club"),
  },
  {
    name: "Nova Junior Consulting",
    category: "Consulting & business",
    instagram: ig("novajuniorconsulting"),
  },
  {
    name: "NOMA Marketing Consulting",
    category: "Consulting & business",
    instagram: ig("noma.marketing.consulting"),
  },
  {
    name: "Nova Social Consulting",
    category: "Consulting & business",
    instagram: ig("novasocialconsulting"),
  },
  { name: "Nova Case Team", category: "Consulting & business", instagram: ig("novacaseteam") },
  { name: "Nova Sales Club", category: "Consulting & business", instagram: ig("novasalesclub") },
  { name: "Nova Growth Club", category: "Consulting & business", instagram: ig("novagrowthclub") },
  {
    name: "Nova Strategy Games",
    category: "Consulting & business",
    instagram: ig("novastrategygames"),
  },
  {
    name: "Nova Luxury Society",
    category: "Consulting & business",
    instagram: ig("novaluxurysociety"),
  },
  {
    name: "Nova Hospitality Club",
    category: "Consulting & business",
    instagram: ig("nova_hospitalityclub"),
  },
  { name: "Nova SBE AI Club", category: "Tech & startups", instagram: ig("nova.ai.club") },
  { name: "Tech Club Nova", category: "Tech & startups", instagram: ig("techclubatnova") },
  { name: "Nova Startup Club", category: "Tech & startups", instagram: ig("novastartupclub") },
  {
    name: "Innovation Ecosystem Club",
    category: "Tech & startups",
    instagram: ig("innovationecosystemclub"),
  },
  { name: "Oikos Lisbon", category: "Impact & society", instagram: ig("oikoslisbon") },
  {
    name: "Leadership for Impact",
    category: "Impact & society",
    instagram: ig("lfistudentclub"),
  },
  {
    name: "Nova Awareness Club",
    category: "Impact & society",
    instagram: ig("novaawarenessclub"),
  },
  {
    name: "Nova Thirst Project",
    category: "Impact & society",
    instagram: ig("novathirstprojectpt"),
  },
  {
    name: "Women in Business",
    category: "Impact & society",
    instagram: ig("novawomeninbusiness"),
  },
  { name: "Nova Politics Club", category: "Impact & society", instagram: ig("novapoliticsclub") },
  {
    name: "Nova Economics Club",
    category: "Impact & society",
    instagram: ig("novaeconomicsclub"),
  },
  { name: "Nova History Club", category: "Impact & society", instagram: ig("novahistoryclub") },
  { name: "Nova Debate SBE", category: "Impact & society", instagram: ig("nova.debate.sbe") },
  { name: "Nova Surf Club", category: "Sport & well-being", instagram: ig("novasurfclub") },
  { name: "Nova Golf Club", category: "Sport & well-being", instagram: ig("nova_golf_club") },
  { name: "Nova Mindspace", category: "Sport & well-being", instagram: ig("nova_mindspace") },
  {
    name: "Nova Sports Management",
    category: "Sport & well-being",
    instagram: ig("novasportsmanagement"),
  },
  { name: "Nova Music Club", category: "Culture & community", instagram: ig("novamusicclub") },
  { name: 'Tuna "Fortuna"', category: "Culture & community", instagram: ig("fortunanovasbe") },
  { name: "Nova Brasil Club", category: "Culture & community", instagram: ig("novabrasilclub") },
  {
    name: "Nova Africa Student Group",
    category: "Culture & community",
    instagram: ig("novafricastudentgroup"),
  },
  { name: "CEMS Club Lisbon", category: "Culture & community", instagram: ig("cemsclublisbon") },
  {
    name: "Nova Skills Association",
    category: "Culture & community",
    instagram: ig("novaskillsassociation"),
  },
];

export const STUDENT_UNION = {
  name: "Nova SBE Student Union",
  instagram: ig("nova_su"),
  clubsPage: "https://www.novasu.pt/clubs",
};

export interface Tip {
  title: string;
  text: string;
}

/** Things new students often only find out later. */
export const TIPS: Tip[] = [
  {
    title: "Hand in your bachelor's certificate",
    text: "Nova needs your undergraduate degree certificate. Not sure how or by when? Ask Academic Services.",
  },
  {
    title: "Get a NIF (Portuguese tax number)",
    text: "You need it for a bank account, a rental contract and a phone plan. Book it at the Finance Office (Finanças) through a representative with an account on their portal.",
  },
  {
    title: "Your student card comes from Santander",
    text: "Santander issues the Nova SBE student card and has a branch on campus, if you want a Portuguese bank account.",
  },
  {
    title: "Sort out health cover",
    text: "EU students: get the European Health Insurance Card (EHIC) at home. Everyone else needs health insurance for their whole stay.",
  },
  {
    title: "Meet your Student Advisor",
    text: "Go to the “How to Thrive” sessions at the start. Your advisor helps with your study plan and with personal or health issues.",
  },
];
