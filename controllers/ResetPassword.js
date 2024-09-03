const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");

//reset password token
exports.resetPasswordToken = async (res, req) => {
	try {
		//get email from request body
		const email = req.body.email;
		//check user for this email, validation on email
		const user = await User.findOne({ email: email });
		if (!user) {
			return res.json({
				success: false,
				message: "Your email is not registered with us",
			});
		}
		//generate token
		const token = crypto.randomUUID;
		//update user by adding token and expiration time
		const updatedDetails = await User.findOneAndUpdate(
			{ email: email },
			{
				token: token,
				resetPasswordExpires: Date.now() + 5 * 60 * 1000,
			},
			{ new: true }
		);
		//create url
		const url = `http://localhost:3000/update-password/${token}`;
		//send email containing the url
		await mailSender(email, "Password Reset Link", `Password Reset Link: ${url}`);
		//return reponse
		return res.json({
			success: true,
			message: "Email sent successfully, please check email and change password",
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Something went wrong while sending reset password",
		});
	}
};

//reset password
exports.resetPassword = async (req, res) => {
	try {
		//data fetch
		const { password, confiremPassword, token } = req.body;
		//validation
		if (password !== confiremPassword) {
			return res.json({
				success: false,
				message: "Passwords not matching",
			});
		}
		//get user details from db using token
		const userDetails = await user.findOne({ token: token });
		//if no entry - invalid token or time expired
		if (!userDetails) {
			return res.json({
				success: false,
				message: "Token is invalid",
			});
		}
		//token time check
		if (userDetails.resetPasswordExpires < Date.now()) {
			return res.json({
				success: false,
				message: "Token is expired, please regenerate our token",
			});
		}
		//hash password
		const hashedPassword = await bcrypt.hash(password, 10);
		//password update
		await User.findOneAndUpdate({ token: token }, { password: hashedPassword }, { new: true });
		//return response
		return res.status(200).json({
			success: true,
			message: "Password reset successfully",
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Something went wrong while sending reset password",
		});
	}
};
