/**
 * Seeds a complete, connected set of demo data for presentations / re-defense:
 * industries, employers, workers (active / verified / pending), jobs across categories
 * and statuses, applications at every stage, contacts + messages, worker assignments,
 * submitted work, incident reports, ratings and notifications.
 *
 * Every document gets a deterministic _id derived from a fixture key, so the script is:
 *   - idempotent: re-running only inserts what is missing, never modifies real data
 *   - reversible: --reset deletes exactly the documents this script created
 *
 * Usage (from backend/):
 *   npm run seed:demo                         preview only, writes nothing
 *   npm run seed:demo -- --apply              insert demo data
 *   npm run seed:demo -- --reset              remove demo data
 *
 * Required env for --apply / --reset:
 *   SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION
 * Required env for --apply:
 *   SEED_DEMO_PASSWORD=<password shared by every demo login, min 8 chars>
 */
import mongoose, { Model, Types } from "mongoose";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import Industry from "../model/Industry";
import Employer from "../model/Employer";
import Worker from "../model/Worker";
import VerifiedWorker from "../model/VerifiedWorker";
import Job from "../model/Job";
import Application from "../model/Application";
import ApplicationAccepted from "../model/ApplicationAccepted";
import Contact from "../model/Contact";
import Message from "../model/Message";
import WorkerAssignment from "../model/WorkerAssignment";
import JobsCompleted from "../model/JobsCompleted";
import Report from "../model/Report";
import Rating from "../model/Rating";
import UserNotification from "../model/UserNotification";
import AdminNotification from "../model/AdminNotification";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const EMAIL_DOMAIN = "localworks-demo.test";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const oid = (key: string) =>
  new Types.ObjectId(createHash("md5").update(`localworks-demo:${key}`).digest("hex").slice(0, 24));

const daysAgo = (n: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysFromNow = (n: number) => daysAgo(-n);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ts = (d: Date) => ({ createdAt: d, updatedAt: d });

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted MongoDB URI]");
};

/* -------------------------------------------------------------------------- */
/*                                  Fixtures                                  */
/* -------------------------------------------------------------------------- */

const INDUSTRIES = [
  "Construction", "Electrical", "Plumbing", "Farmer", "Janitor", "Food",
  "Furniture", "Sales Clerk", "Cook", "Waiter", "Retail Workers",
  "Technology", "Office Work",
];

const EMPLOYERS = [
  { key: "dagupan-builders", company: "Dagupan Builders Corp.", owner: "Ramon Dela Cruz", industry: "Construction", location: "Dagupan City, Pangasinan", employees: 85, status: "verified", age: 170, description: "Residential and commercial construction contractor serving Pangasinan since 2009." },
  { key: "bonuan-seafood", company: "Bonuan Seafood Grill", owner: "Liza Fernandez", industry: "Food", location: "Bonuan Gueset, Dagupan City, Pangasinan", employees: 32, status: "verified", age: 150, description: "Family-owned restaurant known for bangus and grilled seafood." },
  { key: "calasiao-mart", company: "Calasiao Mini Mart", owner: "Jun Soriano", industry: "Retail Workers", location: "Calasiao, Pangasinan", employees: 18, status: "verified", age: 120, description: "Neighborhood grocery and household supplies store." },
  { key: "lingayen-tech", company: "Lingayen Tech Solutions", owner: "Carla Mendoza", industry: "Technology", location: "Lingayen, Pangasinan", employees: 24, status: "verified", age: 95, description: "IT support, networking and computer repair for local businesses and LGUs." },
  { key: "mangaldan-farms", company: "Mangaldan Agri Farms", owner: "Pedro Aquino", industry: "Farmer", location: "Mangaldan, Pangasinan", employees: 40, status: "pending", age: 6, description: "Rice and vegetable farm awaiting account verification." },
] as const;

type EmployerKey = (typeof EMPLOYERS)[number]["key"];

