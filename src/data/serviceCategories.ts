export const MAIN_SERVICE_CATEGORIES = [
  "Home & Local Services",
  "Automotive & Transport",
  "Shops, Food & Daily Needs",
  "Professional & Business Services",
  "Health, Education & Community",
  "Events & Lifestyle",
] as const;

export type MainServiceCategory = (typeof MAIN_SERVICE_CATEGORIES)[number];

export const SUBCATEGORIES_BY_MAIN: Record<MainServiceCategory, readonly string[]> = {
  "Home & Local Services": [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Painter",
    "Handyman",
    "Cleaning",
    "Pest Control",
    "CCTV",
    "Solar",
    "Repair",
  ],
  "Automotive & Transport": [
    "Car/Bike/Truck Repair",
    "Tire",
    "Oil Change",
    "Car Wash",
    "Driver",
    "Taxi",
    "Rental",
    "Towing",
  ],
  "Shops, Food & Daily Needs": [
    "Grocery",
    "Restaurant",
    "Cafe",
    "Bakery",
    "Pharmacy",
    "Clothing",
    "Electronics",
    "Pet Store",
  ],
  "Professional & Business Services": [
    "Web/App Dev",
    "Design",
    "SEO",
    "Marketing",
    "IT Support",
    "Accounting",
    "Legal",
    "Real Estate",
  ],
  "Health, Education & Community": [
    "Doctor",
    "Clinic",
    "Dentist",
    "Tutor",
    "Coaching",
    "Blood Donor",
    "Ambulance",
  ],
  "Events & Lifestyle": [
    "Event Planner",
    "Wedding",
    "Photographer",
    "Videographer",
    "DJ",
    "Makeup",
  ],
} as const;

export const isValidMainCategory = (value: string): value is MainServiceCategory =>
  (MAIN_SERVICE_CATEGORIES as readonly string[]).includes(value);

export const isValidSubcategoryForMain = (mainCategory: string, subCategory: string) => {
  if (!isValidMainCategory(mainCategory)) return false;
  return SUBCATEGORIES_BY_MAIN[mainCategory].includes(subCategory);
};