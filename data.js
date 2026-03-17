// ── Constants from published research ───────────────────────────────────
// All numbers below are cited from specific studies. See Methodology section.

const ANTHROPIC = {
  coverage: {
    computerMath: { theoretical: 94, actual: 33 },
    officeAdmin: { theoretical: 90 },
    management: { theoretical: 91.3 },
    legal: { theoretical: 89 },
    archEngineering: { theoretical: 84.8 },
    artMedia: { theoretical: 83.7 },
  },
  employment: {
    perTenPointsCoverageIncrease: -0.6, // pp decline per 10pp coverage
  },
  demographics: {
    femalePpHigher: 16,
    whitePpHigher: 11,
    earningsGapPct: 47,
    gradDegreeExposed: 17.4,
    gradDegreeUnexposed: 4.5,
    zeroExposureWorkers: 30,
  },
  laborMarket: {
    unemploymentBaseline: 3,
    noSystematicIncrease: true,
    youngWorkerDecline: 14,       // % decline in job-finding rate
    youngWorkerEmploymentDrop: 16, // % fall in employment age 22-25
    youngWorkerAgeRange: "22-25",
  },
};

// PwC 2025 Global AI Jobs Barometer (1B+ job postings, 6 continents)
const PWC = {
  wagePremium: 56,              // % premium for AI-skilled roles (up from 25% in 2023)
  productivityGrowthExposed: 27,// % in most AI-exposed industries (2018-2024)
  productivityGrowthUnexposed: 9,// % in least AI-exposed industries
  jobGrowthLowExposure: 65,     // % job growth 2019-2024
  jobGrowthHighExposure: 38,    // % job growth 2019-2024
  aiJobPostingsGrowth: 7.5,     // % YoY growth in AI-requiring postings
  totalPostingsDecline: -11.3,  // % total postings declined
  skillsChangeRate: 66,         // % faster skill change in AI-exposed roles
  degreeRequirementDropAugmented: 7,  // pp drop in degree requirements
  degreeRequirementDropAutomated: 9,  // pp drop
};

// Empirical productivity studies (specific experiments)
const PRODUCTIVITY_STUDIES = {
  noyZhang: { n: 453, timeSaved: 40, qualityGain: 18, note: "Professionals, ChatGPT" },
  brynjolfsson: { n: 5172, avgGain: 15, bottomQuintileGain: 36, note: "Customer support agents" },
  peng: { timeSaved: 55.8, note: "GitHub Copilot, software developers" },
  cui: { n: 5000, weeklyTaskIncrease: 26.08, note: "Developers, field experiments" },
  schwarcz: { timeSaved: "50-130", note: "Law students, complex legal tasks" },
  choi: { n: 277, weeklyGain: 18, note: "Accountants" },
};

// St. Louis Fed (Nov 2024 survey)
const STLFED = {
  avgTimeSaved: 5.4,            // % of work hours for AI users
  hoursPerWeek: 2.2,            // hours saved per 40hr week
  aggregateProductivity: 1.4,   // % total hours saved (all workers incl non-users)
  duringUseProductivity: 33,    // % more productive during AI use
  computerMathUsage: 12,        // % of work hours using AI
  computerMathTimeSaved: 2.5,   // % time saved
  personalServiceUsage: 1.3,    // % of work hours using AI
  personalServiceTimeSaved: 0.4,// % time saved
};

// BLS 2024-2034 projections
const BLS = {
  totalNewJobs: 5200000,
  totalGrowthPct: 3.1,
  computerMathGrowth: 10.1,     // %
  trainingSpecialistGrowth: 10.8,// %
};

// Education ordering
const EDU_ORDER = [
  "No formal educational credential",
  "High school diploma or equivalent",
  "Postsecondary nondegree award",
  "Some college, no degree",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral or professional degree"
];
const EDU_SHORT = {
  "No formal educational credential": "No Formal Credential",
  "High school diploma or equivalent": "High School / GED",
  "Postsecondary nondegree award": "Certificate",
  "Some college, no degree": "Some College",
  "See How to Become One": "Varies",
  "Associate's degree": "Associate's",
  "Bachelor's degree": "Bachelor's",
  "Master's degree": "Master's",
  "Doctoral or professional degree": "Doctoral / Professional"
};

// Category display names
const CAT_NAMES = {
  "healthcare": "Healthcare",
  "office-and-administrative-support": "Office & Admin",
  "transportation-and-material-moving": "Transportation",
  "management": "Management",
  "food-preparation-and-serving": "Food Service",
  "sales": "Sales",
  "business-and-financial": "Business & Finance",
  "education-training-and-library": "Education",
  "construction-and-extraction": "Construction",
  "production": "Production",
  "installation-maintenance-and-repair": "Maintenance & Repair",
  "computer-and-information-technology": "Computer & IT",
  "building-and-grounds-cleaning": "Cleaning & Grounds",
  "personal-care-and-service": "Personal Care",
  "protective-service": "Protective Service",
  "community-and-social-service": "Community & Social",
  "architecture-and-engineering": "Architecture & Eng.",
  "legal": "Legal",
  "media-and-communication": "Media & Communication",
  "life-physical-and-social-science": "Science",
  "farming-fishing-and-forestry": "Farming & Forestry",
  "entertainment-and-sports": "Entertainment",
  "arts-and-design": "Arts & Design",
  "math": "Math & Data Science",
  "military": "Military",
};