const WORKERS = [
  { key: "juan", name: "Juan Santos", skill: "Construction", skills: ["Masonry", "Carpentry", "Blueprint Reading"], jobTitle: "Mason", location: "Dagupan City, Pangasinan", years: "8 years", availability: "Full-Time", salary: "₱750/day", status: "verified", rating: 4.8, reviews: 12, age: 175 },
  { key: "maria", name: "Maria Reyes", skill: "Cook", skills: ["Filipino Cuisine", "Food Safety", "Inventory"], jobTitle: "Line Cook", location: "Bonuan Boquig, Dagupan City", years: "5 years", availability: "Full-Time", salary: "₱18,000/month", status: "verified", rating: 4.6, reviews: 8, age: 160 },
  { key: "jose", name: "Jose Bautista", skill: "Electrical", skills: ["Residential Wiring", "Panel Installation", "Troubleshooting"], jobTitle: "Electrician", location: "Calasiao, Pangasinan", years: "6 years", availability: "Contract", salary: "₱900/day", status: "verified", rating: 4.7, reviews: 10, age: 140 },
  { key: "ana", name: "Ana Villanueva", skill: "Sales Clerk", skills: ["Cashiering", "Customer Service", "Stocking"], jobTitle: "Cashier", location: "Calasiao, Pangasinan", years: "3 years", availability: "Part-Time", salary: "₱3,500/week", status: "active", rating: 4.3, reviews: 5, age: 130 },
  { key: "mark", name: "Mark Ramos", skill: "Technology", skills: ["Computer Repair", "Networking", "Windows Setup"], jobTitle: "IT Technician", location: "Lingayen, Pangasinan", years: "4 years", availability: "Full-Time", salary: "₱20,000/month", status: "active", rating: 4.5, reviews: 6, age: 110 },
  { key: "grace", name: "Grace Torres", skill: "Waiter", skills: ["Table Service", "POS Systems", "Upselling"], jobTitle: "Server", location: "Dagupan City, Pangasinan", years: "2 years", availability: "Flexible", salary: "₱550/day", status: "active", rating: 4.2, reviews: 4, age: 95 },
  { key: "ramil", name: "Ramil Castillo", skill: "Plumbing", skills: ["Pipe Fitting", "Leak Repair", "Fixture Installation"], jobTitle: "Plumber", location: "San Fabian, Pangasinan", years: "7 years", availability: "Contract", salary: "₱800/day", status: "active", rating: 4.4, reviews: 7, age: 80 },
  { key: "lea", name: "Lea Navarro", skill: "Office Work", skills: ["MS Office", "Bookkeeping", "Filing"], jobTitle: "Office Assistant", location: "Lingayen, Pangasinan", years: "3 years", availability: "Full-Time", salary: "₱15,000/month", status: "active", rating: 4.1, reviews: 3, age: 60 },
  { key: "carlo", name: "Carlo Mercado", skill: "Construction", skills: ["Steel Fixing", "Concrete Work"], jobTitle: "Construction Helper", location: "Mangaldan, Pangasinan", years: "1 year", availability: "Full-Time", salary: "₱600/day", status: "active", rating: 0, reviews: 0, age: 40 },
  { key: "joy", name: "Joy Pascual", skill: "Janitor", skills: ["Deep Cleaning", "Sanitation"], jobTitle: "Utility Worker", location: "Dagupan City, Pangasinan", years: "2 years", availability: "Part-Time", salary: "₱500/day", status: "active", rating: 4.0, reviews: 2, age: 25 },
  { key: "paolo", name: "Paolo Garcia", skill: "Furniture", skills: ["Woodworking", "Upholstery"], jobTitle: "Furniture Maker", location: "Urdaneta City, Pangasinan", years: "5 years", availability: "Flexible", salary: "₱700/day", status: "pending", rating: 0, reviews: 0, age: 4 },
  // Registered long ago and not used since: shows up in Account Cleanup (inactive 6+ months).
  { key: "nestor", name: "Nestor Ramirez", skill: "Construction", skills: ["Painting", "Tile Setting"], jobTitle: "Painter", location: "Lingayen, Pangasinan", years: "10 years", availability: "Contract", salary: "₱700/day", status: "active", rating: 4.0, reviews: 1, age: 260, idleDays: 200 },
  { key: "kim", name: "Kimberly Flores", skill: "Food", skills: ["Baking", "Food Prep"], jobTitle: "Baker", location: "Calasiao, Pangasinan", years: "1 year", availability: "Part-Time", salary: "₱500/day", status: "pending", rating: 0, reviews: 0, age: 2 },
] as const;

type WorkerKey = (typeof WORKERS)[number]["key"];

