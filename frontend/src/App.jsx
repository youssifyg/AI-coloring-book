import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [childName, setChildName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    // Fetch templates on mount
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/templates`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        } else {
          // fallback data in case backend isn't ready
          setTemplates([
            { id: '1', title: 'مغامرات الفضاء', subtitle: 'رحلة إلى النجوم', icon: '🚀', description: 'استكشف الكواكب مع أصدقائك الفضائيين!' },
            { id: '2', title: 'الغابة السحرية', subtitle: 'حيوانات وأشجار', icon: '🌲', description: 'لوّن الحيوانات اللطيفة في الغابة!' },
            { id: '3', title: 'قلعة الأميرة', subtitle: 'فرسان وتنانين', icon: '👑', description: 'مغامرة في قلعة خيالية مليئة بالسحر!' }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        // fallback data
        setTemplates([
          { id: '1', title: 'مغامرات الفضاء', subtitle: 'رحلة إلى النجوم', icon: '🚀', description: 'استكشف الكواكب مع أصدقائك الفضائيين!' },
          { id: '2', title: 'الغابة السحرية', subtitle: 'حيوانات وأشجار', icon: '🌲', description: 'لوّن الحيوانات اللطيفة في الغابة!' },
          { id: '3', title: 'قلعة الأميرة', subtitle: 'فرسان وتنانين', icon: '👑', description: 'مغامرة في قلعة خيالية مليئة بالسحر!' }
        ]);
      }
    };
    fetchTemplates();
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setSuccess(false);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setSuccess(false);
      setError('');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleGenerate = async () => {
    if (!childName || !photo || !selectedTemplateId) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    setProgress(0);
    
    const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.floor(Math.random() * 4) + 1 : prev));
    }, 1500); // 1.5s interval to pace out the ~30s generation time

    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('templateId', selectedTemplateId);
      formData.append('childName', childName);

      const response = await fetch(`${API_BASE_URL}/api/generate-book`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في إنشاء الكتاب. يرجى المحاولة مرة أخرى.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `كتاب-تلوين-${childName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع!');
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setProgress(0), 3000);
      setLoading(false);
    }
  };

  const isFormValid = childName.trim() !== '' && photo !== null && selectedTemplateId !== null;

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="main-title">كتاب التلوين السحري ✨</h1>
        <p className="subtitle">حوّل صورتك إلى كتاب تلوين مليء بالمغامرات!</p>
      </header>

      <main className="main-content">
        {/* Step 1 */}
        <section className="card step-card">
          <div className="step-header">
            <span className="step-number">١</span>
            <h2>اسم الطفل/الطفلة</h2>
          </div>
          <input
            type="text"
            className="name-input"
            placeholder="مثال: يوسف، فاطمة..."
            value={childName}
            onChange={(e) => {
              setChildName(e.target.value);
              setSuccess(false);
            }}
          />
        </section>

        {/* Step 2 */}
        <section className="card step-card">
          <div className="step-header">
            <span className="step-number">٢</span>
            <h2>📸 ارفع صورة الطفل/الطفلة</h2>
          </div>
          <div 
            className="drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            {photoPreview ? (
              <div className="photo-preview-container">
                <img src={photoPreview} alt="Preview" className="photo-preview" />
                <p className="upload-hint">اضغط أو اسحب صورة أخرى للتغيير</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">☁️</div>
                <p>اضغط هنا لاختيار صورة، أو اسحب الصورة وأفلتها هنا</p>
              </div>
            )}
          </div>
        </section>

        {/* Step 3 */}
        <section className="card step-card">
          <div className="step-header">
            <span className="step-number">٣</span>
            <h2>اختر عالم المغامرة</h2>
          </div>
          <div className="gender-section">
            <h3 className="gender-title">قوالب البنات 👧</h3>
            <div className="templates-grid">
              {templates.filter(t => t.gender === 'girl').map(template => (
                <div 
                  key={template.id} 
                  className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    setSuccess(false);
                  }}
                >
                  <div className="template-icon">{template.icon}</div>
                  <h3 className="template-title">{template.title}</h3>
                  <p className="template-subtitle">{template.subtitle}</p>
                  <p className="template-desc">{template.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="gender-section" style={{ marginTop: '2rem' }}>
            <h3 className="gender-title">قوالب الأولاد 👦</h3>
            <div className="templates-grid">
              {templates.filter(t => t.gender === 'boy').map(template => (
                <div 
                  key={template.id} 
                  className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    setSuccess(false);
                  }}
                >
                  <div className="template-icon">{template.icon}</div>
                  <h3 className="template-title">{template.title}</h3>
                  <p className="template-subtitle">{template.subtitle}</p>
                  <p className="template-desc">{template.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Generate & Status */}
        <div className="action-section">
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">تم إنشاء الكتاب بنجاح! 🎉 يرجى تفقد التنزيلات.</div>}
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p className="loading-text">جاري إنشاء كتاب التلوين السحري... ✨</p>
              <p className="loading-subtext">الرسام الذكي يعمل على صفحات الكتاب 🎨</p>
            </div>
          ) : (
            <button 
              className={`generate-btn ${!isFormValid ? 'disabled' : ''}`}
              onClick={handleGenerate}
              disabled={!isFormValid}
            >
              🚀 اصنع كتاب التلوين والطباعة الآن!
            </button>
          )}

          {progress > 0 && (
            <div style={{ marginTop: '20px', width: '100%', direction: 'rtl' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                جاري رسم وتلوين الصفحات بالذكاء الاصطناعي... {progress}%
              </div>
              <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', height: '20px', direction: 'ltr' }}>
                <div style={{ width: `${progress}%`, backgroundColor: '#4caf50', height: '100%', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
