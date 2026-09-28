/**
 * Seed content.
 *
 * Sources, in order of precedence:
 *   1. Explicit updates from the owner in the build brief (City Bank since
 *      Aug 2026; IDLC ended Aug 2026 — the CV's "Present" for IDLC is outdated).
 *   2. CV facts reproduced in the brief (education, CGPA, projects, the
 *      ICASDS poster, certificates, IDLC responsibilities).
 *
 * Nothing here is invented: unknown dates, metrics, credential IDs,
 * verification URLs, supervisors, abstracts and findings are left empty so the
 * owner can complete them in the admin. Copy is written in the first person
 * and restates only the facts above.
 */

export const PROFILE = {
  fullName: "Ibrahim All-Mamun",
  headline: "Data Scientist",
  statement:
    "I use statistics, machine learning and clear reporting to help lenders understand small-business credit.",
  intro: [
    "I'm a data scientist in the Transformation and Analytics team for Credit – Small Business at City Bank PLC, which I joined in August 2026.",
    "",
    "Before that I was a data analyst in SME Products and Business Management at IDLC Finance PLC, where I worked on Azure SQL reporting pipelines and R Shiny dashboards, carried out SME financial monitoring and contributed to the Credit Risk Grading model.",
  ].join("\n"),
  bio: [
    "I'm a data scientist working on small-business credit at City Bank PLC, in the Transformation and Analytics team for Credit – Small Business. I joined in August 2026.",
    "",
    "My background is in applied statistics. I studied at the University of Dhaka, first for a B.S. in Applied Statistics (2020–2024) and then for an M.S. in Applied Statistics and Data Science (2024–2025).",
    "",
    "Until August 2026 I worked as a data analyst in SME Products and Business Management at IDLC Finance PLC. The work sat between data engineering, reporting and credit analysis:",
    "",
    "- reporting pipelines in Azure SQL and dashboards in R Shiny, including the development of a dynamic litigation dashboard;",
    "- SME financial monitoring and portfolio behaviour analysis;",
    "- MOD movement tracking;",
    "- contributions to the Credit Risk Grading model.",
    "",
    "My academic research has taken two directions. For my M.S. project I used LSTM and GRU recurrent neural networks to predict flood events in Bangladesh, and presented the work as a poster at the 3rd International Conference on Applied Statistics and Data Science (ICASDS) in Dhaka in December 2025. For my B.S. project I built a covariate-dependent Markov model of internal migration to urban areas in Bangladesh.",
  ].join("\n"),
  researchInterests:
    "My research so far has used recurrent neural networks (LSTM and GRU) to predict flood events in Bangladesh, and covariate-dependent Markov models to study internal migration to urban areas.",
  location: "Gulshan, Dhaka, Bangladesh",
  email: "mimamun@isrt.ac.bd",
} as const;

export const SOCIAL_LINKS = [
  {
    platform: "github",
    label: "GitHub",
    url: "https://github.com/IbrahimAllMamun",
    handle: "IbrahimAllMamun",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/mimamun",
    handle: "mimamun",
  },
  {
    platform: "email",
    label: "Email",
    url: "mailto:mimamun@isrt.ac.bd",
    handle: "mimamun@isrt.ac.bd",
  },
] as const;

export const SITE_SETTINGS = {
  siteName: "Ibrahim All-Mamun",
  siteDescription:
    "Ibrahim All-Mamun is a data scientist working on small-business credit at City Bank PLC. Projects, research and experience in statistics, machine learning and analytics.",
  contactNotificationEmail: "mimamun@isrt.ac.bd",
  githubUsername: "IbrahimAllMamun",
} as const;

