import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workItemsRouter from "./work-items";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workItemsRouter);

export default router;
