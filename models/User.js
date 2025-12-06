const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    userid: { type: String, unique: true, required: true },
    phone: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    credits: { type: Number, default: 20 },
    myBooks: [{
        _id: mongoose.Schema.Types.ObjectId,
        title: { type: String, required: true },
        author: { type: String, required: true },
        genre: { type: String }, // Added genre field
        condition: { type: String }, // Added condition field
        isbn: { type: String },
        description: { type: String },
        status: {
            type: String,
            enum: ['available', 'borrowed', 'requested'],
            default: 'available'
        }
    }],
    myReads: [{
        _id: mongoose.Schema.Types.ObjectId,
        title: { type: String, required: true },
        author: { type: String, required: true },
        genre: { type: String },
        ideas: { type: String },
        readAt: { type: Date, default: Date.now }
    }],
    requestedBooks: [{
        bookId: { type: mongoose.Schema.Types.ObjectId },
        bookTitle: { type: String, required: true },
        bookAuthor: { type: String, required: true },
        requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requesterName: { type: String },
        requesterUserId: { type: String },
        requesterPhone: { type: String },
        requesterAddress: { type: String },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        exchangeAddress: { type: String },
        exchangeTime: { type: Date },
        message: { type: String },
        requestedAt: { type: Date, default: Date.now }
    }],
    bookRequests: [{
        bookId: { type: mongoose.Schema.Types.ObjectId },
        bookTitle: { type: String, required: true },
        bookAuthor: { type: String, required: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ownerName: { type: String },
        ownerUserId: { type: String },
        ownerAddress: { type: String },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        exchangeAddress: { type: String },
        exchangeTime: { type: Date },
        message: { type: String },
        requestedAt: { type: Date, default: Date.now }
    }]
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if model already exists to prevent overwrite error
const User = mongoose.models.Users || mongoose.model("Users", userSchema);

module.exports = User;