const JOBS: {
  key: string; employer: EmployerKey; title: string; category: string; type: string; salary: string;
  status: "ACCEPTED" | "PENDING" | "DECLINED"; positions: number; age: number; applyIn: number;
  tags: string[]; schedule: string; description: string; requirements: string[]; benefits: string[];
}[] = [
  { key: "mason", employer: "dagupan-builders", title: "Mason", category: "Construction", type: "Full-Time", salary: "₱750/day", status: "ACCEPTED", positions: 3, age: 165, applyIn: 20, tags: ["Construction", "Urgent"], schedule: "Monday to Saturday, 7 AM - 4 PM", description: "Block laying, plastering and finishing for a 3-storey commercial building in Dagupan.", requirements: ["At least 2 years masonry experience", "Can read basic plans"], benefits: ["Free lunch", "SSS, PhilHealth, Pag-IBIG"] },
  { key: "helper", employer: "dagupan-builders", title: "Construction Helper", category: "Construction", type: "Contract", salary: "₱600/day", status: "ACCEPTED", positions: 5, age: 120, applyIn: 25, tags: ["Construction", "Entry Level"], schedule: "Monday to Saturday, 7 AM - 4 PM", description: "Assist skilled workers with hauling, mixing and site cleanup.", requirements: ["Physically fit", "Willing to be assigned on site"], benefits: ["Overtime pay", "Safety gear provided"] },
  { key: "electrician", employer: "dagupan-builders", title: "Licensed Electrician", category: "Electrical", type: "Contract", salary: "₱900/day", status: "ACCEPTED", positions: 2, age: 90, applyIn: 15, tags: ["Electrical", "Licensed"], schedule: "Monday to Friday, 8 AM - 5 PM", description: "Rough-in and finishing electrical works for townhouse units.", requirements: ["Registered electrician preferred", "3+ years experience"], benefits: ["Project completion bonus"] },
  { key: "plumber", employer: "dagupan-builders", title: "Plumber", category: "Plumbing", type: "Temporary", salary: "₱4,500/week", status: "PENDING", positions: 1, age: 5, applyIn: 30, tags: ["Plumbing"], schedule: "Monday to Saturday, 8 AM - 5 PM", description: "Install water lines and fixtures for a 12-unit apartment.", requirements: ["Own basic tools"], benefits: ["Transportation allowance"] },
  { key: "cook", employer: "bonuan-seafood", title: "Line Cook", category: "Cook", type: "Full-Time", salary: "₱18,000/month", status: "ACCEPTED", positions: 2, age: 140, applyIn: 18, tags: ["Kitchen", "Food"], schedule: "Tuesday to Sunday, 10 AM - 8 PM", description: "Prepare grilled seafood and Filipino dishes during lunch and dinner service.", requirements: ["Food handler's certificate", "1+ year kitchen experience"], benefits: ["Free meals", "Service charge share"] },
  { key: "waiter", employer: "bonuan-seafood", title: "Waiter / Waitress", category: "Waiter", type: "Part-Time", salary: "₱550/day", status: "ACCEPTED", positions: 4, age: 100, applyIn: 22, tags: ["Food", "Customer Service"], schedule: "Weekends, 11 AM - 9 PM", description: "Take orders, serve food and keep the dining area clean.", requirements: ["Friendly and presentable"], benefits: ["Tips", "Free meals"] },
  { key: "dishwasher", employer: "bonuan-seafood", title: "Dishwasher", category: "Janitor", type: "Full-Time", salary: "₱12,000/month", status: "DECLINED", positions: 1, age: 75, applyIn: -10, tags: ["Kitchen"], schedule: "Daily, 2 PM - 10 PM", description: "Posting declined by admin: missing schedule details in original submission.", requirements: [], benefits: [] },
  { key: "baker", employer: "bonuan-seafood", title: "Pastry Assistant", category: "Food", type: "Part-Time", salary: "₱500/day", status: "PENDING", positions: 1, age: 3, applyIn: 21, tags: ["Food", "Baking"], schedule: "Monday to Friday, 5 AM - 11 AM", description: "Help prepare bread and desserts for daily service.", requirements: ["Basic baking knowledge"], benefits: ["Free meals"] },
  { key: "cashier", employer: "calasiao-mart", title: "Cashier", category: "Sales Clerk", type: "Full-Time", salary: "₱14,000/month", status: "ACCEPTED", positions: 2, age: 115, applyIn: 12, tags: ["Retail", "Cashiering"], schedule: "Shifting, 6 AM - 10 PM", description: "Handle POS transactions and assist customers at checkout.", requirements: ["Basic math skills", "Honest and trustworthy"], benefits: ["13th month pay", "Employee discount"] },
  { key: "stock", employer: "calasiao-mart", title: "Stock Clerk", category: "Retail Workers", type: "Part-Time", salary: "₱3,000/week", status: "ACCEPTED", positions: 2, age: 60, applyIn: 14, tags: ["Retail"], schedule: "Monday to Saturday, 6 AM - 12 NN", description: "Receive deliveries, restock shelves and track inventory.", requirements: ["Can lift up to 20 kg"], benefits: ["Employee discount"] },
  { key: "utility", employer: "calasiao-mart", title: "Utility Worker", category: "Janitor", type: "Part-Time", salary: "₱500/day", status: "ACCEPTED", positions: 1, age: 30, applyIn: 10, tags: ["Cleaning"], schedule: "Daily, 6 AM - 12 NN", description: "Keep store, restroom and parking area clean.", requirements: ["Reliable and punctual"], benefits: ["Free snacks"] },
  { key: "ittech", employer: "lingayen-tech", title: "IT Support Technician", category: "Technology", type: "Full-Time", salary: "₱20,000/month", status: "ACCEPTED", positions: 1, age: 85, applyIn: 16, tags: ["Technology", "Networking"], schedule: "Monday to Friday, 8 AM - 5 PM", description: "On-site computer repair, LAN setup and helpdesk support for client offices.", requirements: ["Computer hardware knowledge", "Driver's license a plus"], benefits: ["Transportation allowance", "HMO after regularization"] },
  { key: "encoder", employer: "lingayen-tech", title: "Data Encoder", category: "Office Work", type: "Contract", salary: "₱650/day", status: "ACCEPTED", positions: 3, age: 45, applyIn: 9, tags: ["Office", "Encoding"], schedule: "Monday to Friday, 8 AM - 5 PM", description: "Encode records for an LGU digitization project (3-month contract).", requirements: ["Typing speed 40+ WPM", "MS Excel basics"], benefits: ["Free training"] },
  { key: "intern", employer: "lingayen-tech", title: "IT Intern", category: "Technology", type: "Intern", salary: "₱300/day", status: "PENDING", positions: 2, age: 2, applyIn: 28, tags: ["Technology", "Internship"], schedule: "Monday to Friday, 8 AM - 5 PM", description: "OJT placement for IT students: networking and hardware support.", requirements: ["Currently enrolled in an IT course"], benefits: ["Certificate of completion", "Allowance"] },
  { key: "expired", employer: "calasiao-mart", title: "Holiday Season Bagger", category: "Retail Workers", type: "Temporary", salary: "₱450/day", status: "ACCEPTED", positions: 3, age: 150, applyIn: -120, tags: ["Retail", "Seasonal"], schedule: "Daily during holiday season", description: "Seasonal bagging and crowd assistance (closed).", requirements: [], benefits: [] },
];

