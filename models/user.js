const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required:  [true, 'Le numéro de téléphone est requis'],
    unique: true,
    validate: {
      validator: function(v) {
        return /\d{10}/.test(v);
      },
      message: props => `${props.value} n'est pas un numéro de téléphone valide!`
    }
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false
  },
  image: {
    type: String,
    default: 'https://shopapi-81ir.onrender.com/uploads/default-avatar.webp'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware pour hasher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Méthode pour vérifier le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Post-save hook pour transformer l'image en URL absolue
userSchema.post(['find', 'findOne', 'findById'], function(docs) {
  if (!docs) return;
  
  const transformDoc = (doc) => {
    if (doc.image && !doc.image.startsWith('http')) {
      doc.image = `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}${doc.image}`;
    }
    return doc;
  };

  if (Array.isArray(docs)) {
    return docs.map(transformDoc);
  }
  return transformDoc(docs);
});

const User = mongoose.model('User', userSchema);
module.exports = User;