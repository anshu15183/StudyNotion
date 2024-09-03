const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//sendOTP
exports.sendOTP = async (req, res) => {
	try {
		//fetch email from request body
		const { email } = req.body;

		//check if user already exists
		const checkUserPresent = await User.findOne({ email });

		//if user exists then return a response
		if (checkUserPresent) {
			return res.status(401).json({
				success: false,
				message: "User already registered",
			});
		}

		//generate otp
		var otp = otpGenerator.generate(6, {
			upperCaseAlphabets: false,
			lowerCaseAlphabets: false,
			specialChars: false,
		});
		console.log("OTP generated");

		//check unique otp or not
		const result = await OTP.findOne({ otp: otp });

		while (result) {
			var otp = otpGenerator.generate(6, {
				upperCaseAlphabets: false,
				lowerCaseAlphabets: false,
				specialChars: false,
			});
			result = await OTP.findOne({ otp: otp });
		}

		const otpPayload = {
			email,
			otp,
		};

		//create an entry for otp
		const otpBody = await OTP.create(otpPayload);
		console.log(otpBody);

		//return res successful
		return res.status(200).json({
			success: true,
			message: "Otp sent successfully",
			otp,
		});
	} catch (err) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: err.message,
		});
	}
};

//signup
exports.signup = async (req, res) => {
	try {
		//data fetc from request body
		const { firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp } = req.body;

		//vaidate data
		if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
			return res.status(403).json({
				success: false,
				message: "All fields are required",
			});
		}

		//match both the passwords
		if (password !== confirmPassword) {
			return res.status(400).json({
				success: false,
				message: "Password and confirm password value does not match, please try again",
			});
		}
		//check if user already exists or not
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User is already registered",
			});
		}

		//find most recent otp stored for the user
		const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
		console.log("Recent Otp: ", otp);

		//validate otp
		if (recentOtp.length == 0) {
			//otp not found
			return res.status(400).json({
				success: false,
				message: "OTP found",
			});
		} else if (otp !== recentOtp.otp) {
			//Invalid otp
			return res.status(400).json({
				success: false,
				message: "Invalid OTP",
			});
		}
		//hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// create entry in db
		const profileDetails = await Profile.create({
			gender: null,
			dateOfBirth: null,
			about: null,
			contactNumber: null,
		});

		const user = await User.create({
			firstName,
			lastName,
			email,
			contactNumber,
			password: hashedPassword,
			accountType,
			additionalDetails: profileDetails._id,
			image: `https://api/.dicebar.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
		});

		//return response
		return res.status(200).json({
			success: true,
			message: "User is registerd successfully",
			user,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: "User cannot be registered. Please try again",
		});
	}
};

//login
exports.login = async (res, res) => {
	try {
		//get data from body
		const { email, password } = req.body;
		//validation data
		if (!email || !password) {
			return res.status(403).json({
				success: false,
				message: "All fields are required, please try again",
			});
		}
		//user check exist or not
		const user = await User.findOne({ email }).populate("additionalDetails");
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "User is not registered, please signup first",
			});
		}
		//generate JWT, after password matching
		if (await bcrypt.compare(password, user.password)) {
			const payload = {
				email: user.email,
				id: user._id,
				role: user.accountType,
			};

			const token = jwt.sign(payload, process.env.JWT_SECRET, {
				expiresIn: "2h",
			});

			user.token = token;
			user.password = undefined;

			//create cookies
			const options = {
				expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
				httpOnly: true,
			};
			res.cookie("token", token, options).status(200).json({
				success: true,
				token,
				user,
				message: "Logged in successfully",
			});
		} else {
			return res.status(401).json({
				success: false,
				message: "Passord is incorrect",
			});
		}

		//create cookie and send response
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Login Failure, please try again",
		});
	}
};

//change password
exports.changePassword = async (req, res) => {
	try {
		//get data from body
		const userDetails = await User.findById(req.user.id);

		//get old password, new password, confirm new password
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		//validation
		const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res.status(401).json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}
		//update password in db
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(req.user.id, { password: encryptedPassword }, { new: true });

		//send email - password updated

		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		//return response
		return res.status(200).json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};