type AppStatus = "Pending Review" | "Interview Scheduled" | "Accepted" | "Not Selected" | "Withdrawed";
const TIMELINE: Record<AppStatus, string> = {
  "Pending Review": "Submitted",
  "Interview Scheduled": "Interview",
  "Accepted": "Final Decision",
  "Not Selected": "Final Decision",
  "Withdrawed": "Submitted",
};

const APPLICATIONS: { job: string; worker: WorkerKey; status: AppStatus; age: number; interviewIn?: number }[] = [
  { job: "mason", worker: "juan", status: "Accepted", age: 160 },
  { job: "mason", worker: "carlo", status: "Not Selected", age: 38 },
  { job: "helper", worker: "carlo", status: "Accepted", age: 35 },
  { job: "helper", worker: "joy", status: "Pending Review", age: 20 },
  { job: "electrician", worker: "jose", status: "Accepted", age: 85 },
  { job: "plumber", worker: "ramil", status: "Pending Review", age: 4 },
  { job: "cook", worker: "maria", status: "Accepted", age: 135 },
  { job: "cook", worker: "kim", status: "Pending Review", age: 1 },
  { job: "waiter", worker: "grace", status: "Accepted", age: 90 },
  { job: "waiter", worker: "ana", status: "Interview Scheduled", age: 10, interviewIn: 3 },
  { job: "cashier", worker: "ana", status: "Accepted", age: 110 },
  { job: "cashier", worker: "lea", status: "Not Selected", age: 100 },
  { job: "stock", worker: "joy", status: "Interview Scheduled", age: 8, interviewIn: 2 },
  { job: "utility", worker: "joy", status: "Accepted", age: 22 },
  { job: "ittech", worker: "mark", status: "Accepted", age: 80 },
  { job: "encoder", worker: "lea", status: "Accepted", age: 40 },
  { job: "encoder", worker: "mark", status: "Withdrawed", age: 42 },
  { job: "encoder", worker: "grace", status: "Pending Review", age: 6 },
];

