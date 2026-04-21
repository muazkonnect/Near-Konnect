// Type definitions used by app components. Mock data was removed to reduce bundle size.

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
