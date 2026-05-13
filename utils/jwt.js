const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign({
            id: user.id,
            email: user.email
        },
        process.env.JWT_SECRET, { expiresIn: "1h" }
    );
};

const loginUser = async(req, res) => {
    try {
        const { email, password } = req.body;

        // ၁။ User ရှိမရှိ အရင်ရှာရပါမယ် (သင့် Model ထဲက findByEmail ကို သုံးပါ)
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password"
            });
        }

        // ၂။ Password မှန်မမှန် စစ်ဆေးရပါမယ် (bcrypt.compare သုံးထားတဲ့ Model function)
        // သင့် Model မှာ static login function ရှိရင် အဲဒါကို သုံးတာ ပိုကောင်းပါတယ်
        const isMatch = await User.login(email, password);

        if (!isMatch) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password"
            });
        }

        // ၃။ Token ထုတ်ပေးခြင်း (user.id သည် Database မှ ရလာသော data ဖြစ်ရပါမည်)
        const token = generateToken(user);

        return res.status(200).json({
            status: "success",
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(400).json({
            status: "error",
            message: error.message
        });
    }
};

module.exports = { loginUser, generateToken };