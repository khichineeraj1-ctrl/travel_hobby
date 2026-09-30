import type { OriginCity } from '@/lib/types';

// Starting points. Slug is used in SEO URLs like /from/delhi
export const cities: OriginCity[] = [
  { slug: 'delhi', name: 'Delhi', lat: 28.6139, lng: 77.209, hasAirport: true },
  { slug: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777, hasAirport: true },
  { slug: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, hasAirport: true },
  { slug: 'kolkata', name: 'Kolkata', lat: 22.5726, lng: 88.3639, hasAirport: true },
  { slug: 'chennai', name: 'Chennai', lat: 13.0827, lng: 80.2707, hasAirport: true },
  { slug: 'hyderabad', name: 'Hyderabad', lat: 17.385, lng: 78.4867, hasAirport: true },
  { slug: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567, hasAirport: true },
  { slug: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, hasAirport: true },
  { slug: 'jaipur', name: 'Jaipur', lat: 26.9124, lng: 75.7873, hasAirport: true },
  { slug: 'chandigarh', name: 'Chandigarh', lat: 30.7333, lng: 76.7794, hasAirport: true },
  { slug: 'lucknow', name: 'Lucknow', lat: 26.8467, lng: 80.9462, hasAirport: true },
  { slug: 'guwahati', name: 'Guwahati', lat: 26.1445, lng: 91.7362, hasAirport: true },
  { slug: 'indore', name: 'Indore', lat: 22.7196, lng: 75.8577, hasAirport: true },
  { slug: 'kochi', name: 'Kochi', lat: 9.9312, lng: 76.2673, hasAirport: true },
  { slug: 'dehradun', name: 'Dehradun', lat: 30.3165, lng: 78.0322, hasAirport: true },
  { slug: 'gurugram', name: 'Gurugram', lat: 28.4595, lng: 77.0266, hasAirport: false },
  { slug: 'noida', name: 'Noida', lat: 28.5355, lng: 77.391, hasAirport: false },
];

