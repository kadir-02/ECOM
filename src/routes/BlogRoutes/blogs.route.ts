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
import { createblog, deleteBlog, duplicateBlog, getBlogs, toggleBlogActiveStatus, updateBlog } from "../../controllers/BlogsController/BlogCrudController";
import { uploadMemory } from "../../upload/multerCloudinary";
import { getSingleBlogInfo } from "../../controllers/BlogsController/singleBlogInfoController";

const router = Router();

router.get("/tag", getAllSeoTags);
router.get("/keyword", getAllSeoKeywords);
router.get("/", getBlogs);
router.get("/content/:slug", getSingleBlogInfo);

//  Only Admin Access
router.use(authenticate, authorizeAdmin);

const imageUpload = uploadMemory.fields([
  { name: 'image', maxCount: 1 },
]);

router.post("/", imageUpload, createblog);
router.patch("/:id", imageUpload, updateBlog);
router.patch("/toggle/:blogId", toggleBlogActiveStatus);
router.delete("/:id", deleteBlog);
// routes/blogs.ts
router.post('/duplicate/:id', duplicateBlog);


router.post("/tag", createSeoTag);
router.patch("/tag/:id", updateSeoTag);
router.delete("/tag/:id", deleteSeoTag);

router.post("/keyword", createSeoKeyword);
router.patch("/keyword/:id", updateSeoKeyword);
router.delete("/keyword/:id", deleteSeoKeyword);

export default router;