const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    genre: String,
    condition: String,
    coverImage: String,
    description: String,
    status: { type: String, enum: ['available', 'borrowed', 'requested'], default: 'available' },
    addedAt: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
    bookId: mongoose.Schema.Types.ObjectId,
    bookTitle: String,
    bookAuthor: String,
    requesterId: mongoose.Schema.Types.ObjectId,
    requesterName: String,
    requesterUserId: String,
    requesterPhone: String,
    requesterAddress: String,
    ownerId: mongoose.Schema.Types.ObjectId,
    ownerName: String,
    ownerUserId: String,
    ownerAddress: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    message: String,
    exchangeAddress: String,
    exchangeTime: Date,
    requestedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    userid: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    password: { type: String, required: true },
    credits: { type: Number, default: 20 },
    myBooks: [bookSchema],
    myReads: [{
        title: String,
        author: String,
        genre: String,
        ideas: String,
        readAt: { type: Date, default: Date.now }
    }],
    requestedBooks: [requestSchema], // Incoming requests
    bookRequests: [requestSchema]    // Outgoing requests
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
