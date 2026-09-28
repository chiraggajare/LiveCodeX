import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    maxUsers: {
        type: Number,
        required: true,
        min: 1
    },
    activeUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    files: [{
        name: { type: String, required: true },
        language: { type: String, required: true },
        content: { type: String, default: "" }
    }],
    isQuickIDE: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Room = mongoose.model("Room", roomSchema);

export default Room;
