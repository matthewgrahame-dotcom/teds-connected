import { Router, type IRouter } from "express";
import {
  CreateWorkItemBody,
  GetDashboardSummaryResponse,
  GetWorkItemParams,
  GetWorkItemResponse,
  ListActivityResponse,
  ListWorkItemsQueryParams,
  ListWorkItemsResponse,
  UpdateWorkItemBody,
  UpdateWorkItemParams,
} from "@workspace/api-zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, activityEventsTable, workItemsTable } from "@workspace/db";

const router: IRouter = Router();

const toDateOnly = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : null;

const recordActivity = async (event: {
  type: string;
  title: string;
  description: string;
  workItemId?: number | null;
}) => {
  await db.insert(activityEventsTable).values({
    type: event.type,
    title: event.title,
    description: event.description,
    workItemId: event.workItemId ?? null,
  });
};

router.get("/work-items", async (req, res, next) => {
  try {
    const query = ListWorkItemsQueryParams.parse(req.query);
    const filters = [];

    if (query.status) filters.push(eq(workItemsTable.status, query.status));
    if (query.priority) filters.push(eq(workItemsTable.priority, query.priority));
    if (query.search) {
      filters.push(
        or(
          ilike(workItemsTable.title, `%${query.search}%`),
          ilike(workItemsTable.description, `%${query.search}%`),
          ilike(workItemsTable.category, `%${query.search}%`),
        ),
      );
    }

    const items = await db
      .select()
      .from(workItemsTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(workItemsTable.updatedAt));

    res.json(ListWorkItemsResponse.parse(items));
  } catch (error) {
    next(error);
  }
});

router.post("/work-items", async (req, res, next) => {
  try {
    const data = CreateWorkItemBody.parse(req.body);
    const [item] = await db
      .insert(workItemsTable)
      .values({
        ...data,
        description: data.description ?? null,
        owner: data.owner ?? null,
        dueDate: toDateOnly(data.dueDate),
      })
      .returning();

    await recordActivity({
      type: "created",
      title: "New work item created",
      description: item.title,
      workItemId: item.id,
    });

    res.status(201).json(GetWorkItemResponse.parse(item));
  } catch (error) {
    next(error);
  }
});

router.get("/work-items/:id", async (req, res, next) => {
  try {
    const { id } = GetWorkItemParams.parse(req.params);
    const [item] = await db
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.id, id));

    if (!item) {
      res.status(404).json({ error: "Work item not found" });
      return;
    }

    res.json(GetWorkItemResponse.parse(item));
  } catch (error) {
    next(error);
  }
});

router.patch("/work-items/:id", async (req, res, next) => {
  try {
    const { id } = UpdateWorkItemParams.parse(req.params);
    const data = UpdateWorkItemBody.parse(req.body);
    const { dueDate, ...rest } = data;
    const updates = {
      ...rest,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.owner !== undefined ? { owner: data.owner } : {}),
      ...(dueDate !== undefined ? { dueDate: toDateOnly(dueDate) } : {}),
      updatedAt: new Date(),
    };

    const [item] = await db
      .update(workItemsTable)
      .set(updates)
      .where(eq(workItemsTable.id, id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Work item not found" });
      return;
    }

    await recordActivity({
      type: item.status === "done" ? "completed" : "updated",
      title: item.status === "done" ? "Work item completed" : "Work item updated",
      description: item.title,
      workItemId: item.id,
    });

    res.json(GetWorkItemResponse.parse(item));
  } catch (error) {
    next(error);
  }
});

router.delete("/work-items/:id", async (req, res, next) => {
  try {
    const { id } = UpdateWorkItemParams.parse(req.params);
    const [item] = await db
      .delete(workItemsTable)
      .where(eq(workItemsTable.id, id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Work item not found" });
      return;
    }

    await recordActivity({
      type: "updated",
      title: "Work item removed",
      description: item.title,
      workItemId: null,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/summary", async (_req, res, next) => {
  try {
    const items = await db.select().from(workItemsTable);
    const now = new Date();
    const dueSoonLimit = new Date(now);
    dueSoonLimit.setDate(now.getDate() + 7);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const counts = ["backlog", "in_progress", "blocked", "done"].map((status) => ({
      status,
      count: items.filter((item) => item.status === status).length,
    }));

    const summary = {
      total: items.length,
      open: items.filter((item) => item.status !== "done").length,
      urgent: items.filter((item) => item.priority === "urgent" && item.status !== "done").length,
      dueSoon: items.filter((item) => {
        if (!item.dueDate || item.status === "done") return false;
        const due = new Date(`${item.dueDate}T00:00:00`);
        return due >= now && due <= dueSoonLimit;
      }).length,
      completedThisWeek: items.filter(
        (item) => item.status === "done" && item.updatedAt >= weekStart,
      ).length,
      byStatus: counts,
    };

    res.json(GetDashboardSummaryResponse.parse(summary));
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/activity", async (_req, res, next) => {
  try {
    const events = await db
      .select()
      .from(activityEventsTable)
      .orderBy(desc(activityEventsTable.timestamp))
      .limit(8);

    res.json(ListActivityResponse.parse(events));
  } catch (error) {
    next(error);
  }
});

export default router;