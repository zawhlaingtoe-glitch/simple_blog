const Tag = require("../../models/tagModel");

/**
 * GET /api/v1/tags
 * List all tags with post counts
 */
exports.index = async (req, res) => {
    try {
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const tags = await Tag.findAllWithCounts(limit);

        return res.status(200).json({
            status: "success",
            data: {
                total: tags.length,
                tags: tags.map((t) => ({
                    id: t.id,
                    name: t.name,
                    slug: t.slug,
                    post_count: t.post_count || 0
                }))
            }
        });
    } catch (error) {
        console.error("API tags index error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

/**
 * GET /api/v1/tags/:slug
 * Get a single tag by slug
 */
exports.show = async (req, res) => {
    try {
        const tag = await Tag.findBySlug(req.params.slug);
        if (!tag) {
            return res.status(404).json({ status: "fail", message: "Tag not found." });
        }
        return res.status(200).json({
            status: "success",
            data: {
                tag: {
                    id: tag.id,
                    name: tag.name,
                    slug: tag.slug
                }
            }
        });
    } catch (error) {
        console.error("API tag show error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};
