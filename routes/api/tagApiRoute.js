const express = require("express");
const router = express.Router();
const tag = require("../../controllers/api/tagApiController");

router.get("/", tag.index);
router.get("/:slug", tag.show);

module.exports = router;