const CONTACTS: { key: string; worker: WorkerKey; employer: EmployerKey; title: string; age: number; messages: [from: "worker" | "employer", text: string][] }[] = [
  { key: "juan-builders", worker: "juan", employer: "dagupan-builders", title: "Mason position", age: 158, messages: [
    ["employer", "Hi Juan, we reviewed your application. Can you start next Monday?"],
    ["worker", "Good day po! Yes, I can start Monday. What time should I report?"],
    ["employer", "Please report at 7 AM at the Arellano St. site. Bring your own trowel."],
    ["worker", "Noted po, thank you!"],
  ] },
  { key: "maria-seafood", worker: "maria", employer: "bonuan-seafood", title: "Line Cook position", age: 133, messages: [
    ["employer", "Hello Maria, congratulations! You're hired as Line Cook."],
    ["worker", "Thank you po! Do I need to bring my food handler's certificate on day one?"],
    ["employer", "Yes please, and wear closed shoes. See you Tuesday."],
  ] },
  { key: "ana-seafood", worker: "ana", employer: "bonuan-seafood", title: "Interview for Waiter / Waitress", age: 9, messages: [
    ["employer", "Hi Ana, we'd like to interview you this week for the weekend server role."],
    ["worker", "Hello po! I'm available any afternoon this week."],
  ] },
  { key: "mark-tech", worker: "mark", employer: "lingayen-tech", title: "IT Support Technician", age: 78, messages: [
    ["employer", "Mark, your first deployment is at the Lingayen municipal hall on Monday."],
    ["worker", "Got it. Should I bring the crimping tools from the office?"],
    ["employer", "Yes, pick them up at 7:30 AM. Thanks!"],
  ] },
];

const ASSIGNMENTS: { key: string; employer: EmployerKey; workers: WorkerKey[]; title: string; description: string; age: number; dueIn: number }[] = [
  { key: "site-photos", employer: "dagupan-builders", workers: ["juan", "carlo"], title: "Upload daily site progress photos", description: "Submit photos of completed block work for the 2nd floor before the inspection.", age: 20, dueIn: -5 },
  { key: "inventory", employer: "calasiao-mart", workers: ["ana", "joy"], title: "Weekly inventory count sheet", description: "Fill out and upload the inventory count sheet for aisles 1-4.", age: 6, dueIn: 4 },
  { key: "network-report", employer: "lingayen-tech", workers: ["mark"], title: "Network setup report", description: "Upload the LAN diagram and test results for the municipal hall deployment.", age: 12, dueIn: 2 },
];

const SUBMISSIONS: { assignment: string; worker: WorkerKey; status: "PENDING" | "COMPLETED" | "REJECTED"; isLate: boolean; note: string; age: number }[] = [
  { assignment: "site-photos", worker: "juan", status: "COMPLETED", isLate: false, note: "Photos of 2nd floor block work, east and west walls.", age: 8 },
  { assignment: "site-photos", worker: "carlo", status: "REJECTED", isLate: true, note: "Uploaded late due to rain delay.", age: 3 },
  { assignment: "network-report", worker: "mark", status: "PENDING", isLate: false, note: "Attached LAN diagram and ping test results.", age: 1 },
];

const REPORTS: { key: string; worker: WorkerKey; employer: EmployerKey; reporter: "worker" | "employer"; type: string; description: string; status: string; age: number }[] = [
  { key: "late-pay", worker: "carlo", employer: "dagupan-builders", reporter: "worker", type: "Payment Issue", description: "Salary for the second week was released 5 days late without notice.", status: "Resolved", age: 25 },
  { key: "no-show", worker: "grace", employer: "bonuan-seafood", reporter: "employer", type: "No Show", description: "Worker did not report for two scheduled weekend shifts.", status: "Under Review", age: 12 },
  { key: "unsafe", worker: "jose", employer: "dagupan-builders", reporter: "worker", type: "Unsafe Working Conditions", description: "No grounding equipment provided at the townhouse site.", status: "Pending", age: 4 },
  { key: "misconduct", worker: "lea", employer: "calasiao-mart", reporter: "employer", type: "Misconduct", description: "Report filed by mistake; withdrawn by employer.", status: "Rejected", age: 50 },
];

const RATINGS: { worker: WorkerKey; rating: number; description: string }[] = [
  { worker: "juan", rating: 5, description: "LocalWorks helped me find steady masonry work close to home." },
  { worker: "maria", rating: 5, description: "I got hired as a cook within two weeks. Very easy to use!" },
  { worker: "jose", rating: 4, description: "Good job listings for electricians in Pangasinan." },
  { worker: "mark", rating: 5, description: "Found an IT job in Lingayen without going to Manila." },
];

/* -------------------------------------------------------------------------- */
/*                               Build documents                              */
/* -------------------------------------------------------------------------- */

