/**
 * 🔐 БЕЗОПАСНАЯ СИСТЕМА АУТЕНТИФИКАЦИИ
 * 
 * ВАЖНО: Прочитайте все комментарии и следуйте рекомендациям!
 */

// ⚠️ НИКОГДА НЕ РАСКРЫВАЙТЕ ЭТИ ЗНАЧЕНИЯ В КОДЕ!
// Используйте переменные окружения (.env файл)
// Для локального тестирования используйте временные значения

const AUTH_CONFIG = {
  // 🚨 ПЕРЕМЕСТИТЬ В .env или серверные переменные окружения
  BIN_ID: process.env.JSONBIN_ID || "6a98820eda38895dfe310361",
  MASTER_KEY: process.env.JSONBIN_KEY || "", // ПУСТО ДО УСТАНОВКИ
  
  // Параметры безопасности
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 минут
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 минут
  
  // Требования к пароль
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    uppercase: true,      // A-Z
    lowercase: true,      // a-z
    numbers: true,        // 0-9
    special: true         // !@#$%^&*
  }
};

/**
 * ✅ Валидация пароля по требованиям безопасности
 */
function validatePassword(password) {
  const errors = [];
  
  if (password.length < AUTH_CONFIG.PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Пароль должен быть минимум ${AUTH_CONFIG.PASSWORD_REQUIREMENTS.minLength} символов`);
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.uppercase && !/[A-Z]/.test(password)) {
    errors.push("Пароль должен содержать заглавные буквы (A-Z)");
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.lowercase && !/[a-z]/.test(password)) {
    errors.push("Пароль должен содержать строчные буквы (a-z)");
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.numbers && !/[0-9]/.test(password)) {
    errors.push("Пароль должен содержать цифры (0-9)");
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.special && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Пароль должен содержать спецсимволы (!@#$%^&* и т.д.)");
  }
  
  return { 
    isValid: errors.length === 0, 
    errors 
  };
}

/**
 * 🛡️ ХЕШИРОВАНИЕ пароля (симуляция bcrypt-подобного)
 * В продакшене используйте bcrypt.js или crypto
 */
function hashPassword(password) {
  // ⚠️ ВНИМАНИЕ: Это упрощённая версия!
  // В реальном приложении используйте bcryptjs:
  // const bcrypt = require('bcryptjs');
  // const hash = bcrypt.hashSync(password, 10);
  
  return btoa(password) + "_hash"; // ТОЛЬКО ДЛЯ ДЕМО!
}

/**
 * 🔍 Проверка хеша пароля
 */
function verifyPassword(password, hash) {
  // ⚠️ Упрощённая версия для демо
  // Реальная проверка: bcrypt.compareSync(password, hash)
  
  return hashPassword(password) === hash;
}

/**
 * 🚫 Система защиты от brute-force
 */
class LoginAttemptTracker {
  constructor() {
    this.attempts = new Map(); // { username: { count, lastAttempt, isLocked } }
  }
  
  /**
   * Проверить, заблокирован ли пользователь
   */
  isLocked(username) {
    const attempt = this.attempts.get(username);
    if (!attempt) return false;
    
    if (attempt.isLocked) {
      const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
      if (timeSinceLastAttempt >= AUTH_CONFIG.LOCKOUT_DURATION_MS) {
        // Разблокировка после истечения времени
        this.reset(username);
        return false;
      }
      return true;
    }
    return false;
  }
  
  /**
   * Записать неудачную попытку входа
   */
  recordFailedAttempt(username) {
    let attempt = this.attempts.get(username);
    if (!attempt) {
      attempt = { count: 0, lastAttempt: Date.now(), isLocked: false };
    }
    
    attempt.count++;
    attempt.lastAttempt = Date.now();
    
    if (attempt.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      attempt.isLocked = true;
      console.warn(`⚠️ Пользователь ${username} заблокирован после ${attempt.count} попыток`);
    }
    
    this.attempts.set(username, attempt);
  }
  
  /**
   * Сбросить счётчик при успешном входе
   */
  recordSuccessfulAttempt(username) {
    this.attempts.delete(username);
  }
  
  /**
   * Сбросить попытки для пользователя
   */
  reset(username) {
    this.attempts.delete(username);
  }
}

const loginTracker = new LoginAttemptTracker();

/**
 * 🔐 Безопасный вход с защитой
 */
async function secureLogin(username, password) {
  // 1. Базовая валидация
  if (!username || !password) {
    return { 
      success: false, 
      error: "Логин и пароль обязательны" 
    };
  }
  
  // 2. Проверка блокировки (brute-force защита)
  if (loginTracker.isLocked(username)) {
    const remainingTime = Math.ceil(AUTH_CONFIG.LOCKOUT_DURATION_MS / 1000 / 60);
    return { 
      success: false, 
      error: `Аккаунт заблокирован. Попробуйте через ${remainingTime} минут` 
    };
  }
  
  try {
    // 3. Загрузить данные пользователей
    const cloudData = await loadCloudDataSecurely();
    
    // 4. Найти пользователя
    const user = cloudData.users?.find(u => 
      u.login.toLowerCase() === username.toLowerCase()
    );
    
    if (!user) {
      loginTracker.recordFailedAttempt(username);
      return { 
        success: false, 
        error: "Неверные учётные данные" 
      };
    }
    
    // 5. Проверить пароль
    // В продакшене используйте: bcrypt.compareSync(password, user.passwordHash)
    if (!verifyPassword(password, user.passwordHash)) {
      loginTracker.recordFailedAttempt(username);
      return { 
        success: false, 
        error: "Неверные учётные данные" 
      };
    }
    
    // 6. Успешный вход
    loginTracker.recordSuccessfulAttempt(username);
    
    // 7. Создать безопасную сессию
    const sessionToken = generateSessionToken();
    const sessionData = {
      token: sessionToken,
      username: user.login,
      role: user.role,
      loginTime: Date.now(),
      expiresAt: Date.now() + AUTH_CONFIG.SESSION_TIMEOUT_MS
    };
    
    // 8. Сохранить в защищённое хранилище
    storeSession(sessionData);
    
    return { 
      success: true, 
      message: "Успешный вход",
      sessionToken,
      user: {
        username: user.login,
        role: user.role,
        email: user.email
      }
    };
    
  } catch (error) {
    console.error("🔴 Ошибка входа:", error);
    return { 
      success: false, 
      error: "Внутренняя ошибка сервера" 
    };
  }
}

/**
 * 🛡️ Безопасная регистрация
 */
async function secureRegister(username, email, password) {
  // 1. Валидация пароля
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    return { 
      success: false, 
      errors: passwordCheck.errors 
    };
  }
  
  // 2. Валидация логина
  if (!username || username.length < 3) {
    return { 
      success: false, 
      error: "Логин должен быть минимум 3 символа" 
    };
  }
  
  // 3. Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { 
      success: false, 
      error: "Некорректный email адрес" 
    };
  }
  
  try {
    // 4. Проверить, не занят ли логин
    const cloudData = await loadCloudDataSecurely();
    if (cloudData.users?.some(u => u.login.toLowerCase() === username.toLowerCase())) {
      return { 
        success: false, 
        error: "Этот логин уже занят" 
      };
    }
    
    // 5. Проверить, не занят ли email
    if (cloudData.users?.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { 
        success: false, 
        error: "Этот email уже используется" 
      };
    }
    
    // 6. Создать новый пользователь с хешированным паролем
    const newUser = {
      login: username.trim(),
      email: email.trim(),
      passwordHash: hashPassword(password), // ✅ Пароль хешируется!
      role: "master",
      createdAt: new Date().toISOString()
    };
    
    // 7. НЕ сохранять пароль в открытом виде!
    cloudData.users = [...(cloudData.users || []), newUser];
    
    // 8. Сохранить в облако
    await saveCloudDataSecurely(cloudData);
    
    return { 
      success: true, 
      message: "Регистрация успешна. Теперь войдите в систему" 
    };
    
  } catch (error) {
    console.error("🔴 Ошибка регистрации:", error);
    return { 
      success: false, 
      error: "Внутренняя ошибка сервера" 
    };
  }
}

/**
 * 🔑 Генерация безопасного токена сессии
 */
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 💾 Сохранить сессию в защищённое хранилище
 */
function storeSession(sessionData) {
  // ✅ НЕ сохраняем пароль!
  // ✅ Используем sessionsStorage (удаляется при закрытии вкладки)
  sessionStorage.setItem('authToken', sessionData.token);
  sessionStorage.setItem('sessionData', JSON.stringify({
    username: sessionData.username,
    role: sessionData.role,
    expiresAt: sessionData.expiresAt
  }));
}

/**
 * ✅ Проверить валидность сессии
 */
function isSessionValid() {
  const token = sessionStorage.getItem('authToken');
  const sessionData = sessionStorage.getItem('sessionData');
  
  if (!token || !sessionData) return false;
  
  const session = JSON.parse(sessionData);
  if (Date.now() > session.expiresAt) {
    // Сессия истекла
    clearSession();
    return false;
  }
  
  return true;
}

/**
 * 🚪 Безопасный выход
 */
function clearSession() {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('sessionData');
  localStorage.removeItem('currentUser'); // Удалить старые данные
  localStorage.removeItem('isAdminAuthorized');
}

/**
 * 📡 Безопасная загрузка данных
 */
async function loadCloudDataSecurely() {
  if (!AUTH_CONFIG.MASTER_KEY) {
    throw new Error("🔴 КРИТИЧЕСКАЯ ОШИБКА: Master Key не установлен!");
  }
  
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${AUTH_CONFIG.BIN_ID}/latest`, {
      headers: { "X-Master-Key": AUTH_CONFIG.MASTER_KEY }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    return data.record || {};
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    throw error;
  }
}

/**
 * 💾 Безопасное сохранение данных
 */
async function saveCloudDataSecurely(cloudData) {
  if (!AUTH_CONFIG.MASTER_KEY) {
    throw new Error("🔴 КРИТИЧЕСКАЯ ОШИБКА: Master Key не установлен!");
  }
  
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${AUTH_CONFIG.BIN_ID}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        "X-Master-Key": AUTH_CONFIG.MASTER_KEY 
      },
      body: JSON.stringify(cloudData)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (error) {
    console.error("Ошибка сохранения данных:", error);
    throw error;
  }
}

// ✅ Экспортируем функции
window.SecureAuth = {
  validatePassword,
  secureLogin,
  secureRegister,
  isSessionValid,
  clearSession,
  loadCloudDataSecurely,
  saveCloudDataSecurely
};
