export const messages = {
  en: {
    retry: 'Retry',
    loading: 'Loading...'
  }
};

let currentLocale = 'en';
export function setLocale(locale) { currentLocale = locale || 'en'; }
export function t(key) { return (messages[currentLocale] && messages[currentLocale][key]) || key; }


