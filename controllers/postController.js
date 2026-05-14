const Post = require("../models/postModel");

exports.create = async(req, res) => {
    try {
        const { title, content } = req.body;
        const user_id = req.user.id;
        const photo = req.file ? req.file.name : null;
        if (!title || !content) {
            return res.status(400)
                .json({
                    status: "False!",
                    message: "You need to fill the first title and content! "
                })
        }
        const postId = await Post.createPost(user_id, title, content, photo)

        return res
            .status(200)
            .json({
                status: "Success! ",
                message: "Post created successful! ",
                data: {
                    user_id,
                    postId
                }
            })

    } catch (error) {

        console.error('Error: ', error)
        return res.status(400).json({
            status: "Fail! ",
            messsage: error.message
        })
    }
}

exports.getUserPosts = async(req, res) => {
    try {
        const userId = req.params.userId;
        const userPosts = await Post.findByUserId(userId);
        if (userPosts.length === 0) {
            return res.status(400)
                .json({
                    status: "Not found! ",
                    message: "User has not created post! "
                })
        }

        return res.status(200).json({
            status: "Success! ",
            total: userPosts.length,
            data: {
                userPosts
            }
        })
    } catch (error) {
        console.error(error.message)
        return res
            .status(500)
            .json({
                status: "Fail! ",
                message: "Internal Server error!",
                error: error.message
            })
    }
}
exports.updatePost = async(req, res) => {
    try {
        const postId = req.params.id
        const { title, content } = req.body;
        const userId = req.user.id;
        const photo = req.file ? req.file.name : null
        const post = await Post.findByid(postId);
        if (!post) {
            return res.status(400).json({
                status: "Fial!",
                message: "User's post not found! "
            })
        }

        if (post.user_id !== userId) {
            return
            res
                .status(400)
                .json({
                    status: "Fail!",
                    message: "You can only update your post!"
                })
        }

        const updateNewPost = await Post.updatePost(postId, title, content, photo)
        const updateDatabase = await Post.findByid(postId)

        return res.status(200)
            .json({
                status: "Success!",
                message: "Post updated successfully! ",
                data: updateDatabase

            })


    } catch (error) {
        console.error(error.message)
        return res.status(500)
            .json({
                status: "Fail!",
                message: "Internal server Error! "
            })
    }
}

exports.deletePost = async(req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const post = await Post.findByid(postId);
        if (!post) {
            return res.status(400).json({
                status: "Fail!",
                message: "Post not found! "
            })
        }

        if (post.user_id !== userId) {
            return res.status(400).json({
                status: "Fail! ",
                message: "You can only delet your post! "
            })
        }


        await Post.deletePost(postId);
        return res.status(200).json({
            status: "Success!",
            message: "Post deleted successfully! "
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({
            status: "Fail! ",
            message: "Interanl Server Error!"
        })
    }
}