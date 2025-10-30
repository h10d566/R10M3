async function uploadFile() {
    // الكود الذي كتبته...
}

// كود سحب وإفلات الملفات
const uploadArea = document.querySelector('.upload-area');
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = '#f0f3ff';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ddd';
    uploadArea.style.background = '#f8f9ff';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    document.getElementById('fileInput').files = files;
    const fileNames = Array.from(files).map(file => file.name).join(', ');
    alert(`تم اختيار ${files.length} ملف عبر السحب: ${fileNames}`);
});