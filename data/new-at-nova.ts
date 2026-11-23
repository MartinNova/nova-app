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
  /** One line in our own words (from the club's description on novasu.pt). */
  about: string;
  /** Club logo in public/images/clubs (160 px, from novasu.pt). */
  logo: string;
  instagram: string;
}

const ig = (handle: string) => `https://www.instagram.com/${handle}/`;

/** The logo file is named after the club's Instagram handle. */
const club = (
  name: string,
  category: ClubCategory,
  handle: string,
  ext: "png" | "jpg",
  about: string,
): Club => ({
  name,
  category,
  about,
  logo: `/images/clubs/${handle}.${ext}`,
  instagram: ig(handle),
});

/** All student clubs listed by the Nova SBE Student Union (novasu.pt/clubs). */
export const CLUBS: Club[] = [
  club(
    "Nova Quant Club",
    "Finance & investing",
    "novaquantclub",
    "png",
    "Quant research and a paper-traded portfolio",
  ),
  club(
    "Nova Investment Club",
    "Finance & investing",
    "novainvestmentclub_ud",
    "jpg",
    "Financial markets through workshops and events",
  ),
  club(
    "Portfolio Management Club",
    "Finance & investing",
    "pmcnovasbe",
    "png",
    "Asset management, macro and investment research",
  ),
  club(
    "Nova VCPE Club",
    "Finance & investing",
    "novavcpeclub",
    "jpg",
    "Venture capital and private equity, with real fund projects",
  ),
  club(
    "Nova M&A Club",
    "Finance & investing",
    "novamaclub",
    "png",
    "Mergers & acquisitions: deals, skills and network",
  ),
  club(
    "Social Investment Fund",
    "Finance & investing",
    "socialinvestmentfund",
    "png",
    "Investing with social impact",
  ),
  club(
    "Nova Real Estate Club",
    "Finance & investing",
    "nova_real_estate_club",
    "png",
    "The real estate market and its trends",
  ),
  club(
    "Nova Junior Consulting",
    "Consulting & business",
    "novajuniorconsulting",
    "jpg",
    "Nova's junior enterprise: consulting for real clients",
  ),
  club(
    "NOMA Marketing Consulting",
    "Consulting & business",
    "noma.marketing.consulting",
    "png",
    "Student-run marketing consulting",
  ),
  club(
    "Nova Social Consulting",
    "Consulting & business",
    "novasocialconsulting",
    "png",
    "Pro-bono consulting for NGOs and social projects",
  ),
  club(
    "Nova Case Team",
    "Consulting & business",
    "novacaseteam",
    "png",
    "Solve business cases, train for competitions",
  ),
  club(
    "Nova Sales Club",
    "Consulting & business",
    "novasalesclub",
    "jpg",
    "Sales skills with real-world practice",
  ),
  club(
    "Nova Growth Club",
    "Consulting & business",
    "novagrowthclub",
    "jpg",
    "Personal growth workshops and a 4-week programme",
  ),
  club(
    "Nova Strategy Games",
    "Consulting & business",
    "novastrategygames",
    "jpg",
    "Strategy games: train, compete and relax",
  ),
  club(
    "Nova Luxury Society",
    "Consulting & business",
    "novaluxurysociety",
    "png",
    "The luxury industry, with talks and networking",
  ),
  club(
    "Nova Hospitality Club",
    "Consulting & business",
    "nova_hospitalityclub",
    "jpg",
    "The hospitality industry: talks, events, consulting",
  ),
  club(
    "Nova SBE AI Club",
    "Tech & startups",
    "nova.ai.club",
    "png",
    "Use AI in practice: workshops, build nights, projects",
  ),
  club(
    "Tech Club Nova",
    "Tech & startups",
    "techclubatnova",
    "png",
    "Hackathons and workshops on AI, fintech and data",
  ),
  club(
    "Nova Startup Club",
    "Tech & startups",
    "novastartupclub",
    "png",
    "Build your own startup idea and meet founders",
  ),
  club(
    "Innovation Ecosystem Club",
    "Tech & startups",
    "innovationecosystemclub",
    "png",
    "Creativity and innovation for real challenges",
  ),
  club(
    "Oikos Lisbon",
    "Impact & society",
    "oikoslisbon",
    "png",
    "Sustainability and social change on campus",
  ),
  club(
    "Leadership for Impact",
    "Impact & society",
    "lfistudentclub",
    "png",
    "Use your skills for the social sector",
  ),
  club(
    "Nova Awareness Club",
    "Impact & society",
    "novaawarenessclub",
    "png",
    "Nova's online student newspaper",
  ),
  club(
    "Nova Thirst Project",
    "Impact & society",
    "novathirstprojectpt",
    "png",
    "Raise money for clean water wells",
  ),
  club(
    "Women in Business",
    "Impact & society",
    "novawomeninbusiness",
    "jpg",
    "Gender equality in business, with mentoring",
  ),
  club(
    "Nova Politics Club",
    "Impact & society",
    "novapoliticsclub",
    "png",
    "Politics and international affairs, debated",
  ),
  club(
    "Nova Economics Club",
    "Impact & society",
    "novaeconomicsclub",
    "png",
    "Economic research and discussions",
  ),
  club(
    "Nova History Club",
    "Impact & society",
    "novahistoryclub",
    "png",
    "The events and people that shaped today",
  ),
  club(
    "Nova Debate SBE",
    "Impact & society",
    "nova.debate.sbe",
    "jpg",
    "Debating and public speaking",
  ),
  club(
    "Nova Surf Club",
    "Sport & well-being",
    "novasurfclub",
    "jpg",
    "Surf trips and sessions for every level",
  ),
  club(
    "Nova Golf Club",
    "Sport & well-being",
    "nova_golf_club",
    "png",
    "Golf for beginners and a competitive team",
  ),
  club(
    "Nova Mindspace",
    "Sport & well-being",
    "nova_mindspace",
    "png",
    "Physical and mental well-being, incl. yoga",
  ),
  club(
    "Nova Sports Management",
    "Sport & well-being",
    "novasportsmanagement",
    "jpg",
    "Careers in the sports industry",
  ),
  club(
    "Nova Music Club",
    "Culture & community",
    "novamusicclub",
    "png",
    "Concerts, jams and music events",
  ),
  club(
    'Tuna "Fortuna"',
    "Culture & community",
    "fortunanovasbe",
    "png",
    "Nova's traditional academic music group",
  ),
  club(
    "Nova Brasil Club",
    "Culture & community",
    "novabrasilclub",
    "jpg",
    "Brazilian culture and community",
  ),
  club(
    "Nova Africa Student Group",
    "Culture & community",
    "novafricastudentgroup",
    "jpg",
    "Africa's social and economic challenges, with NOVAFRICA",
  ),
  club(
    "CEMS Club Lisbon",
    "Culture & community",
    "cemsclublisbon",
    "jpg",
    "Social and career events of the CEMS network",
  ),
  club(
    "Nova Skills Association",
    "Culture & community",
    "novaskillsassociation",
    "png",
    "Power-skills workshops for your career",
  ),
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