/** Header navigation. Writing and Publications stay hidden until they have content. */
export const NAVIGATION = [
  { location: "header", label: "Projects", href: "/projects", isVisible: true },
  { location: "header", label: "Research", href: "/research", isVisible: true },
  { location: "header", label: "Experience", href: "/experience", isVisible: true },
  { location: "header", label: "About", href: "/about", isVisible: true },
  { location: "header", label: "Writing", href: "/blog", isVisible: false },
  { location: "header", label: "Contact", href: "/contact", isVisible: true },
  { location: "footer", label: "Certifications", href: "/certifications", isVisible: true },
  { location: "footer", label: "Publications", href: "/publications", isVisible: false },
  { location: "footer", label: "Writing", href: "/blog", isVisible: false },
  { location: "footer", label: "Search", href: "/search", isVisible: true },
] as const;

export const ROUTE_SEO: Record<string, { title: string | null; description: string }> = {
  home: {
    title: null,
    description: SITE_SETTINGS.siteDescription,
  },
  about: {
    title: "About",
    description:
      "Background, education and toolkit of Ibrahim All-Mamun, an applied statistician working as a data scientist in small-business credit.",
  },
  experience: {
    title: "Experience",
    description:
      "Data Scientist at City Bank PLC (Credit – Small Business) since August 2026; previously Data Analyst at IDLC Finance PLC.",
  },
  projects: {
    title: "Projects",
    description:
      "Case studies in statistics, machine learning and analytics, from problem and data to model, evaluation and impact.",
  },
  research: {
    title: "Research",
    description:
      "Research by Ibrahim All-Mamun: flood event prediction with LSTM and GRU networks, and a covariate-dependent Markov model of internal migration in Bangladesh.",
  },
  publications: { title: "Publications", description: "Publications by Ibrahim All-Mamun." },
  certifications: {
    title: "Certifications",
    description:
      "Certificates and courses completed by Ibrahim All-Mamun, grouped by provider and programme.",
  },
  blog: { title: "Writing", description: "Notes on statistics, data science and analytics." },
  contact: {
    title: "Contact",
    description:
      "Get in touch with Ibrahim All-Mamun about data science roles, research or collaboration.",
  },
  search: { title: "Search", description: "Search projects, research, publications and writing." },
};

export const FOCUS_AREAS = [
  {
    title: "Credit and portfolio analytics",
    description:
      "Monitoring small-business lending: financial monitoring, portfolio behaviour and credit risk grading.",
    evidence:
      "IDLC Finance: SME financial monitoring, portfolio behaviour analysis, MOD movement tracking and the Credit Risk Grading model.",
  },
  {
    title: "Statistical modeling",
    description:
      "Choosing a model that matches how the data were generated, then checking it before trusting it.",
    evidence:
      "B.S. project: a covariate-dependent Markov model of internal migration in Bangladesh.",
  },
  {
    title: "Machine learning for sequential data",
    description: "Recurrent neural networks for problems where order and history matter.",
    evidence:
      "M.S. project: flood event prediction with LSTM and GRU networks, presented at ICASDS, December 2025.",
  },
  {
    title: "Reporting and decision tools",
    description: "Pipelines and dashboards that put analysis in front of the people who act on it.",
    evidence:
      "IDLC Finance: Azure SQL reporting pipelines and R Shiny dashboards, including the development of a dynamic litigation dashboard.",
  },
] as const;

export const APPROACH_STEPS = [
  {
    title: "Statistics",
    description: "Start from the question and the uncertainty around it.",
    evidence:
      "B.S. Applied Statistics and M.S. Applied Statistics and Data Science, University of Dhaka.",
  },
  {
    title: "Data",
    description: "Make the data dependable before modeling it.",
    evidence: "Azure SQL reporting pipelines at IDLC Finance.",
  },
  {
    title: "Modeling",
    description: "Match the model to the process behind the data.",
    evidence: "Markov models (B.S.), LSTM and GRU networks (M.S.), Credit Risk Grading (IDLC).",
  },
  {
    title: "Analytics",
    description: "Turn model output into monitoring that people can act on.",
    evidence: "SME portfolio monitoring and R Shiny dashboards.",
  },
  {
    title: "Research",
    description: "Write the work up and put it in front of peers.",
    evidence: "Poster at the 3rd ICASDS, Dhaka, December 2025.",
  },
  {
    title: "Business impact",
    description: "Better-informed lending decisions for small businesses.",
    evidence: "Credit – Small Business, City Bank PLC.",
  },
] as const;