const buildDocuments = (passwordHash: string) => {
  const employerByKey = new Map(EMPLOYERS.map((e) => [e.key, e]));
  const jobByKey = new Map(JOBS.map((j) => [j.key, j]));
  const email = (key: string) => `${key}@${EMAIL_DOMAIN}`;

  const industries = INDUSTRIES.map((title, i) => ({
    _id: oid(`industry:${title}`), title, notAccepted: false, ...ts(daysAgo(180 - i)),
  }));

  const employers = EMPLOYERS.map((e, i) => ({
    _id: oid(`employer:${e.key}`),
    company: e.company,
    owner: e.owner,
    email: email(e.key),
    password: passwordHash,
    phone: `+6391700000${String(i + 1).padStart(2, "0")}`,
    industry: oid(`industry:${e.industry}`),
    location: e.location,
    description: e.description,
    noOfEmployees: e.employees,
    website: "N/A",
    status: e.status,
    lastActiveAt: daysAgo(Math.min(e.age, 2 + i)),
    role: "employer",
    ...ts(daysAgo(e.age)),
  }));

  const workers = WORKERS.map((w, i) => ({
    _id: oid(`worker:${w.key}`),
    name: w.name,
    email: email(w.key),
    password: passwordHash,
    phoneNumber: `+6392800000${String(i + 1).padStart(2, "0")}`,
    role: "worker",
    skill: w.skill,
    skills: [...w.skills],
    jobTitle: w.jobTitle,
    location: w.location,
    yearsOfExperience: w.years,
    availability: w.availability,
    expected_salary: w.salary,
    about_me: `${w.jobTitle} based in ${w.location} with ${w.years} of experience.`,
    rating: w.rating,
    reviews: w.reviews,
    jobs_applied: APPLICATIONS.filter((a) => a.worker === w.key).length,
    interviews: APPLICATIONS.filter((a) => a.worker === w.key && a.status !== "Pending Review" && a.status !== "Withdrawed").length,
    status: w.status,
    // Recent activity so the 6-month cleanup leaves demo accounts alone (except the idle one).
    lastActiveAt: daysAgo("idleDays" in w ? w.idleDays : Math.min(w.age, 1 + i)),
    ...ts(daysAgo(w.age)),
  }));

  const verifiedWorkers = WORKERS.filter((w) => w.status === "verified").map((w) => ({
    _id: oid(`verified:${w.key}`), worker: oid(`worker:${w.key}`), ...ts(daysAgo(w.age - 2)),
  }));

  const jobs = JOBS.map((j) => {
    const employer = employerByKey.get(j.employer)!;
    const created = daysAgo(j.age);
    const applyBefore = j.applyIn >= 0 ? daysFromNow(j.applyIn) : daysAgo(-j.applyIn);
    const start = new Date(applyBefore);
    start.setDate(start.getDate() + 7);
    return {
      _id: oid(`job:${j.key}`),
      title: j.title,
      company: employer.company,
      posted: oid(`employer:${j.employer}`),
      location: employer.location,
      type: j.type,
      salary: j.salary,
      description: j.description,
      tags: j.tags,
      requirements: j.requirements,
      benefits: j.benefits,
      schedule: j.schedule,
      startDate: ymd(start),
      applyBefore: ymd(applyBefore),
      status: j.status,
      positions: j.positions,
      category: j.category,
      email: email(j.employer),
      ...ts(created),
    };
  });

  const applications = APPLICATIONS.map((a) => {
    const job = jobByKey.get(a.job)!;
    const employer = employerByKey.get(job.employer)!;
    return {
      _id: oid(`application:${a.job}:${a.worker}`),
      job: oid(`job:${a.job}`),
      worker: oid(`worker:${a.worker}`),
      location: employer.location,
      company: employer.company,
      status: a.status,
      timeline: TIMELINE[a.status],
      interviewDate: a.interviewIn ? ymd(daysFromNow(a.interviewIn)) : "",
      ...ts(daysAgo(a.age)),
    };
  });

  const applicationsAccepted = APPLICATIONS.filter((a) => a.status === "Accepted").map((a) => {
    const job = jobByKey.get(a.job)!;
    return {
      _id: oid(`accepted:${a.job}:${a.worker}`),
      job: oid(`job:${a.job}`),
      jobCreatedAt: daysAgo(job.age),
      createdAt: daysAgo(Math.max(a.age - 3, 0)),
    };
  });

  const contacts = CONTACTS.map((c) => {
    const last = c.messages[c.messages.length - 1];
    return {
      _id: oid(`contact:${c.key}`),
      worker: oid(`worker:${c.worker}`),
      employerId: oid(`employer:${c.employer}`),
      title: c.title,
      description: `Conversation about: ${c.title}`,
      lastMessage: last[1],
      lastMessageAt: daysAgo(c.age - (c.messages.length - 1) * 0.1),
      unreadCountWorker: last[0] === "employer" ? 1 : 0,
      unreadCountEmployer: last[0] === "worker" ? 1 : 0,
      status: "active",
      ...ts(daysAgo(c.age)),
    };
  });

  const messages = CONTACTS.flatMap((c) =>
    c.messages.map(([from, content], i) => {
      const workerId = oid(`worker:${c.worker}`);
      const employerId = oid(`employer:${c.employer}`);
      const isLast = i === c.messages.length - 1;
      const sent = daysAgo(c.age);
      sent.setMinutes(sent.getMinutes() + i * 25);
      return {
        _id: oid(`message:${c.key}:${i}`),
        contactId: oid(`contact:${c.key}`),
        senderId: from === "worker" ? workerId : employerId,
        recipientId: from === "worker" ? employerId : workerId,
        senderRole: from,
        content,
        attachments: [],
        readByWorker: from === "worker" || !isLast,
        readByEmployer: from === "employer" || !isLast,
        ...ts(sent),
      };
    })
  );

  const assignments = ASSIGNMENTS.map((a) => ({
    _id: oid(`assignment:${a.key}`),
    employerId: oid(`employer:${a.employer}`),
    targetWorkers: a.workers.map((w) => ({ _id: oid(`worker:${w}`) })),
    title: a.title,
    description: a.description,
    submitBefore: (a.dueIn >= 0 ? daysFromNow(a.dueIn) : daysAgo(-a.dueIn)).toISOString(),
    rejectLate: true,
    ...ts(daysAgo(a.age)),
  }));

  const submissions = SUBMISSIONS.map((s) => {
    const assignment = ASSIGNMENTS.find((a) => a.key === s.assignment)!;
    return {
      _id: oid(`submission:${s.assignment}:${s.worker}`),
      workerId: oid(`worker:${s.worker}`),
      employerId: oid(`employer:${assignment.employer}`),
      workerAssignment: oid(`assignment:${s.assignment}`),
      workerUpload: [],
      workerDescription: s.note,
      submitted: true,
      status: s.status,
      isLate: s.isLate,
      ...ts(daysAgo(s.age)),
    };
  });

  const reports = REPORTS.map((r) => ({
    _id: oid(`report:${r.key}`),
    workerId: oid(`worker:${r.worker}`),
    employerId: oid(`employer:${r.employer}`),
    sentBy: r.reporter === "worker" ? oid(`worker:${r.worker}`) : oid(`employer:${r.employer}`),
    reporter: r.reporter,
    reportType: r.type,
    description: r.description,
    status: r.status,
    submitEvidence: [],
    ...ts(daysAgo(r.age)),
  }));

  const ratings = RATINGS.map((r) => ({
    _id: oid(`rating:${r.worker}`), worker: oid(`worker:${r.worker}`), rating: r.rating, description: r.description,
  }));

  const userNotifications = [
    ...APPLICATIONS.filter((a) => a.status !== "Pending Review" && a.status !== "Withdrawed").map((a) => ({
      _id: oid(`notif:app:${a.job}:${a.worker}`),
      type: "application",
      category: "application",
      audience: "specific",
      targetUsers: [oid(`worker:${a.worker}`)],
      title: `Application ${a.status}`,
      description: `Your application for ${jobByKey.get(a.job)!.title} is now "${a.status}".`,
      read: a.age > 14,
      ...ts(daysAgo(Math.max(a.age - 2, 0))),
    })),
    ...ASSIGNMENTS.map((a) => ({
      _id: oid(`notif:assignment:${a.key}`),
      type: "worker_assignment",
      category: "worker_assignment",
      audience: "specific",
      targetUsers: a.workers.map((w) => oid(`worker:${w}`)),
      title: "New worker assignment",
      description: `${employerByKey.get(a.employer)!.company} assigned you: ${a.title}`,
      read: a.dueIn < 0,
      ...ts(daysAgo(a.age)),
    })),
    {
      _id: oid("notif:welcome"),
      type: "verification",
      category: "account",
      audience: "all",
      targetUsers: [],
      title: "Welcome to LocalWorks",
      description: "Complete your profile to get matched with local jobs and workers faster.",
      read: false,
      ...ts(daysAgo(30)),
    },
  ];

  const adminNotifications = [
    ...JOBS.filter((j) => j.age <= 10).map((j) => ({
      _id: oid(`admin-notif:job:${j.key}`),
      type: "job_posted",
      category: "job",
      title: "New job posted",
      description: `${employerByKey.get(j.employer)!.company} posted "${j.title}" (${j.category}).`,
      time: daysAgo(j.age).toISOString(),
      read: false,
    })),
    ...WORKERS.filter((w) => w.status === "pending").map((w) => ({
      _id: oid(`admin-notif:verify:${w.key}`),
      type: "verification",
      category: "account",
      title: "Worker awaiting verification",
      description: `${w.name} (${w.jobTitle}) registered and is waiting for verification.`,
      time: daysAgo(w.age).toISOString(),
      read: false,
    })),
    ...REPORTS.filter((r) => r.status === "Pending" || r.status === "Under Review").map((r) => ({
      _id: oid(`admin-notif:report:${r.key}`),
      type: "report",
      category: "report",
      title: `New report: ${r.type}`,
      description: r.description,
      time: daysAgo(r.age).toISOString(),
      read: false,
    })),
  ];

  // Order matters for --apply (parents first) and is reversed for --reset.
  return [
    { label: "Industries", model: Industry, docs: industries },
    { label: "Employers", model: Employer, docs: employers },
    { label: "Workers", model: Worker, docs: workers },
    { label: "Verified workers", model: VerifiedWorker, docs: verifiedWorkers },
    { label: "Jobs", model: Job, docs: jobs },
    { label: "Applications", model: Application, docs: applications },
    { label: "Accepted applications", model: ApplicationAccepted, docs: applicationsAccepted },
    { label: "Contacts", model: Contact, docs: contacts },
    { label: "Messages", model: Message, docs: messages },
    { label: "Worker assignments", model: WorkerAssignment, docs: assignments },
    { label: "Submitted work", model: JobsCompleted, docs: submissions },
    { label: "Incident reports", model: Report, docs: reports },
    { label: "Ratings / reviews", model: Rating, docs: ratings },
    { label: "User notifications", model: UserNotification, docs: userNotifications },
    { label: "Admin notifications", model: AdminNotification, docs: adminNotifications },
  ] as { label: string; model: Model<any>; docs: Record<string, unknown>[] }[];
};

