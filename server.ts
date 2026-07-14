import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Parse JSON and URL-encoded bodies with high limits
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Set up multer for file upload
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Normalize filename to prevent encoding issues, keeping safe Thai and English characters
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const originalName = file.originalname;
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\u0e00-\u0e7f-]/g, "_");
      cb(null, `${base}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // API Route for uploading file
  app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
      }
      
      // We will return a relative path or an absolute path served by our server
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        success: true,
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error("Error during file upload:", error);
      res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดขณะอัปโหลดไฟล์" });
    }
  });

  // Serve uploads folder statically
  app.use("/uploads", express.static(uploadsDir));

  // Vite middleware for development or Static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