export const EXPERIENCES = [
  {
    company: "City Bank PLC",
    companyUrl: null,
    position: "Data Scientist",
    department: "Transformation and Analytics · Credit – Small Business",
    startDate: "2026-08-01",
    endDate: null,
    isCurrent: true,
    summary:
      "Data science for the bank's small-business credit, in the Transformation and Analytics team for Credit – Small Business.",
    responsibilities: [] as string[],
    technologies: [] as string[],
    domains: ["Small-business credit"],
    featured: true,
    displayOrder: 0,
  },
  {
    company: "IDLC Finance PLC",
    companyUrl: null,
    position: "Data Analyst",
    department: "Products and Business Management · SME",
    // Start date is not in the source material; the owner can add it in the admin.
    startDate: null,
    endDate: "2026-08-01",
    isCurrent: false,
    summary:
      "Analytics for IDLC's SME business: reporting pipelines, dashboards, portfolio monitoring and credit risk grading.",
    responsibilities: [
      "Developed a dynamic litigation dashboard.",
      "Worked on reporting pipelines in Azure SQL.",
      "Worked on dashboards in R Shiny.",
      "Carried out SME financial monitoring.",
      "Analysed portfolio behaviour.",
      "Tracked MOD movement.",
      "Contributed to the Credit Risk Grading model.",
    ],
    technologies: ["R", "Shiny", "Azure SQL"],
    domains: ["SME finance", "Credit risk", "Portfolio monitoring"],
    featured: true,
    displayOrder: 1,
  },
] as const;

export const EDUCATION = [
  {
    key: "ms",
    institution: "University of Dhaka",
    degree: "M.S.",
    fieldOfStudy: "Applied Statistics and Data Science",
    location: "Dhaka, Bangladesh",
    startDate: "2024-09-01",
    endDate: "2025-12-01",
    gradeLabel: "CGPA",
    gradeValue: 3.5,
    gradeScale: 4,
    projectTitle:
      "Flood Event Prediction in Bangladesh: A Data-Driven Approach Using LSTM and GRU-Based Recurrent Neural Networks",
    displayOrder: 0,
  },
  {
    key: "bs",
    institution: "University of Dhaka",
    degree: "B.S.",
    fieldOfStudy: "Applied Statistics",
    location: "Dhaka, Bangladesh",
    startDate: "2020-01-01",
    endDate: "2024-09-01",
    gradeLabel: "CGPA",
    gradeValue: 3.59,
    gradeScale: 4,
    projectTitle:
      "A Covariate-Dependent Markov Model for Internal Migration to Urban Areas in Bangladesh",
    displayOrder: 1,
  },
] as const;

export const RESEARCH = [
  {
    educationKey: "ms",
    slug: "flood-event-prediction-bangladesh-lstm-gru",
    title:
      "Flood Event Prediction in Bangladesh: A Data-Driven Approach Using LSTM and GRU-Based Recurrent Neural Networks",
    kind: "academic_project",
    summary:
      "M.S. project applying LSTM and GRU recurrent neural networks to predict flood events in Bangladesh. Presented as a poster at ICASDS in December 2025.",
    keywords: ["Flood events", "Bangladesh", "Recurrent neural networks"],
    methods: ["LSTM", "GRU", "Recurrent neural networks"],
    degree: "M.S. in Applied Statistics and Data Science",
    institution: "University of Dhaka",
    featured: true,
    displayOrder: 0,
  },
  {
    educationKey: "bs",
    slug: "covariate-dependent-markov-model-internal-migration",
    title: "A Covariate-Dependent Markov Model for Internal Migration to Urban Areas in Bangladesh",
    kind: "academic_project",
    summary:
      "B.S. project modeling internal migration to urban areas in Bangladesh with a covariate-dependent Markov model.",
    keywords: ["Internal migration", "Urbanisation", "Bangladesh"],
    methods: ["Markov model", "Covariate-dependent Markov model"],
    degree: "B.S. in Applied Statistics",
    institution: "University of Dhaka",
    featured: true,
    displayOrder: 1,
  },
] as const;

