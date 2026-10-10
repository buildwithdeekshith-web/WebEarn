import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webearnRouter from "./webearn";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webearnRouter);

export default router;
