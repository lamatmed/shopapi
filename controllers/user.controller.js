const User = require("../models/user");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET || "secretkey",
    { expiresIn: "7d" }
  );
};

// Fonction pour mettre à jour via socket (réutilisable)
const updateUserProfile = async (userId, updateData) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) throw new Error("Utilisateur non trouvé");
    return updatedUser;
  } catch (err) {
    throw err;
  }
};

// Inscription
exports.registerUser = async (req, res) => {
  try {
    const { phone, fullName, password } = req.body;

    // Vérification doublon
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Numéro déjà utilisé" });
    }

    const newUser = new User({ phone, fullName, password });
    await newUser.save();

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        phone: newUser.phone,
        image: newUser.image,
      },
      token: generateToken(newUser),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Connexion
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    res.json({
      message: "Connexion réussie",
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        image: user.image,
      },
      token: generateToken(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Modifier utilisateur (via API REST)
exports.updateUser = async (req, res) => {
  try {
    const { fullName, image, isBlocked, isAdmin } = req.body;
    
    const updatedUser = await updateUserProfile(req.params.id, {
      fullName,
      image,
      isBlocked,
      isAdmin
    });
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Mettre à jour updateUserViaSocket :
exports.updateUserViaSocket = async (userId, data) => {
  const { fullName, image } = data;
  const updateData = { fullName };

  if (image) {
    // Nouvelle image base64
    if (image.base64) {
      const uploadDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(image.base64, "base64");
      const filename = `user-${userId}-${Date.now()}.jpg`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      updateData.image = `https://shopapi-81ir.onrender.com/uploads/${filename}`;
    } 
    // URL existante
    else if (image.url) {
      updateData.image = image.url;
    }
  }

  return await updateUserProfile(userId, updateData);
};
// Supprimer utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer son propre profil
// 🔹 Obtenir toutes les infos du user connecté (sauf password)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // ⚡ exclure uniquement le password
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json(user); // ✅ renvoie toutes les propriétés restantes
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Ajouter cette fonction dans user.controller.js
exports.changePasswordViaSocket = async (userId, data) => {
  try {
    const { currentPassword, newPassword } = data;
    const user = await User.findById(userId).select("+password");
    
    if (!user) throw new Error("Utilisateur non trouvé");
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new Error("Mot de passe actuel incorrect");
    
    user.password = newPassword;
    await user.save();
    
    return { success: true };
  } catch (err) {
    throw err;
  }
};
// ✅ Bloquer / Débloquer un utilisateur
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    user.isBlocked = !user.isBlocked; // inverse l'état
    await user.save();

    res.json({
      message: user.isBlocked ? "Utilisateur bloqué" : "Utilisateur débloqué",
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        isBlocked: user.isBlocked,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
