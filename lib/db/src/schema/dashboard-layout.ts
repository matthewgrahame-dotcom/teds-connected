import { integer, pgTable, text } from "drizzle-orm/pg-core";

// Admin-configurable dashboard layout -- which widgets show, which column
// they're in, and their order within that column. widgetKey matches a key
// in the frontend's dashboardWidgetRegistry (components/dashboard/registry.tsx),
// not a component reference -- keeps this table plain data. One row per
// widget; column + sortOrder together fully describe the layout, so the
// whole table is just replaced wholesale on save (see PUT /dashboard-widgets)
// rather than patched piecemeal, since a drag-and-drop reorder naturally
// produces the full new arrangement at once anyway.
export const dashboardWidgetsTable = pgTable("dashboard_widgets", {
  widgetKey: text("widget_key").primaryKey(),
  column: text("column").notNull(), // 'main' | 'sidebar'
  sortOrder: integer("sort_order").notNull().default(0),
});

export type DashboardWidget = typeof dashboardWidgetsTable.$inferSelect;