/* -------------------------------------------------------------------------- */
/*                                    Run                                     */
/* -------------------------------------------------------------------------- */

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  const apply = process.argv.includes("--apply");
  const reset = process.argv.includes("--reset");
  const password = process.env.SEED_DEMO_PASSWORD ?? "";

  if (apply && reset) throw new Error("Use either --apply or --reset, not both.");
  if (!mongoUri) throw new Error("MONGO_URI is required. Load it through dotenvx before running this script.");
  if ((apply || reset) && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Database writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`);
  }
  if (apply && password.length < 8) {
    throw new Error("Set SEED_DEMO_PASSWORD (min 8 characters); every demo account will use it to log in.");
  }

  const passwordHash = apply ? await bcrypt.hash(password, 12) : "preview";
  const groups = buildDocuments(passwordHash);

  // Validate every fixture against its schema before touching the database.
  for (const { label, model, docs } of groups) {
    for (const doc of docs) {
      try {
        await new model(doc).validate();
      } catch (error) {
        throw new Error(`${label} fixture ${String(doc._id)} failed validation: ${sanitizeError(error)}`);
      }
    }
  }

  await mongoose.connect(mongoUri);

  try {
    // Refuse to run if a demo email is already used by a non-demo account.
    for (const { model, docs } of groups.filter((g) => g.model === Employer || g.model === Worker)) {
      const clashes = await model
        .find({ email: { $in: docs.map((d) => d.email) }, _id: { $nin: docs.map((d) => d._id) } })
        .select("email");
      if (clashes.length) {
        throw new Error(`Demo email(s) already used by real accounts: ${clashes.map((c) => c.email).join(", ")}`);
      }
    }

    const mode = reset ? "Reset" : apply ? "Applying" : "Preview";
    console.log(`${mode}: LocalWorks demo data\n`);

    if (reset) {
      for (const { label, model, docs } of [...groups].reverse()) {
        const { deletedCount } = await model.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
        console.log(`- ${label}: removed ${deletedCount}`);
      }
      console.log("\nDemo data removed.");
      return;
    }

    let totalNew = 0;
    for (const { label, model, docs } of groups) {
      const existing = new Set(
        (await model.find({ _id: { $in: docs.map((d) => d._id) } }).select("_id").lean()).map((d: any) =>
          String(d._id)
        )
      );
      const missing = docs.filter((d) => !existing.has(String(d._id)));
      totalNew += missing.length;
      console.log(`- ${label}: ${missing.length} new, ${existing.size} already seeded`);

      if (apply && missing.length) {
        // Insert through the driver so our backdated createdAt values are kept
        // (Mongoose timestamps would overwrite them with "now"). Fixtures were validated above.
        await model.collection.insertMany(missing.map((d) => new model(d).toObject({ depopulate: true })));
      }
    }

    if (!apply) {
      console.log(`\nPreview only: ${totalNew} document(s) would be inserted. Re-run with --apply to write.`);
      return;
    }

    console.log(`\nSeed complete: inserted ${totalNew} document(s).`);
    console.log(`Demo logins use the password from SEED_DEMO_PASSWORD:`);
    console.log(`  Employer: ${EMPLOYERS[0].key}@${EMAIL_DOMAIN}`);
    console.log(`  Worker:   ${WORKERS[0].key}@${EMAIL_DOMAIN}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error(`Demo seeding failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
});
