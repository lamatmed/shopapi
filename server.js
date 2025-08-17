const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Augmentez selon vos besoins
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// server.js

// Après les middlewares Express

// Connexion à MongoDB
mongoose.connect('mongodb+srv://playnow:playnow@cluster0.k2iqkfs.mongodb.net/')
  .then(() => console.log('DB connected'))
  .catch((err) => console.log('DB connexion echoue', err));

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir les fichiers statiques
app.use("/uploads", express.static(uploadDir));

// Importer les routes
const userRoutes = require("./routes/user.route");
const productRoutes = require("./routes/product.route");

// Utiliser les routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

// Middleware d'authentification Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentification requise"));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Token invalide"));
  }
});

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Nouveau client connecté: ${socket.id} (User ID: ${socket.user?.id})`);

  // Ping/pong pour maintenir la connexion
  const interval = setInterval(() => {
    socket.emit("ping");
  }, 25000);

  socket.on("pong", () => {
    // Connexion active
  });

  // Mise à jour du profil
  socket.on("update-profile", async (data) => {
    try {
      if (!socket.user || socket.user.id !== data.userId) {
        throw new Error("Non autorisé");
      }
      
      const userController = require("./controllers/user.controller");
      const updatedUser = await userController.updateUserViaSocket(data.userId, data);
      
      socket.emit("profile-updated", updatedUser);
    } catch (error) {
      console.error("Update error:", error);
      socket.emit("update-error", { message: error.message });
    }
  });

  // 🔹 Changement de mot de passe
  socket.on("change-password", async (data) => {
    try {
      if (!socket.user || socket.user.id !== data.userId) {
        throw new Error("Non autorisé");
      }
      
      const userController = require("./controllers/user.controller");
      const result = await userController.changePasswordViaSocket(data.userId, data);
      
      socket.emit("password-changed");
    } catch (error) {
      console.error("Password change error:", error);
      socket.emit("password-error", { message: error.message });
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log(`Client déconnecté: ${socket.id}`);
  });
});

// Démarrer le serveur
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${uploadDir}`);
  console.log(`Static files served at: http://localhost:${PORT}/uploads`);
});