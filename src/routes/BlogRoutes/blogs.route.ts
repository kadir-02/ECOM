import { Router } from "express";
import {
  createSeoTag,
  deleteSeoTag,
  getAllSeoTags,
  updateSeoTag,
} from "../../controllers/BlogsController/seoTagControllers";
import {
  createSeoKeyword,
  deleteSeoKeyword,
  getAllSeoKeywords,
  updateSeoKeyword,
} from "../../controllers/BlogsController/seoKeywordsControllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeAdmin } from "../../middlewares/authorizaAdmin";

const router = Router();

router.get("/tag", getAllSeoTags);
router.get("/keyword", getAllSeoKeywords);

//  Only Admin Access
router.use(authenticate, authorizeAdmin);

router.post("/tag", createSeoTag);
router.patch("/tag", updateSeoTag);
router.delete("/tag", deleteSeoTag);

router.post("/keyword", createSeoKeyword);
router.patch("/keyword", updateSeoKeyword);
router.delete("/keyword", deleteSeoKeyword);

export default router;