export const PRESENTATIONS = [
  {
    researchSlug: "flood-event-prediction-bangladesh-lstm-gru",
    title:
      "Flood Event Prediction in Bangladesh: A Data-Driven Approach Using LSTM and GRU-Based Recurrent Neural Networks",
    conferenceName: "International Conference on Applied Statistics and Data Science",
    conferenceShortName: "ICASDS",
    edition: "3rd",
    location: "Dhaka, Bangladesh",
    presentedOn: "2025-12-01",
    presentationType: "poster",
  },
] as const;

export const PROJECT_CATEGORIES = [
  { name: "Machine learning", slug: "machine-learning", displayOrder: 0 },
  { name: "Statistical modeling", slug: "statistical-modeling", displayOrder: 1 },
  { name: "Analytics and dashboards", slug: "analytics-and-dashboards", displayOrder: 2 },
] as const;

export const PROJECTS = [
  {
    slug: "flood-event-prediction-bangladesh",
    title: "Flood event prediction in Bangladesh",
    summary:
      "Predicting flood events in Bangladesh with LSTM and GRU recurrent neural networks. My M.S. project, presented as a poster at ICASDS 2025.",
    type: "research",
    categorySlug: "machine-learning",
    organization: "University of Dhaka",
    technologies: [] as string[],
    tags: ["Recurrent neural networks", "Flood prediction"],
    overview:
      "My M.S. project in Applied Statistics and Data Science at the University of Dhaka. It applies LSTM and GRU recurrent neural networks, model families designed for sequential data, to the prediction of flood events in Bangladesh.\n\nI presented the work as a poster at the 3rd International Conference on Applied Statistics and Data Science (ICASDS) in Dhaka in December 2025.",
    researchSlug: "flood-event-prediction-bangladesh-lstm-gru",
    featured: true,
    displayOrder: 0,
  },
  {
    slug: "internal-migration-markov-model",
    title: "Internal migration to urban areas in Bangladesh",
    summary:
      "A covariate-dependent Markov model of internal migration to urban areas in Bangladesh. My B.S. project in Applied Statistics.",
    type: "research",
    categorySlug: "statistical-modeling",
    organization: "University of Dhaka",
    technologies: [] as string[],
    tags: ["Markov models", "Migration"],
    overview:
      "My B.S. project in Applied Statistics at the University of Dhaka. It models internal migration to urban areas in Bangladesh with a covariate-dependent Markov model, a Markov model whose transition probabilities depend on covariates.",
    researchSlug: "covariate-dependent-markov-model-internal-migration",
    featured: true,
    displayOrder: 1,
  },
] as const;

/**
 * Skill hierarchy as listed by the owner in the build brief. Levels and years
 * are intentionally not set: they are unknown, and levels are never shown as
 * percentages.
 */
