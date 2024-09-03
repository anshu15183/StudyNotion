const mongoose = require("mongoose");

const courseProgressSchema = new mongoose.Schema({
	courseid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Course",
	},
	completedVideos: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "SubSection",
		},
	],
});

module.exports = mongoose.model("courseProgress", courseProgressSchema);
