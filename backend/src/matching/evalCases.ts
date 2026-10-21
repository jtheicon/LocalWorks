// Hand-labeled worker/job pairs for measuring match quality (npm run eval:matching).
// `relevant` is a person's judgment: should this job be recommended to this worker?
// Add real cases from your users over time; the more cases, the more the numbers mean.
export interface EvalCase {
  worker: string[];
  job: string[];
  relevant: boolean;
  note?: string;
}

export const EVAL_CASES: EvalCase[] = [
  // Same skills, different wording
  { worker: ["Plumber"], job: ["Plumbing"], relevant: true },
  { worker: ["Electrician"], job: ["Electrical Wiring", "Electrical"], relevant: true },
  { worker: ["Carpenter", "Mason"], job: ["Carpentry", "Masonry"], relevant: true },
  { worker: ["Truck Driving", "Delivery"], job: ["Driving"], relevant: true },
  { worker: ["Welder"], job: ["Welding", "Metal Fabrication"], relevant: true, note: "partly covered" },

  // Synonyms and Filipino terms (rules alone can't know these)
  { worker: ["Karpintero"], job: ["Carpentry"], relevant: true },
  { worker: ["Tubero"], job: ["Plumbing"], relevant: true },
  { worker: ["Housekeeping"], job: ["House Cleaning", "Laundry"], relevant: true },
  { worker: ["Cook"], job: ["Food Preparation", "Kitchen Work"], relevant: true },
  { worker: ["MS Excel", "Typing"], job: ["Data Entry", "Spreadsheets"], relevant: true },
  { worker: ["Cashier"], job: ["Point of Sale", "Cash Handling"], relevant: true },
  { worker: ["Yaya"], job: ["Childcare"], relevant: true },

  // Related trades
  { worker: ["Carpentry"], job: ["Furniture Assembly"], relevant: true },
  { worker: ["Aircon Technician"], job: ["HVAC Maintenance"], relevant: true },

  // Should not be recommended
  { worker: ["Plumbing"], job: ["Graphic Design"], relevant: false },
  { worker: ["Waiter"], job: ["Cook", "Food Preparation"], relevant: false, note: "same industry, different skill" },
  { worker: ["Driving"], job: ["Auto Mechanic"], relevant: false },
  { worker: ["Painting"], job: ["Printing", "Layout Design"], relevant: false, note: "look-alike words" },
  { worker: ["Welding"], job: ["Wedding Coordination"], relevant: false, note: "look-alike words" },
  { worker: ["Cleaning"], job: ["Tutoring", "Lesson Planning"], relevant: false },
  { worker: ["Hairdressing"], job: ["Electrician", "Electrical Wiring"], relevant: false },
  { worker: ["Customer Service"], job: ["Welding", "Masonry"], relevant: false },
];