export const SKILL_TREE: { name: string; slug: string; skills: string[] }[] = [
  { name: "Programming", slug: "programming", skills: ["Python", "R", "SQL"] },
  {
    name: "Data Science",
    slug: "data-science",
    skills: ["Data Analysis", "Feature Engineering", "Predictive Modeling", "Machine Learning"],
  },
  {
    name: "Statistics",
    slug: "statistics",
    skills: [
      "Statistical Analysis",
      "Multivariate Analysis",
      "Causal Inference",
      "Time Series Analysis",
      "A/B Testing",
    ],
  },
  { name: "Machine Learning", slug: "machine-learning", skills: ["Classical ML", "Deep Learning"] },
  {
    name: "Visualization & BI",
    slug: "visualization-and-bi",
    skills: ["Power BI", "Tableau", "ggplot2", "Plotly", "Shiny"],
  },
  {
    name: "Databases",
    slug: "databases",
    skills: ["PostgreSQL", "MySQL", "BigQuery", "Azure SQL"],
  },
  {
    name: "Web Development",
    slug: "web-development",
    skills: ["Django", "Shiny", "Web technologies"],
  },
  {
    name: "DevOps / Tools",
    slug: "devops-and-tools",
    skills: ["Docker", "Git", "VS Code", "Jupyter"],
  },
];

export const SKILL_ICONS: Record<string, string> = {
  Python: "code",
  R: "code",
  SQL: "database",
  "Data Analysis": "table",
  "Feature Engineering": "layers",
  "Predictive Modeling": "chart",
  "Machine Learning": "brain",
  "Statistical Analysis": "sigma",
  "Multivariate Analysis": "sigma",
  "Causal Inference": "sigma",
  "Time Series Analysis": "chart",
  "A/B Testing": "flask",
  "Classical ML": "brain",
  "Deep Learning": "brain",
  "Power BI": "chart",
  Tableau: "chart",
  ggplot2: "chart",
  Plotly: "chart",
  Shiny: "globe",
  PostgreSQL: "database",
  MySQL: "database",
  BigQuery: "database",
  "Azure SQL": "database",
  Django: "globe",
  "Web technologies": "globe",
  Docker: "container",
  Git: "git",
  "VS Code": "terminal",
  Jupyter: "notebook",
};

/** Skill ↔ project links that follow directly from the project titles. */
export const SKILL_PROJECT_LINKS: { category: string; skill: string; project: string }[] = [
  {
    category: "machine-learning",
    skill: "deep-learning",
    project: "flood-event-prediction-bangladesh",
  },
  {
    category: "data-science",
    skill: "machine-learning",
    project: "flood-event-prediction-bangladesh",
  },
  {
    category: "statistics",
    skill: "statistical-analysis",
    project: "internal-migration-markov-model",
  },
];

export const CREDENTIAL_TYPES = [
  "Professional Certificate",
  "Specialization",
  "Program",
  "Track",
  "Skill Track",
  "Course",
  "Module",
  "Certification",
  "Certificate",
  "Workshop",
];

export const CREDENTIAL_PROVIDERS = [
  { name: "Coursera", slug: "coursera", websiteUrl: "https://www.coursera.org", displayOrder: 0 },
  { name: "DataCamp", slug: "datacamp", websiteUrl: "https://www.datacamp.com", displayOrder: 1 },
  { name: "IEEE-CS SBC DU", slug: "ieee-cs-sbc-du", websiteUrl: null, displayOrder: 2 },
] as const;

/** Certificates listed in the CV. No IDs, dates or verification URLs are known. */
export const CREDENTIALS = [
  {
    provider: "coursera",
    type: "Certificate",
    title: "Google Data Analytics",
    skill: ["data-science", "data-analysis"],
  },
  {
    provider: "datacamp",
    type: "Certificate",
    title: "Shiny Fundamentals in R",
    skill: ["visualization-and-bi", "shiny"],
  },
  {
    provider: "datacamp",
    type: "Certificate",
    title: "SQL Fundamentals",
    skill: ["programming", "sql"],
  },
  {
    provider: "datacamp",
    type: "Certificate",
    title: "Python Data Fundamentals",
    skill: ["programming", "python"],
  },
  {
    provider: "datacamp",
    type: "Certificate",
    title: "R Programming Fundamentals",
    skill: ["programming", "r"],
  },
  {
    provider: "ieee-cs-sbc-du",
    type: "Workshop",
    title: "Workshop on Introduction to Large Language Models",
    skill: null,
  },
] as const;
