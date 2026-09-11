export type PolicyDoc = {
  title: string;
  version?: string;
  href?: string; // omit when we don't actually have the file yet
  note?: string; // shown instead of/alongside a missing file
  section?: string; // groups docs under a heading when a category has many
};

export type WorkCategory = {
  slug: string;
  title: string;
  docs: PolicyDoc[];
};

// TODO: the real platform has a proper "Policies" feature with per-role
// accessibility rules (Accessible / Required Reading / Notify Users --
// confirmed via policy_permissions exports covering Admin, Store Manager,
// Employee Office/Store, etc). Not built here -- this is a plain doc list.
export const workCategories: Record<string, WorkCategory> = {
  welcome: {
    slug: 'welcome',
    title: "Welcome to Ted's",
    docs: [{ title: "Code of Conduct Ted's Cameras", version: 'Version 1', href: '/documents/code-of-conduct.pdf' }],
  },
  'customer-experience': {
    slug: 'customer-experience',
    title: 'Customer Experience',
    docs: [
      {
        title: 'F.O.C.U.S. Sales Framework',
        version: 'Version 1.2',
        href: '/documents/focus-sales-framework.pdf',
        note:
          "At Ted's Cameras, we believe that every customer interaction is an opportunity to inspire, educate, and build lasting relationships — a consistent, customer-first approach built on five pillars: First Impressions, Open-Ended Questions, Customised Solutions, Upsell With Value, and Secure Satisfaction.",
      },
    ],
  },
  'hr-handbook': {
    slug: 'hr-handbook',
    title: 'HR Handbook',
    docs: [
      { title: 'Acceptable Workplace Behaviour Policy & Procedure', href: '/documents/hr/hr-acceptable-workplace-behaviour-policy-procedure.pdf', section: '1.0 Team Support Policies' },
      { title: 'Drug and Alcohol Policy & Procedure', href: '/documents/hr/hr-drug-and-alcohol-policy-procedure.pdf', section: '1.0 Team Support Policies' },
      { title: 'Smoke Free Policy', href: '/documents/hr/hr-smoke-free-policy.pdf', section: '1.0 Team Support Policies' },
      { title: 'Electronic Communication Policy & Procedure', href: '/documents/hr/hr-electronic-communication-policy-procedure.pdf', section: '1.0 Team Support Policies' },
      { title: 'Social Media Policy', href: '/documents/hr/hr-social-media-policy.pdf', section: '1.0 Team Support Policies' },
      { title: 'Leave Policy', href: '/documents/hr/hr-leave-policy.pdf', section: '1.0 Team Support Policies' },
      { title: 'Code of Conduct', href: '/documents/hr/hr-code-of-conduct.pdf', section: '1.0 Team Support Policies' },
      { title: "Code of Conduct Cover Letter - Ted's Staff", href: '/documents/hr/hr-code-of-conduct-cover-letter.pdf', section: '1.0 Team Support Policies' },
      { title: 'Work Health & Safety Policy', href: '/documents/hr/hr-work-health-safety-policy.pdf', section: '2.0 WHS Policies and Procedures' },
      { title: 'WHS Induction & Training Procedure', href: '/documents/hr/hr-whs-induction-training-procedure.pdf', section: '2.0 WHS Policies and Procedures' },
      { title: 'Incident & Emergency Management Procedure', href: '/documents/hr/hr-incident-emergency-management-procedure.pdf', section: '2.0 WHS Policies and Procedures' },
      { title: 'Work Health & Safety Consultation Procedure', href: '/documents/hr/hr-work-health-safety-consultation-procedure.pdf', section: '2.0 WHS Policies and Procedures' },
      { title: 'Return to Work Policy', href: '/documents/hr/hr-return-to-work-policy.pdf', section: '2.0 WHS Policies and Procedures' },
      { title: 'Police Check Consent Form', href: '/documents/hr/hr-police-check-consent-form.pdf', section: '3.0 Recruitment' },
      { title: 'Superannuation Choice Form', href: '/documents/hr/hr-superannuation-choice-form.pdf', section: '3.0 Recruitment' },
      { title: 'Recruitment & Selection Procedure', href: '/documents/hr/hr-recruitment-selection-procedure.pdf', section: '3.0 Recruitment' },
      { title: 'Application for Employment with Police Check Consent Form', href: '/documents/hr/hr-application-for-employment.pdf', section: '3.0 Recruitment' },
      { title: "Ted's Emplive and ADP New Starter Info", href: '/documents/hr/hr-teds-emplive-and-adp-new-starter-info.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Existing', href: '/documents/hr/hr-welcome-letter-existing.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Christmas (needs editing in source)', href: '/documents/hr/hr-welcome-letter-christmas-needs-editing.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Employee Store (needs editing in source)', href: '/documents/hr/hr-welcome-letter-employee-store-needs-editing.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Assistant Manager (needs editing in source)', href: '/documents/hr/hr-welcome-letter-assistant-manager-needs-editing.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Store Manager (needs editing in source)', href: '/documents/hr/hr-welcome-letter-store-manager-needs-editing.pdf', section: '4.0 Onboarding' },
      { title: 'Welcome Letter - Employee Office (needs editing in source)', href: '/documents/hr/hr-welcome-letter-employee-office-needs-editing.pdf', section: '4.0 Onboarding' },
      { title: 'Code of Conduct Letter', href: '/documents/hr/hr-code-of-conduct-letter.pdf', section: '4.0 Onboarding' },
      { title: 'Break Obligations', href: '/documents/hr/hr-break-obligations.pdf', section: '5.0 General Retail Industry Award 2020' },
    ],
  },
  'current-campaigns': {
    slug: 'current-campaigns',
    title: 'Current Campaigns',
    docs: [{ title: "Ted's Cameras — Current Sales & Offers", href: 'https://www.teds.com.au/pages/sales' }],
  },
  'operations': {
    slug: 'operations',
    title: 'Operations',
    docs: [
      { title: 'Brand Separation Policy - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/brand-separation-policy.pdf' },
      { title: 'Cash Handling Policy and Procedure - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/cash-handling-policy.pdf' },
      { title: 'Digital Camera Warehouse Who to Contact List', version: 'Version 1' },
      { title: 'Dress Code Policy - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1' },
      { title: 'Film Development Processing (SOP) - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/film-development-sop.pdf' },
      { title: 'Loss Prevention Policy and Procedure - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/loss-prevention-policy.pdf' },
      { title: "Manual Credit Card Payment Policy - Ted's Cameras & Digital Camera Warehouse", version: 'Version 1', href: '/documents/manual-credit-card-payment-policy.pdf' },
      { title: 'Privacy and Customer Data Policy - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/privacy-customer-data-policy.pdf' },
      { title: 'Risk Management Procedure - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1' },
      { title: 'Sales Procedures Policy and Procedures - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/sales-procedures-policy.pdf' },
      { title: 'Staff Purchasing Policy - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1', href: '/documents/staff-purchasing-policy.pdf' },
      { title: "Ted's Camera's Group Phone Listing", version: 'Version 1.1', href: '/documents/teds-group-phone-listing.pdf' },
      { title: "Ted's Camera's Store Contacts", version: 'Version 2.3', href: '/documents/teds-store-contacts.pdf' },
      { title: "Ted's Cameras and DCW Price Match Policy", version: 'Version 1', href: '/documents/dcw-price-match-policy.pdf' },
      { title: "Ted's Cameras Who to Contact List", version: 'Version 1.1', href: '/documents/teds-who-to-contact-list.pdf' },
      { title: 'Telephone Policy - Ted\u2019s Cameras and Digital Camera Warehouse', version: 'Version 1.1', href: '/documents/telephone-policy.pdf' },
    ],
  },
};
