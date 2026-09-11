import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workItemsRouter from "./work-items";
import authRouter from "./auth";
import socialTimelineRouter from "./social-timeline";
import trainingRouter from "./training";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workItemsRouter);
router.use(authRouter);
router.use(socialTimelineRouter);
router.use(trainingRouter);

export default router;
