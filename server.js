const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 تخزين رسائل الشات
let chatMessages = [];

// 🔥 ردود تلقائية
const autoResponses = {
    'مشكلة': 'أخبرني بالضبط ما المشكلة التي تواجهها؟',
    'خطأ': 'ما هي رسالة الخطأ التي تظهر لك؟',
    'رفع': 'لرفع الملفات: اضغط على المنطقة المنقطة أو اسحب الملفات',
    'لا يعمل': 'تأكد من أن السيرفر شغال وأن الملفات مسموح بها',
    'شكراً': 'العفو! 😊 هل تحتاج مساعدة أخرى؟',
    'مساعدة': 'أنا هنا لمساعدتك! ما هي مشكلتك؟',
    'مرحبا': 'مرحباً! 👋 كيف يمكنني مساعدتك اليوم؟',
    'السلام': 'وعليكم السلام! كيف يمكنني مساعدتك؟',
    'شغال': 'أهلاً! 🎉 سعيد لأن النظام شغال معك',
    'كيف': 'أخبرني بالتفصيل ما الذي تريد معرفته؟'
};

// إعدادات السحابة
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// إنشاء مجلد التحميلات
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ تم إنشاء مجلد التحميلات');
}

// إعداد multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_ء-ي\s]/g, '_');
        cb(null, safeName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// خدمة الملفات الثابتة
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname)));

// 🔥 routes الشات
app.get('/chat', (req, res) => {
    res.json({ messages: chatMessages });
});

app.post('/chat', express.json(), (req, res) => {
    try {
        const { name, message } = req.body;
        
        if (!name || !message) {
            return res.status(400).json({ success: false, error: 'الاسم والرسالة مطلوبان' });
        }

        const newMessage = {
            id: Date.now(),
            name: name,
            message: message,
            timestamp: new Date().toLocaleString('ar-SA'),
            type: 'user'
        };

        chatMessages.push(newMessage);
        
        // 🔥 رد تلقائي
        let autoReply = null;
        for (const [keyword, response] of Object.entries(autoResponses)) {
            if (message.includes(keyword)) {
                autoReply = {
                    id: Date.now() + 1,
                    name: 'مساعد النظام',
                    message: response,
                    timestamp: new Date().toLocaleString('ar-SA'),
                    type: 'bot'
                };
                chatMessages.push(autoReply);
                break;
            }
        }
        
        // إذا ما في رد تلقائي، أضف رسالة ترحيب
        if (!autoReply && chatMessages.length <= 2) {
            autoReply = {
                id: Date.now() + 1,
                name: 'مساعد النظام',
                message: 'مرحباً بك في شات الدعم! 💬 كيف يمكنني مساعدتك؟',
                timestamp: new Date().toLocaleString('ar-SA'),
                type: 'bot'
            };
            chatMessages.push(autoReply);
        }
        
        // حفظ فقط آخر 100 رسالة
        if (chatMessages.length > 100) {
            chatMessages = chatMessages.slice(-100);
        }

        res.json({ 
            success: true, 
            message: 'تم إرسال الرسالة',
            autoReply: autoReply
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ في إرسال الرسالة' 
        });
    }
});

// routes الملفات
app.get('/files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'خطأ في قراءة الملفات' });
        }
        
        const fileList = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                url: `/uploads/${file}`,
                size: stats.size,
                uploaded: stats.mtime
            };
        });
        
        res.json({ files: fileList });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'لم يتم اختيار أي ملفات' 
            });
        }
        
        const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
        
        res.json({ 
            success: true, 
            message: `تم رفع ${req.files.length} ملف بنجاح!`,
            files: fileUrls
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ أثناء الرفع' 
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 ** نظام التخزين السحابي مع الشات **');
    console.log('='.repeat(60));
    console.log(`💻 السيرفر شغال على: http://localhost:${PORT}`);
    console.log(`📁 مجلد التحميلات: ${uploadsDir}`);
    console.log(`💬 نظام الشات: جاهز ✅`);
    console.log('='.repeat(60));
});

