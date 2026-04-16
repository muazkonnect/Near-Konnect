export type Language = "en" | "ur" | "ar" | "hi" | "fr" | "de" | "es";

export interface LanguageMeta {
  code: Language;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr", flag: "🇬🇧" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl", flag: "🇵🇰" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr", flag: "🇮🇳" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr", flag: "🇪🇸" },
];

export type TranslationKeys = {
  // Navbar
  "nav.home": string;
  "nav.findWorkers": string;
  "nav.messages": string;
  "nav.dashboard": string;
  "nav.signOut": string;
  "nav.logIn": string;
  "nav.signUp": string;

  // Hero
  "hero.badge": string;
  "hero.title1": string;
  "hero.title2": string;
  "hero.subtitle": string;
  "hero.findWorkers": string;
  "hero.joinAsWorker": string;

  // Features
  "feature.nearby.title": string;
  "feature.nearby.desc": string;
  "feature.verified.title": string;
  "feature.verified.desc": string;
  "feature.ratings.title": string;
  "feature.ratings.desc": string;

  // Sections
  "section.categories": string;
  "section.categoriesSub": string;
  "section.viewAll": string;
  "section.topWorkers": string;
  "section.topWorkersSub": string;
  "section.seeAll": string;

  // CTA
  "cta.title": string;
  "cta.subtitle": string;
  "cta.register": string;

  // Footer
  "footer.tagline": string;
  "footer.language": string;

  // Login
  "login.welcomeBack": string;
  "login.subtitle": string;
  "login.email": string;
  "login.password": string;
  "login.submit": string;
  "login.submitting": string;
  "login.noAccount": string;

  // Register
  "register.title": string;
  "register.subtitle": string;
  "register.fullName": string;
  "register.phone": string;
  "register.email": string;
  "register.password": string;
  "register.city": string;
  "register.profession": string;
  "register.experience": string;
  "register.cnic": string;
  "register.address": string;
  "register.serviceAreas": string;
  "register.submit": string;
  "register.submitting": string;
  "register.hasAccount": string;
  "register.customer": string;
  "register.worker": string;

  // Discover
  "discover.title": string;
  "discover.usingLocation": string;
  "discover.detecting": string;
  "discover.refresh": string;
  "discover.searchPlaceholder": string;
  "discover.distance": string;
  "discover.rating": string;
  "discover.experience": string;
  "discover.workersFound": string;
  "discover.noWorkers": string;

  // Worker Card
  "worker.available": string;
  "worker.busy": string;
  "worker.km": string;
  "worker.yrs": string;

  // Dashboard
  "dashboard.myDashboard": string;
  "dashboard.findWorkers": string;
  "dashboard.messages": string;
  "dashboard.bookings": string;
  "dashboard.reviews": string;
  "dashboard.profile": string;
  "dashboard.editProfile": string;
  "dashboard.fullName": string;
  "dashboard.phone": string;
  "dashboard.city": string;
  "dashboard.save": string;
  "dashboard.saving": string;
  "dashboard.noBookings": string;
  "dashboard.noConversations": string;
  "dashboard.recentChats": string;
  "dashboard.complete": string;
  "dashboard.incomplete": string;

  // Worker Dashboard
  "workerDash.title": string;
  "workerDash.status": string;
  "workerDash.availability": string;
  "workerDash.visibleToCustomers": string;
  "workerDash.hiddenFromSearch": string;
  "workerDash.saveChanges": string;
  "workerDash.updateLocation": string;
  "workerDash.about": string;
  "workerDash.pendingRequests": string;
  "workerDash.upcoming": string;
  "workerDash.accept": string;
  "workerDash.decline": string;
  "workerDash.noBookings": string;
  "workerDash.noConversations": string;
  "workerDash.noReviews": string;
  "workerDash.noWorkerProfile": string;
  "workerDash.registerAsWorker": string;

  // Booking
  "booking.book": string;
  "booking.selectDate": string;
  "booking.pickDate": string;
  "booking.selectTime": string;
  "booking.chooseTime": string;
  "booking.describeService": string;
  "booking.confirm": string;
  "booking.submitting": string;

  // Messages
  "messages.title": string;
  "messages.noConversations": string;

  // Not Found
  "notFound.title": string;
  "notFound.subtitle": string;
  "notFound.returnHome": string;

  // Chatbot
  "chatbot.assistant": string;
  "chatbot.poweredBy": string;
  "chatbot.describeProblem": string;
  "chatbot.noPreviousChats": string;
};
