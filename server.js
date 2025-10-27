// // server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config();


// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use('/uploads', express.static('uploads'));

// // Create uploads directory if it doesn't exist
// if (!fs.existsSync('uploads')) {
//     fs.mkdirSync('uploads');
// }

// // MongoDB Connection
// mongoose.connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
//     .then(() => console.log('MongoDB Connected'))
//     .catch(err => console.log('MongoDB Error:', err));

// // Pothole Schema
// const potholeSchema = new mongoose.Schema({
//     image: String,
//     location: {
//         latitude: Number,
//         longitude: Number,
//         address: String
//     },
//     severity: {
//         type: String,
//         enum: ['mild', 'severe', 'dangerous'],
//         required: true
//     },
//     position: {
//         type: String,
//         enum: ['left', 'middle', 'right', 'full-width'],
//         required: true
//     },
//     description: String,
//     status: {
//         type: String,
//         enum: ['reported', 'in-progress', 'resolved'],
//         default: 'reported'
//     },
//     reportedBy: String,
//     timestamp: {
//         type: Date,
//         default: Date.now
//     }
// }, { timestamps: true });

// const Pothole = mongoose.model('Pothole', potholeSchema);

// // Multer configuration for image upload
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/');
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype.startsWith('image/')) {
//             cb(null, true);
//         } else {
//             cb(new Error('Only image files are allowed!'));
//         }
//     }
// });

// // Routes

// // POST: Create new pothole report
// app.post('/api/potholes', upload.single('image'), async (req, res) => {
//     try {
//         const {
//             latitude,
//             longitude,
//             address,
//             severity,
//             position,
//             description,
//             reportedBy
//         } = req.body;

//         const pothole = new Pothole({
//             image: req.file ? `/uploads/${req.file.filename}` : null,
//             location: {
//                 latitude: parseFloat(latitude),
//                 longitude: parseFloat(longitude),
//                 address: address || 'Unknown location'
//             },
//             severity,
//             position,
//             description,
//             reportedBy: reportedBy || 'Anonymous'
//         });

//         await pothole.save();
//         res.status(201).json({
//             success: true,
//             message: 'Pothole reported successfully',
//             data: pothole
//         });
//     } catch (error) {
//         console.error('Error creating pothole:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error reporting pothole',
//             error: error.message
//         });
//     }
// });

// // GET: Fetch all potholes
// app.get('/api/potholes', async (req, res) => {
//     try {
//         const { status, severity, startDate, endDate } = req.query;
//         let query = {};

//         if (status) query.status = status;
//         if (severity) query.severity = severity;
//         if (startDate || endDate) {
//             query.timestamp = {};
//             if (startDate) query.timestamp.$gte = new Date(startDate);
//             if (endDate) query.timestamp.$lte = new Date(endDate);
//         }

//         const potholes = await Pothole.find(query).sort({ timestamp: -1 });
//         res.json({
//             success: true,
//             count: potholes.length,
//             data: potholes
//         });
//     } catch (error) {
//         console.error('Error fetching potholes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching potholes',
//             error: error.message
//         });
//     }
// });

// // GET: Fetch single pothole by ID
// app.get('/api/potholes/:id', async (req, res) => {
//     try {
//         const pothole = await Pothole.findById(req.params.id);
//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }
//         res.json({ success: true, data: pothole });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching pothole',
//             error: error.message
//         });
//     }
// });

// // PUT: Update pothole status
// app.put('/api/potholes/:id', async (req, res) => {
//     try {
//         const { status } = req.body;
//         const pothole = await Pothole.findByIdAndUpdate(
//             req.params.id,
//             { status },
//             { new: true }
//         );

//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Status updated successfully',
//             data: pothole
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error updating pothole',
//             error: error.message
//         });
//     }
// });

// // DELETE: Delete pothole
// app.delete('/api/potholes/:id', async (req, res) => {
//     try {
//         const pothole = await Pothole.findByIdAndDelete(req.params.id);
//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }

//         // Delete associated image file
//         if (pothole.image) {
//             const imagePath = path.join(__dirname, pothole.image);
//             if (fs.existsSync(imagePath)) {
//                 fs.unlinkSync(imagePath);
//             }
//         }

//         res.json({
//             success: true,
//             message: 'Pothole deleted successfully'
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error deleting pothole',
//             error: error.message
//         });
//     }
// });

// // GET: Statistics
// app.get('/api/stats', async (req, res) => {
//     try {
//         const total = await Pothole.countDocuments();
//         const reported = await Pothole.countDocuments({ status: 'reported' });
//         const inProgress = await Pothole.countDocuments({ status: 'in-progress' });
//         const resolved = await Pothole.countDocuments({ status: 'resolved' });

//         const bySeverity = await Pothole.aggregate([
//             { $group: { _id: '$severity', count: { $sum: 1 } } }
//         ]);

//         res.json({
//             success: true,
//             data: {
//                 total,
//                 byStatus: { reported, inProgress, resolved },
//                 bySeverity: bySeverity.reduce((acc, item) => {
//                     acc[item._id] = item.count;
//                     return acc;
//                 }, {})
//             }
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching statistics',
//             error: error.message
//         });
//     }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server running on port ${PORT}`);
// });

// // server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config();
// const s3 = require('./config/awsConfig');
// const multerS3 = require('multer-s3');

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // MongoDB Connection
// mongoose.connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
//     .then(() => console.log('MongoDB Connected'))
//     .catch(err => console.log('MongoDB Error:', err));

// // Pothole Schema
// const potholeSchema = new mongoose.Schema({
//     image: String,
//     location: {
//         latitude: Number,
//         longitude: Number,
//         address: String
//     },
//     severity: {
//         type: String,
//         enum: ['mild', 'severe', 'dangerous'],
//         required: true
//     },
//     position: {
//         type: String,
//         enum: ['left', 'middle', 'right', 'full-width'],
//         required: true
//     },
//     description: String,
//     status: {
//         type: String,
//         enum: ['reported', 'in-progress', 'resolved'],
//         default: 'reported'
//     },
//     reportedBy: String,
//     timestamp: {
//         type: Date,
//         default: Date.now
//     }
// }, { timestamps: true });

// const Pothole = mongoose.model('Pothole', potholeSchema);

// // Multer configuration for S3 upload
// const upload = multer({
//     storage: multerS3({
//         s3: s3,
//         bucket: process.env.AWS_BUCKET_NAME,
//         acl: 'public-read', // make files public
//         key: function (req, file, cb) {
//             const fileName = `potholes/${Date.now()}_${file.originalname}`;
//             cb(null, fileName);
//         }
//     }),
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype.startsWith('image/')) {
//             cb(null, true);
//         } else {
//             cb(new Error('Only image files are allowed!'));
//         }
//     }
// });

// // Routes

// // POST: Create new pothole report
// app.post('/api/potholes', upload.single('image'), async (req, res) => {
//     try {
//         const {
//             latitude,
//             longitude,
//             address,
//             severity,
//             position,
//             description,
//             reportedBy
//         } = req.body;

//         const pothole = new Pothole({
//             image: req.file ? req.file.location : null, // S3 URL
//             location: {
//                 latitude: parseFloat(latitude),
//                 longitude: parseFloat(longitude),
//                 address: address || 'Unknown location'
//             },
//             severity,
//             position,
//             description,
//             reportedBy: reportedBy || 'Anonymous'
//         });

//         console.log("pothole", pothole)

//         await pothole.save();
//         res.status(201).json({
//             success: true,
//             message: 'Pothole reported successfully',
//             data: pothole
//         });
//     } catch (error) {
//         console.error('Error creating pothole:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error reporting pothole',
//             error: error.message
//         });
//     }
// });

// // GET: Fetch all potholes
// app.get('/api/potholes', async (req, res) => {
//     try {
//         const { status, severity, startDate, endDate } = req.query;
//         let query = {};

//         if (status) query.status = status;
//         if (severity) query.severity = severity;
//         if (startDate || endDate) {
//             query.timestamp = {};
//             if (startDate) query.timestamp.$gte = new Date(startDate);
//             if (endDate) query.timestamp.$lte = new Date(endDate);
//         }

//         const potholes = await Pothole.find(query).sort({ timestamp: -1 });
//         res.json({
//             success: true,
//             count: potholes.length,
//             data: potholes
//         });
//     } catch (error) {
//         console.error('Error fetching potholes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching potholes',
//             error: error.message
//         });
//     }
// });

// // GET: Fetch single pothole by ID
// app.get('/api/potholes/:id', async (req, res) => {
//     try {
//         const pothole = await Pothole.findById(req.params.id);
//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }
//         res.json({ success: true, data: pothole });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching pothole',
//             error: error.message
//         });
//     }
// });

// // PUT: Update pothole status
// app.put('/api/potholes/:id', async (req, res) => {
//     try {
//         const { status } = req.body;
//         const pothole = await Pothole.findByIdAndUpdate(
//             req.params.id,
//             { status },
//             { new: true }
//         );

//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Status updated successfully',
//             data: pothole
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error updating pothole',
//             error: error.message
//         });
//     }
// });

// // DELETE: Delete pothole
// app.delete('/api/potholes/:id', async (req, res) => {
//     try {
//         const pothole = await Pothole.findByIdAndDelete(req.params.id);
//         if (!pothole) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Pothole not found'
//             });
//         }

//         // Delete image from S3
//         if (pothole.image) {
//             const key = pothole.image.split('.amazonaws.com/')[1];
//             if (key) {
//                 await s3.deleteObject({
//                     Bucket: process.env.AWS_BUCKET_NAME,
//                     Key: key
//                 }).promise();
//             }
//         }

//         res.json({
//             success: true,
//             message: 'Pothole deleted successfully'
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error deleting pothole',
//             error: error.message
//         });
//     }
// });

// // GET: Statistics
// app.get('/api/stats', async (req, res) => {
//     try {
//         const total = await Pothole.countDocuments();
//         const reported = await Pothole.countDocuments({ status: 'reported' });
//         const inProgress = await Pothole.countDocuments({ status: 'in-progress' });
//         const resolved = await Pothole.countDocuments({ status: 'resolved' });

//         const bySeverity = await Pothole.aggregate([
//             { $group: { _id: '$severity', count: { $sum: 1 } } }
//         ]);

//         res.json({
//             success: true,
//             data: {
//                 total,
//                 byStatus: { reported, inProgress, resolved },
//                 bySeverity: bySeverity.reduce((acc, item) => {
//                     acc[item._id] = item.count;
//                     return acc;
//                 }, {})
//             }
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching statistics',
//             error: error.message
//         });
//     }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server running on port ${PORT}`);
// });


// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const { uploadToS3 } = require('./config/awsConfig');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// ---------------- Pothole Schema ----------------
const potholeSchema = new mongoose.Schema({
    image: String,
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    severity: {
        type: String,
        enum: ['mild', 'severe', 'dangerous'],
        required: true
    },
    position: {
        type: String,
        enum: ['left', 'middle', 'right', 'full-width'],
        required: true
    },
    description: String,
    status: {
        type: String,
        enum: ['reported', 'in-progress', 'resolved'],
        default: 'reported'
    },
    reportedBy: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Pothole = mongoose.model('Pothole', potholeSchema);

// ---------------- Multer (Memory Storage) ----------------
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'));
    }
});

