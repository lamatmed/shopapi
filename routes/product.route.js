const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");

// CRUD Produits
router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Auteurs & Évaluations
router.post("/:id/authors", productController.addAuthorToProduct);
router.post("/:id/ratings", productController.addRatingToProduct);

module.exports = router;
