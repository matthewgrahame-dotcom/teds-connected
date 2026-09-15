import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(__dirname, "../../.env"));

const { db, formsTable, formCategoriesTable } = await import("@workspace/db");

const categories = await db.select().from(formCategoriesTable);
console.log(`\n${categories.length} categor${categories.length === 1 ? "y" : "ies"} exist:`);
console.log(categories);

const forms = await db.select({ id: formsTable.id, title: formsTable.title, categoryId: formsTable.categoryId }).from(formsTable);
const uncategorized = forms.filter((f) => f.categoryId === null);
console.log(`\n${forms.length} total forms, ${uncategorized.length} with no category assigned.`);

process.exit(0);