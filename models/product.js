const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    maxlength: [100, 'Le nom du produit ne peut dépasser 100 caractères'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    minlength: [50, 'La description doit contenir au moins 50 caractères'],
    maxlength: [2000, 'La description ne peut dépasser 2000 caractères']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif'],
    set: v => parseFloat(v).toFixed(2)
  },
  image: {
    type: String,
    required: [true, 'L\'image est requise'],
    validate: {
      validator: function(v) {
        return /\.(jpeg|jpg|png|webp|gif)$/i.test(v);
      },
      message: props => `${props.value} n'est pas une URL d'image valide!`
    }
  },
  authors: [{
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: {
      type: String,
      required: true,
      trim: true
    }
  }],
  category: {
    type: String,
    enum: ['Électronique', 'Mode', 'Maison', 'Alimentation', 'Beauté', 'Autre'],
    default: 'Autre'
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Le stock ne peut pas être négatif'],
    default: 0
  },
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    }
  }],
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.length <= 15;
      },
      message: "Maximum 15 tags autorisés"
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual pour le nombre d'auteurs
productSchema.virtual('authorCount').get(function() {
  return this.authors.length;
});

// Virtual pour la note moyenne
productSchema.virtual('averageRating').get(function() {
  if (this.ratings.length === 0) return 0;
  
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return parseFloat((sum / this.ratings.length).toFixed(1));
});

// Middleware pour formater le prix avant sauvegarde
productSchema.pre('save', function(next) {
  if (this.isModified('price')) {
    this.price = parseFloat(this.price.toFixed(2));
  }
  next();
});

// Méthode pour ajouter un auteur
productSchema.methods.addAuthor = function(authorId, authorName) {
  const authorExists = this.authors.some(a => a.authorId.equals(authorId));
  
  if (!authorExists) {
    this.authors.push({
      authorId: authorId,
      authorName: authorName
    });
  }
  
  return this.save();
};

// Méthode pour ajouter une évaluation
productSchema.methods.addRating = function(userId, rating, comment = '') {
  // Vérifier si l'utilisateur a déjà noté
  const existingRatingIndex = this.ratings.findIndex(r => r.userId.equals(userId));
  
  if (existingRatingIndex !== -1) {
    // Mettre à jour l'évaluation existante
    this.ratings[existingRatingIndex].rating = rating;
    this.ratings[existingRatingIndex].comment = comment;
  } else {
    // Ajouter une nouvelle évaluation
    this.ratings.push({
      userId: userId,
      rating: rating,
      comment: comment
    });
  }
  
  return this.save();
};

// Méthode pour vérifier si un utilisateur est auteur
productSchema.methods.isAuthor = function(userId) {
  return this.authors.some(a => a.authorId.equals(userId));
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;