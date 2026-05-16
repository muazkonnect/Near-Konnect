// Curated top expertise per category / sub-category
const MAP: Record<string, string[]> = {
  // Main categories
  "electrical": ["Wiring", "Smart Home", "EV Chargers", "Solar Grid", "Lighting", "Panels", "Inverters"],
  "plumbing": ["Leak Repair", "Pipe Fitting", "Drainage", "Water Heater", "Bathroom Fitting", "Sewer Lines"],
  "carpentry": ["Furniture", "Cabinetry", "Doors", "Flooring", "Custom Builds", "Repairs"],
  "painting": ["Interior", "Exterior", "Texture", "Waterproof", "Wallpaper", "Spray Finish"],
  "cleaning": ["Deep Clean", "Carpet", "Sofa", "Kitchen", "Bathroom", "Move-in/out"],
  "ac technician": ["Installation", "Gas Refill", "Servicing", "Inverter AC", "Repair", "Cooling"],
  "mason": ["Brickwork", "Tiling", "Plaster", "Concrete", "Stonework", "Repairs"],
  "mechanic": ["Engine", "Brakes", "Transmission", "Electrical", "Diagnostics", "Tuning"],
  // Sub categories
  "residential": ["Smart Home", "Wiring", "Lighting", "Safety Audit", "EV Chargers"],
  "commercial": ["Heavy Load", "Distribution", "3-Phase", "Backup Power", "Compliance"],
  "industrial": ["Motors", "PLC", "Switchgear", "Power Quality", "Maintenance"],
};

const FALLBACK = ["On-Site Service", "Quality Work", "Quick Response", "Fair Pricing", "Warranty"];

export function getExpertise(mainCategory?: string, subCategory?: string, extras: string[] = [], limit = 5): string[] {
  const m = (mainCategory || "").toLowerCase().trim();
  const s = (subCategory || "").toLowerCase().trim();
  const out: string[] = [];
  const push = (arr: string[]) => arr.forEach((x) => { if (x && !out.find(o => o.toLowerCase() === x.toLowerCase())) out.push(x); });
  if (MAP[s]) push(MAP[s]);
  if (MAP[m]) push(MAP[m]);
  push(extras);
  push(FALLBACK);
  return out.slice(0, limit);
}
