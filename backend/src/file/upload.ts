import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const profileUploadPath = path.join(process.cwd(), "uploads/profile");
fs.mkdirSync(profileUploadPath, { recursive: true });

// Ensure the upload directory exists
const uploadPath = path.join(process.cwd(), "uploads/resumes");
fs.mkdirSync(uploadPath, { recursive: true });

// Sanitize worker name for filename
const sanitizeFileName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    if (file.fieldname === "photo") {
      cb(null, profileUploadPath);
    } 
    
    else if (file.fieldname === "resume") {
      cb(null, uploadPath);
    }

  },

  filename: (req: Request, file, cb) => {
    const workerName = req.body.name || "worker";
    const sanitizedName = sanitizeFileName(workerName);
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);

    if (file.fieldname === "photo") {
      cb(
        null,
        `${sanitizedName}_profile_${timestamp}${extension}`
      );
    } 
    
    else {
      cb(
        null,
        `${sanitizedName}_${timestamp}${extension}`
      );
    }
  },
});

export const uploadFiles = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const documentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const imageTypes = ["image/jpeg", "image/png", "image/jpg"];

    // Accept resume documents and optional profile images
    if (
      (file.fieldname === "resume" && documentTypes.includes(file.mimetype)) ||
      (file.fieldname === "photo" && imageTypes.includes(file.mimetype))
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});


const permitUploadPath = path.join(process.cwd(), "uploads/permits");
fs.mkdirSync(permitUploadPath, { recursive: true });


const permitStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "photo") {
      cb(null, profileUploadPath);
    } else if (file.fieldname === "permit") {
      cb(null, permitUploadPath);
    } else {
      cb(new Error("Unexpected field"), "");
    }
  },

  filename: (req, file, cb) => {
    const companyName = req.body.company || "employer";
    const sanitizedName = sanitizeFileName(companyName);
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);

    if (file.fieldname === "photo") {
      cb(null, `${sanitizedName}_profile_${timestamp}${extension}`);
    } else {
      cb(null, `${sanitizedName}_permit_${timestamp}${extension}`);
    }
  },
});

export const uploadEmployerPermit = multer({
  storage: permitStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const imageTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    const permitTypes = [
      "application/pdf",
      ...imageTypes,
    ];

    if (
      file.fieldname === "photo" &&
      imageTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    if (
      file.fieldname === "permit" &&
      permitTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    cb(new Error("Invalid file type"));
  },
});












const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileUploadPath);
  },
  filename: (req: Request, file, cb) => {
    const workerName = req.body.name || "worker";
    const sanitizedName = sanitizeFileName(workerName);
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);

    cb(null, `${sanitizedName}_profile_${timestamp}${extension}`);
  },
});

export const uploadProfilePhoto = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // optional smaller limit for avatars
  fileFilter: (req, file, cb) => {
    const imageTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (file.fieldname === "photo" && imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});



// Source - https://stackoverflow.com/a/67846776
// Posted by Aman Silawat
// Retrieved 2026-07-17, License - CC BY-SA 4.0

// Source - https://stackoverflow.com/a/67846776
// Posted by Aman Silawat
// Retrieved 2026-07-17, License - CC BY-SA 4.0


const permitStorageFromSource = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/permits'))
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + file.originalname)
  }
})

const jobStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/workerJobsCompleted'))
    },
    filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + file.originalname)
    }
});

const reportStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/reports'))
    },
    filename: function (req, file, cb) {
            // Source: https://stackoverflow.com/questions/48418680/enoent-no-such-file-or-directory
            cb(null, file.fieldname + "_" + Date.now() + "_x24-0025-30-0000x41" + file.originalname)
            console.log(file.fieldname + "_" + Date.now() + "_x24-0025-30-0000x41" + file.originalname)
    }
});


// https://medium.com/@mohsinansari.dev/handling-file-uploads-and-file-validations-in-node-js-with-multer-a3716ec528a3
// https://medium.com/@mohsinansari.dev/handling-file-uploads-and-file-validations-in-node-js-with-multer-a3716ec528a3
// https://www.geeksforgeeks.org/node-js/upload-files-to-local-public-folder-in-nodejs-using-multer/

export const uploadPermits = multer({
  storage: permitStorageFromSource,
  limits: { fileSize: 15 * 1024 * 1024 }
}).single("permit")

export const uploadJobs = multer({
    storage: jobStorage,
    limits: { fileSize: 15 * 1024 * 1024 }
}).array("workerUpload");

export const reportUpload = multer({
  storage: reportStorage,
  limits: { fileSize: 15 * 1024 * 1024 }
}).array("submitEvidence")