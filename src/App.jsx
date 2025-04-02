import { useState, useEffect } from 'react';
import './App.css';
import Prayer from './componant/prayer';

function App() {
  const cities = [
    { name: 'القاهرة', value: 'Cairo', lat: 30.0444, lon: 31.2357 },
    { name: 'الإسكندرية', value: 'Alexandria', lat: 31.2156, lon: 29.9553 },
    { name: 'الجيزة', value: 'Giza', lat: 30.0131, lon: 31.2089 },
    { name: 'الأقصر', value: 'Luxor', lat: 25.6872, lon: 32.6396 },
    { name: 'أسوان', value: 'Aswan', lat: 24.0889, lon: 32.8998 },
    // ...add more cities as needed...
  ];

  const [locationMode, setLocationMode] = useState('automatic'); // 'automatic' or 'manual'
  const [selectedCity, setSelectedCity] = useState(cities[0].value);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [prayerTimes, setPrayerTimes] = useState({});
  const [sunrise, setSunrise] = useState('');
  const [midnight, setMidnight] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // New state for location loading
  const [language, setLanguage] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [nextPrayerTime, setNextPrayerTime] = useState({ name: '', time: '', remaining: 0 });
  const [countdown, setCountdown] = useState('');
  const [qiblaDirection, setQiblaDirection] = useState(null);

  const toggleLanguage = () => {
    setLanguage((prevLanguage) => (prevLanguage === 'ar' ? 'en' : 'ar')); // Fixed semicolon
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light')); // Fixed semicolon
  };

  // إضافة دالة تحويل الأرقام العربية إلى إنجليزية
  const toEnglishNumbers = (str) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d));
  };

  useEffect(() => {
    if (locationMode === 'automatic') {
      // Request user's location
      const getLocation = () => {
        setIsFetchingLocation(true); // Start fetching location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const newLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              };
              console.log('Location fetched:', newLocation); // Debugging log
              setLocation(newLocation); // Update location state
              setIsFetchingLocation(false); // Stop fetching location
            },
            (error) => {
              console.error('Error getting location:', error.message); // Improved error logging
              alert('Unable to fetch location. Please enable location services.');
              setIsFetchingLocation(false); // Stop fetching location
            },
            {
              enableHighAccuracy: true, // Use high accuracy for better results
              timeout: 10000, // Timeout after 10 seconds
              maximumAge: 0, // Do not use cached location
            }
          );
        } else {
          console.error('Geolocation is not supported by this browser.');
          alert('Geolocation is not supported by your browser.');
          setIsFetchingLocation(false); // Stop fetching location
        }
      };

      getLocation();
    } else {
      // Set location based on selected city in manual mode
      const city = cities.find((city) => city.value === selectedCity);
      if (city) {
        setLocation({ lat: city.lat, lon: city.lon });
      }
    }
  }, [locationMode, selectedCity]);

  useEffect(() => {
    // Fetch prayer times based on location
    const fetchPrayerTimes = async () => {
      if (location.lat && location.lon) {
        try {
          console.log('Fetching prayer times for location:', location); // Debugging log
          const response = await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${location.lat}&longitude=${location.lon}&method=2`
          );
          const data = await response.json();
          setPrayerTimes(data.data.timings);
          setSunrise(data.data.timings.Sunrise);
          setMidnight(data.data.timings.Midnight);
        } catch (error) {
          console.error('Error fetching prayer times:', error.message); // Improved error logging
        }
      }
    };

    fetchPrayerTimes();
  }, [location]); // Trigger fetchPrayerTimes whenever location changes

  const formattime = (time) => {
    if (!time) {
      return '00:00';
    }
    let [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  };

  const sendNotification = (prayerName, time) => {
    if (!("Notification" in window)) {
      alert("هذا المتصفح لا يدعم التنبيهات");
      return;
    }

    if (Notification.permission === "granted") {
      const notification = new Notification("تنبيه موعد الصلاة", {
        body: `حان موعد صلاة ${prayerName} - ${time}`,
        icon: "/prayer-icon.png", // أضف أيقونة مناسبة
        silent: false
      });

      // إغلاق التنبيه تلقائياً بعد 10 ثواني
      setTimeout(() => notification.close(), 10000);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          sendNotification(prayerName, time);
        }
      });
    }
  };

  const calculateQibla = (lat, lng) => {
    const KAABA = { lat: 21.4225, lng: 39.8262 };
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA.lat * Math.PI / 180;
    const Δλ = (KAABA.lng - lng) * Math.PI / 180;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
    const qibla = Math.atan2(y, x) * 180 / Math.PI;
    setQiblaDirection((qibla + 360) % 360);
  };

  const calculateNextPrayer = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayersList = [
      { name: 'الفجر', time: prayerTimes.Fajr },
      { name: 'الشروق', time: sunrise },
      { name: 'الظهر', time: prayerTimes.Dhuhr },
      { name: 'العصر', time: prayerTimes.Asr },
      { name: 'المغرب', time: prayerTimes.Maghrib },
      { name: 'العشاء', time: prayerTimes.Isha }
    ];

    let nextPrayer = null;
    let minDiff = Infinity;

    prayersList.forEach(prayer => {
      if (!prayer.time) return;

      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      let diff = prayerMinutes - currentMinutes;

      if (diff < 0) {
        diff += 24 * 60; // Add 24 hours if prayer is tomorrow
      }

      if (diff < minDiff) {
        minDiff = diff;
        nextPrayer = { name: prayer.name, time: prayer.time, remaining: diff };
      }
    });

    return nextPrayer;
  };

  useEffect(() => {
    const updateNextPrayer = () => {
      const next = calculateNextPrayer();
      if (next) {
        setNextPrayerTime(next);
        const hours = Math.floor(next.remaining / 60);
        const minutes = next.remaining % 60;
        setCountdown(`${hours} ساعة و ${minutes} دقيقة`);

        // إرسال تنبيه قبل الصلاة بـ 15 دقيقة
        if (next.remaining === 15) {
          sendNotification(next.name, next.time);
        }
      }
    };

    updateNextPrayer();
    const interval = setInterval(updateNextPrayer, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  useEffect(() => {
    if (location.lat && location.lon) {
      calculateQibla(location.lat, location.lon);
    }
  }, [location]);

  return (
    <section id="app">
      <div className="container">
        <div className="toptop">
          <div className="top_sec">
            <div className="city">
              <h3>اختر وضع الموقع</h3>
              <select
                value={locationMode}
                onChange={(e) => setLocationMode(e.target.value)}
              >
                <option value="automatic">تلقائي</option>
                <option value="manual">يدوي</option>
              </select>
              {locationMode === 'manual' && (
                <div>
                  <h3>اختر المدينة</h3>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    {cities.map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {locationMode === 'automatic' && (
                <div>
                  {isFetchingLocation ? (
                    <p>جارٍ الحصول على الموقع...</p>
                  ) : (
                    location.lat &&
                    location.lon && (
                      <div>
                        <h3>الموقع الحالي</h3>
                        <p>خط العرض: {toEnglishNumbers(location.lat.toFixed(4))}</p>
                        <p>خط الطول: {toEnglishNumbers(location.lon.toFixed(4))}</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="date">
            <h3>التاريخ</h3>
            <h4>{toEnglishNumbers(new Date().toLocaleDateString('ar-EG'))}</h4>
          </div>
        </div>
        <div>
          <Prayer Name="الفجر" time={formattime(prayerTimes.Fajr)} />
          <Prayer Name="الشروق" time={formattime(sunrise)} />
          <Prayer Name="الظهر" time={formattime(prayerTimes.Dhuhr)} />
          <Prayer Name="العصر" time={formattime(prayerTimes.Asr)} />
          <Prayer Name="المغرب" time={formattime(prayerTimes.Maghrib)} />
          <Prayer Name="العشاء" time={formattime(prayerTimes.Isha)} />
          <Prayer Name="منتصف الليل" time={formattime(midnight)} />
        </div>
        <div className="next-prayer-info">
          <h3>الصلاة القادمة: {nextPrayerTime.name}</h3>
          <p className="countdown">متبقي: {toEnglishNumbers(countdown)}</p>
          {qiblaDirection && (
            <div className="qibla-direction">
              <h3>اتجاه القبلة</h3>
              <p>{toEnglishNumbers(qiblaDirection.toFixed(1))}°</p>
              <div
                className="qibla-arrow"
                style={{ transform: `rotate(${qiblaDirection}deg)` }}
              >↑</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default App;