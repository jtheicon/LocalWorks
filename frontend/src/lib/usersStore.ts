import { create } from 'zustand';

export interface UserProfile {
  _id?: string;
  id: number;
  name: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  location: string;
  role: "worker" | "employer";
  status: "active" | "not_active" | "pending";
  photoUrl: string | null;
  photo?: string;
  resumeUrl: string | null;       // workers
  resume?: string;
  permitUrl: string | null;       // employers
  permit?: string;
  skills?: string;
  skillCategory?: string;
  companyName?: string;
  company?: string;
  industry?: {
    title: string
  };
  skill?: string;
  reportsSubmitted: number;
  createdAt: string;
  jobTitle?: string;
  isVerified?: Boolean;
}

const mockUsers: UserProfile[] = [
  {
    id: 1, name: "Juan Dela Cruz", email: "juandelacruz@gmail.com", phone: "09278772393",
    location: "Brgy. Pantai", role: "worker", status: "active", photoUrl: null,
    resumeUrl: "/placeholder.svg", permitUrl: null, skills: "Construction, Welding",
    reportsSubmitted: 10, createdAt: "2025-01-15",
  },
  {
    id: 2, name: "Maria Santos", email: "mariasantos@gmail.com", phone: "09185553210",
    location: "Brgy. Centro", role: "worker", status: "active", photoUrl: null,
    resumeUrl: "/placeholder.svg", permitUrl: null, skills: "Cleaning, Cooking",
    reportsSubmitted: 5, createdAt: "2025-02-10",
  },
  {
    id: 3, name: "Pedro Reyes", email: "pedroreyes@gmail.com", phone: "09321234567",
    location: "Brgy. Poblacion", role: "employer", status: "pending", photoUrl: null,
    resumeUrl: null, permitUrl: "/placeholder.svg", companyName: "BuildRight Construction",
    industry: "Construction", reportsSubmitted: 2, createdAt: "2025-03-01",
  },
  {
    id: 4, name: "Ana Gonzales", email: "anagonzales@gmail.com", phone: "09456789012",
    location: "Brgy. Riverside", role: "employer", status: "active", photoUrl: null,
    resumeUrl: null, permitUrl: "/placeholder.svg", companyName: "Sparkle Clean Services",
    industry: "Cleaning Services", reportsSubmitted: 8, createdAt: "2025-01-20",
  },
  {
    id: 5, name: "Carlo Mendoza", email: "carlomendoza@gmail.com", phone: "09567890123",
    location: "Brgy. Hilltop", role: "worker", status: "not_active", photoUrl: null,
    resumeUrl: "/placeholder.svg", permitUrl: null, skills: "Driving, Delivery",
    reportsSubmitted: 3, createdAt: "2025-02-28",
  },
  {
    id: 6, name: "Rosa Villanueva", email: "rosavillanueva@gmail.com", phone: "09678901234",
    location: "Brgy. Seaside", role: "employer", status: "active", photoUrl: null,
    resumeUrl: null, permitUrl: "/placeholder.svg", companyName: "FastTrack Logistics",
    industry: "Logistics", reportsSubmitted: 12, createdAt: "2024-12-05",
  },
];

interface UsersStore {
  users: UserProfile[];
  updateStatus: (id: number, status: UserProfile["status"]) => void;
  removeUser: (id: number) => void;
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: mockUsers,
  updateStatus: (id, status) => {
    set({ users: get().users.map(u => u.id === id ? { ...u, status } : u) });
  },
  removeUser: (id) => {
    set({ users: get().users.filter(u => u.id !== id) });
  },
}));
