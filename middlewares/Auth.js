const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");

//Auth
exports.auth = async (req, res, next) => {
	try {
		//extract token
		const token = req.cookies.token || req.body.token || req.header("Authorisation").replace("Bearer ", "");

		//if token missing, then return response
		if (!token) {
			return res.status(401).json({
				success: false,
				message: "Token is missing",
			});
		}

		//verify the token
		try {
			const decode = await jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {}
	} catch (error) {}
};

//isStudent

//isInstructor

//isAdmin
