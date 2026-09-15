import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(__dirname, "../../.env"));

const { db, formsTable, formCategoriesTable, formCategoryLinksTable } = await import("@workspace/db");
const { eq, inArray } = await import("drizzle-orm");

const categories = await db.select().from(formCategoriesTable);
console.log(`\n${categories.length} categor${categories.length === 1 ? "y" : "ies"} exist:`);
console.log(categories);

const forms = await db.select({ id: formsTable.id, title: formsTable.title }).from(formsTable);
const links = forms.length ? await db.select().from(formCategoryLinksTable).where(inArray(formCategoryLinksTable.formId, forms.map((f) => f.id))) : [];
const categorizedFormIds = new Set(links.map((l) => l.formId));
const uncategorized = forms.filter((f) => !categorizedFormIds.has(f.id));
console.log(`\n${forms.length} total forms, ${uncategorized.length} with no category assigned (categories are now many-to-many via form_category_links).`);

process.exit(0);