// ---------------- POST: Create New Pothole ----------------
app.post('/api/potholes', upload.single('image'), async (req, res) => {
    try {
        const { latitude, longitude, address, severity, position, description, reportedBy } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        // Upload image to S3
        const fileName = `potholes/${Date.now()}_${req.file.originalname}`;
        const imageUrl = await uploadToS3(req.file.buffer, fileName, req.file.mimetype);

        const pothole = new Pothole({
            image: imageUrl,
            location: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address: address || 'Unknown location'
            },
            severity,
            position,
            description,
            reportedBy: reportedBy || 'Anonymous'
        });

        await pothole.save();

        res.status(201).json({
            success: true,
            message: '✅ Pothole reported successfully',
            data: pothole
        });
    } catch (error) {
        console.error('❌ Error creating pothole:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- GET: All Potholes ----------------
app.get('/api/potholes', async (req, res) => {
    try {
        const potholes = await Pothole.find().sort({ createdAt: -1 });
        res.json({ success: true, count: potholes.length, data: potholes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- GET: Single Pothole ----------------
app.get('/api/potholes/:id', async (req, res) => {
    try {
        const pothole = await Pothole.findById(req.params.id);
        if (!pothole) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: pothole });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- PUT: Update Pothole Status ----------------
app.put('/api/potholes/:id', async (req, res) => {
    try {
        const pothole = await Pothole.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!pothole) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Status updated', data: pothole });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- DELETE: Remove Pothole ----------------
app.delete('/api/potholes/:id', async (req, res) => {
    try {
        const pothole = await Pothole.findByIdAndDelete(req.params.id);
        if (!pothole) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Pothole deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- STATS ----------------
app.get('/api/stats', async (req, res) => {
    try {
        const total = await Pothole.countDocuments();
        const reported = await Pothole.countDocuments({ status: 'reported' });
        const inProgress = await Pothole.countDocuments({ status: 'in-progress' });
        const resolved = await Pothole.countDocuments({ status: 'resolved' });
        res.json({
            success: true,
            data: { total, reported, inProgress, resolved }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
