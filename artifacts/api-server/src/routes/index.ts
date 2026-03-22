import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import s1Router from "./s1.js";
import lrRouter from "./lr.js";
import adminRouter from "./admin.js";
import threatIntelRouter from "./threatintel.js";
import hnRouter from "./hn.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/s1", s1Router);
router.use("/lr", lrRouter);
router.use("/admin", adminRouter);
router.use("/", threatIntelRouter);
router.use("/", hnRouter);

export default router;
