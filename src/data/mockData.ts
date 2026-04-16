export interface Worker {
  id: string;
  name: string;
  profession: string;
  rating: number;
  reviewCount: number;
  experience: number;
  distance: number;
  available: boolean;
  verified: boolean;
  phone: string;
  description: string;
  serviceAreas: string[];
  profilePhoto: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export const serviceCategories: ServiceCategory[] = [
  { id: "plumber", name: "Plumber", icon: "🔧", count: 24 },
  { id: "electrician", name: "Electrician", icon: "⚡", count: 31 },
  { id: "carpenter", name: "Carpenter", icon: "🪚", count: 18 },
  { id: "painter", name: "Painter", icon: "🎨", count: 15 },
  { id: "mechanic", name: "Mechanic", icon: "🔩", count: 22 },
  { id: "cleaner", name: "Cleaner", icon: "🧹", count: 27 },
  { id: "ac-technician", name: "AC Technician", icon: "❄️", count: 12 },
  { id: "mason", name: "Mason", icon: "🧱", count: 9 },
];

export const workers: Worker[] = [
  {
    id: "1",
    name: "Ahmed Khan",
    profession: "Plumber",
    rating: 4.8,
    reviewCount: 127,
    experience: 8,
    distance: 1.2,
    available: true,
    verified: true,
    phone: "+92 300 1234567",
    description: "Expert plumber with 8 years of experience in residential and commercial plumbing. Specializing in pipe fitting, leak repairs, and bathroom installations.",
    serviceAreas: ["Gulberg", "DHA", "Model Town"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.5090,
    longitude: 74.3340,
  },
  {
    id: "2",
    name: "Muhammad Ali",
    profession: "Electrician",
    rating: 4.6,
    reviewCount: 89,
    experience: 12,
    distance: 2.5,
    available: true,
    verified: true,
    phone: "+92 301 2345678",
    description: "Certified electrician handling wiring, panel upgrades, and electrical installations for homes and offices.",
    serviceAreas: ["Johar Town", "Gulberg", "Cantt"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.4680,
    longitude: 74.2690,
  },
  {
    id: "3",
    name: "Usman Tariq",
    profession: "Carpenter",
    rating: 4.9,
    reviewCount: 64,
    experience: 15,
    distance: 0.8,
    available: false,
    verified: true,
    phone: "+92 302 3456789",
    description: "Master carpenter specializing in custom furniture, kitchen cabinets, and wood restoration work.",
    serviceAreas: ["DHA", "Bahria Town", "Model Town"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.4980,
    longitude: 74.3860,
  },
  {
    id: "4",
    name: "Bilal Hussain",
    profession: "Painter",
    rating: 4.3,
    reviewCount: 42,
    experience: 5,
    distance: 3.1,
    available: true,
    verified: false,
    phone: "+92 303 4567890",
    description: "Professional painter offering interior and exterior painting services with premium quality paints.",
    serviceAreas: ["Gulberg", "Garden Town", "Faisal Town"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.5200,
    longitude: 74.3420,
  },
  {
    id: "5",
    name: "Farhan Malik",
    profession: "AC Technician",
    rating: 4.7,
    reviewCount: 156,
    experience: 10,
    distance: 1.8,
    available: true,
    verified: true,
    phone: "+92 304 5678901",
    description: "AC installation, repair, and maintenance expert. Handling all major brands including split and window units.",
    serviceAreas: ["DHA", "Johar Town", "Gulberg"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.4850,
    longitude: 74.3650,
  },
  {
    id: "6",
    name: "Hassan Raza",
    profession: "Mechanic",
    rating: 4.5,
    reviewCount: 98,
    experience: 7,
    distance: 4.2,
    available: true,
    verified: true,
    phone: "+92 305 6789012",
    description: "Experienced auto mechanic for cars and motorcycles. Engine repair, oil change, brake service and more.",
    serviceAreas: ["Cantt", "Gulberg", "Township"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.5480,
    longitude: 74.3550,
  },
  {
    id: "7",
    name: "Imran Siddiqui",
    profession: "Cleaner",
    rating: 4.4,
    reviewCount: 73,
    experience: 3,
    distance: 1.5,
    available: true,
    verified: true,
    phone: "+92 306 7890123",
    description: "Professional cleaning services for homes and offices. Deep cleaning, carpet cleaning, and regular maintenance.",
    serviceAreas: ["Model Town", "Gulberg", "DHA"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.4760,
    longitude: 74.3290,
  },
  {
    id: "8",
    name: "Zain Abbas",
    profession: "Electrician",
    rating: 4.2,
    reviewCount: 35,
    experience: 4,
    distance: 2.0,
    available: false,
    verified: false,
    phone: "+92 307 8901234",
    description: "Electrician specializing in home wiring, switch board installation, and LED light fitting.",
    serviceAreas: ["Johar Town", "Faisal Town"],
    profilePhoto: "",
    city: "Lahore",
    latitude: 31.4610,
    longitude: 74.2980,
  },
];

export interface Review {
  id: string;
  workerId: string;
  customerName: string;
  rating: number;
  text: string;
  date: string;
}

export const reviews: Review[] = [
  { id: "r1", workerId: "1", customerName: "Sara A.", rating: 5, text: "Excellent work! Fixed our kitchen leak in no time. Very professional.", date: "2026-02-15" },
  { id: "r2", workerId: "1", customerName: "Kamran M.", rating: 4, text: "Good job, arrived on time. Slightly expensive but quality work.", date: "2026-01-28" },
  { id: "r3", workerId: "2", customerName: "Fatima K.", rating: 5, text: "Very knowledgeable electrician. Rewired our entire house safely.", date: "2026-02-20" },
  { id: "r4", workerId: "3", customerName: "Ali R.", rating: 5, text: "Beautiful custom bookshelf. Usman is a true craftsman!", date: "2026-03-01" },
  { id: "r5", workerId: "5", customerName: "Nadia S.", rating: 5, text: "AC was blowing hot air. Farhan diagnosed and fixed it quickly.", date: "2026-02-10" },
  { id: "r6", workerId: "5", customerName: "Omer T.", rating: 4, text: "Installed our new split AC perfectly. Clean work.", date: "2026-01-15" },
];
