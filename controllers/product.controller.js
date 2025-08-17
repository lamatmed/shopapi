const Product = require("../models/product");
const fs = require('fs');
const path = require('path');

// ➡️ Créer un produit
exports.createProduct = async (req, res) => {
  try {
      if (req.body.image && req.body.image.base64) {
      const uploadDir = path.join(__dirname, "../uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(req.body.image.base64, "base64");
      const filePath = path.join(uploadDir, req.body.image.filename);
      fs.writeFileSync(filePath, buffer);
      
      req.body.image = `https://shopapi-81ir.onrender.com/uploads/${req.body.image.filename}`;
    }

    const product = new Product(req.body);
    await product.save();
    // Peupler les données d'auteur après la création
    const populatedProduct = await Product.findById(product._id)
      .populate("authors.authorId", "name phone");
    res.status(201).json(populatedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ➡️ Récupérer tous les produits
exports.getProducts = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    
    // Filtrer par auteur si userId est fourni
    if (userId) {
      query = { "authors.authorId": userId };
    }

    const products = await Product.find(query).populate("authors.authorId", "name phone");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// ➡️ Récupérer un produit par ID
exports.getProductById = async (req, res) => {
  try {
    // Changé: email → phone
    const product = await Product.findById(req.params.id).populate("authors.authorId", "name phone");
    if (!product) return res.status(404).json({ error: "Produit introuvable" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➡️ Mettre à jour un produit
exports.updateProduct = async (req, res) => {
  try {
    // Gérer l'upload d'image
    if (req.body.image && req.body.image.base64) {
      const uploadDir = path.join(__dirname, "../uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(req.body.image.base64, "base64");
      const filePath = path.join(uploadDir, req.body.image.filename);
      fs.writeFileSync(filePath, buffer);
      
      req.body.image = `https://shopapi-81ir.onrender.com/uploads/${req.body.image.filename}`;
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate("authors.authorId", "name phone"); // Peupler après mise à jour

    if (!product) return res.status(404).json({ error: "Produit introuvable" });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// ➡️ Supprimer un produit
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Produit introuvable" });
    res.status(200).json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ➡️ Ajouter un auteur
exports.addAuthorToProduct = async (req, res) => {
  try {
    const { authorId, authorName } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    await product.addAuthor(authorId, authorName);
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ➡️ Ajouter / mettre à jour une note
exports.addRatingToProduct = async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    await product.addRating(userId, rating, comment);
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
