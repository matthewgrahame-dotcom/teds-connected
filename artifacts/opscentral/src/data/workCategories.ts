export type PolicyDoc = {
  title: string;
  version?: string;
  href?: string; // omit when we don't actually have the file yet
  note?: string; // shown instead of/alongside a missing file
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
