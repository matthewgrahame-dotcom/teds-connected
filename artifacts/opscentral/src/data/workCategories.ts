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
        note:
          "At Ted's Cameras, we believe that every customer interaction is an opportunity to inspire, educate, and build lasting relationships. The FOCUS Sales Framework is a consistent, customer-first approach to retail excellence — a mindset that ensures every customer feels welcomed, understood, and supported. This guide outlines the five key pillars of FOCUS. The detailed pillars document (an embedded attachment on the source page) hasn't been provided yet, so it's not included here.",
      },
    ],
  },
};
