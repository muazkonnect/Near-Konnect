// Keyword → related profession/category terms.
// When a user types a generic keyword, we expand it to all related
// profession terms so matching workers also surface.
const KEYWORD_MAP: Record<string, string[]> = {
  // Repair / fix
  fix: ["plumber", "electrician", "mechanic", "carpenter", "technician", "repair", "ac", "fridge", "appliance"],
  repair: ["plumber", "electrician", "mechanic", "carpenter", "technician", "ac", "fridge", "appliance", "phone"],
  broken: ["plumber", "electrician", "mechanic", "carpenter", "technician", "repair"],

  // Water / plumbing
  water: ["plumber", "plumbing", "tank", "pipe", "leak", "bore"],
  leak: ["plumber", "plumbing", "pipe", "water"],
  pipe: ["plumber", "plumbing"],
  tap: ["plumber", "plumbing"],
  toilet: ["plumber", "plumbing"],
  bathroom: ["plumber", "tiles", "mason"],

  // Electrical
  light: ["electrician", "electrical", "wiring", "lighting"],
  power: ["electrician", "electrical", "wiring", "generator", "inverter"],
  wiring: ["electrician", "electrical"],
  fan: ["electrician", "appliance", "repair"],
  switch: ["electrician", "electrical"],
  electricity: ["electrician", "electrical", "wiring"],

  // AC / appliances
  ac: ["ac technician", "hvac", "air conditioner", "appliance repair", "electrician"],
  cooling: ["ac technician", "hvac", "refrigeration"],
  fridge: ["refrigeration", "appliance repair", "technician"],
  refrigerator: ["refrigeration", "appliance repair", "technician"],
  washing: ["appliance repair", "technician"],
  appliance: ["appliance repair", "technician", "electrician"],

  // Construction
  build: ["mason", "construction", "contractor", "civil", "carpenter"],
  construction: ["mason", "contractor", "civil engineer", "labour", "carpenter"],
  paint: ["painter", "wall painter", "decorator"],
  painting: ["painter", "wall painter", "decorator"],
  wall: ["painter", "mason", "tiles", "plaster"],
  tile: ["tiles", "mason", "flooring"],
  tiles: ["mason", "flooring"],
  floor: ["flooring", "tiles", "carpet", "mason"],
  wood: ["carpenter", "woodwork", "furniture"],
  furniture: ["carpenter", "woodwork", "polish"],
  carpenter: ["woodwork", "furniture"],
  welding: ["welder", "fabricator", "steel"],
  steel: ["welder", "fabricator"],
  glass: ["glass", "aluminum", "fabricator"],
  roof: ["mason", "contractor", "civil"],

  // Vehicle
  car: ["mechanic", "driver", "auto", "garage"],
  bike: ["mechanic", "auto", "garage"],
  vehicle: ["mechanic", "driver", "auto"],
  driver: ["driver", "chauffeur", "taxi", "transport"],
  taxi: ["driver", "cab", "transport"],
  mechanic: ["auto", "garage", "vehicle"],

  // Cleaning / home
  clean: ["cleaner", "housekeeping", "maid", "deep cleaning", "sweeper"],
  cleaning: ["cleaner", "housekeeping", "maid", "deep cleaning"],
  maid: ["housekeeping", "cleaner", "domestic help", "cook"],
  cook: ["cook", "chef", "kitchen", "domestic help"],
  chef: ["cook", "kitchen", "catering"],
  cooking: ["cook", "chef", "catering"],
  pest: ["pest control", "exterminator"],
  garden: ["gardener", "landscaping", "lawn"],
  laundry: ["laundry", "ironing", "dry clean"],

  // Beauty / wellness
  hair: ["barber", "salon", "stylist", "hairdresser"],
  salon: ["barber", "stylist", "beautician", "spa"],
  makeup: ["beautician", "makeup artist", "salon"],
  beauty: ["beautician", "salon", "spa", "makeup artist"],
  massage: ["massage", "spa", "therapist"],
  spa: ["massage", "beautician", "therapist"],
  barber: ["salon", "hairdresser", "stylist"],

  // Health
  doctor: ["doctor", "physician", "clinic", "nurse"],
  nurse: ["nurse", "caretaker", "medical", "doctor"],
  medical: ["doctor", "nurse", "pharmacy", "clinic"],
  health: ["doctor", "nurse", "physiotherapist", "clinic"],
  physio: ["physiotherapist", "therapist"],
  yoga: ["yoga", "trainer", "fitness"],
  fitness: ["trainer", "gym", "yoga", "coach"],
  gym: ["trainer", "fitness", "coach"],

  // Education
  teach: ["teacher", "tutor", "trainer", "coach"],
  tuition: ["tutor", "teacher", "coach"],
  tutor: ["teacher", "coach", "trainer"],
  math: ["tutor", "teacher"],
  english: ["tutor", "teacher", "translator"],
  music: ["musician", "music teacher", "dj"],
  dance: ["dancer", "dance teacher", "choreographer"],

  // Events
  event: ["event", "catering", "decorator", "photographer", "dj"],
  wedding: ["event", "catering", "decorator", "photographer", "makeup artist", "priest"],
  catering: ["catering", "cook", "chef"],
  decoration: ["decorator", "event", "florist"],
  photo: ["photographer", "videographer", "studio"],
  photography: ["photographer", "videographer", "studio"],
  video: ["videographer", "photographer", "editor"],
  dj: ["dj", "music", "event"],

  // Tech / digital
  computer: ["computer repair", "technician", "it support"],
  laptop: ["computer repair", "technician", "it support"],
  phone: ["mobile repair", "technician"],
  mobile: ["mobile repair", "technician"],
  internet: ["it support", "network", "technician"],
  network: ["it support", "network", "technician"],
  software: ["developer", "programmer", "it"],
  website: ["developer", "web designer", "designer"],
  design: ["designer", "graphic designer", "web designer"],

  // Logistics
  delivery: ["delivery", "courier", "driver"],
  courier: ["delivery", "courier"],
  move: ["packers and movers", "movers", "transport"],
  moving: ["packers and movers", "movers", "transport"],
  shifting: ["packers and movers", "movers", "transport"],
  packers: ["packers and movers", "movers"],
  transport: ["driver", "movers", "courier"],

  // Misc / professional
  tailor: ["tailor", "stitching", "boutique"],
  stitch: ["tailor", "stitching"],
  lawyer: ["lawyer", "advocate", "legal"],
  legal: ["lawyer", "advocate"],
  accountant: ["accountant", "ca", "tax", "bookkeeping"],
  tax: ["accountant", "ca", "tax consultant"],
  security: ["security guard", "bouncer", "watchman"],
  guard: ["security guard", "watchman"],
};

/**
 * Expand a search string into a list of related keywords.
 * The original tokens are always preserved; matched generic keywords
 * additionally contribute their related profession terms.
 */
export function expandSearchTerms(search: string): string[] {
  const base = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (base.length === 0) return [];
  const out = new Set<string>(base);
  for (const word of base) {
    const related = KEYWORD_MAP[word];
    if (related) related.forEach((r) => out.add(r.toLowerCase()));
  }
  return Array.from(out);
}

/**
 * Returns true if the haystack matches the search query, taking
 * keyword expansion into account. A worker matches when:
 *  - every typed word is found in the haystack (strict AND), OR
 *  - any expanded related keyword is found in the haystack (loose OR
 *    for synonym widening).
 */
export function matchesSearch(haystack: string, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;
  const hay = haystack.toLowerCase();
  const typed = q.split(/\s+/).filter(Boolean);
  if (typed.every((w) => hay.includes(w))) return true;
  // Synonym widening: any related keyword hit is enough
  for (const w of typed) {
    const related = KEYWORD_MAP[w];
    if (related && related.some((r) => hay.includes(r.toLowerCase()))) {
      return true;
    }
  }
  return false;
}
