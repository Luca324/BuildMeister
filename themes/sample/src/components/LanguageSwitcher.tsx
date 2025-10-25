import React, { useState, useEffect } from 'react';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('no');
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  // Загружаем сохраненный язык из cookie при монтировании компонента
  useEffect(() => {
    const savedLanguage = getCookie('language') || 'no';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Функция для работы с cookies
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const setCookie = (name: string, value: string, days: number = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    setCookie('language', languageCode);
    setIsOpen(false);
    
    // Перезагружаем страницу для применения нового языка
    window.location.reload();
  };

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div>
        <button
          type="button"
          className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="text-lg">{currentLanguageData.flag}</span>
          <span className="ml-1">{currentLanguageData.name}</span>
          <svg
            className={`-mr-1 h-5 w-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {languages.map((language) => (
              <button
                key={language.code}
                className={`${
                  currentLanguage === language.code
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700'
                } group flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100`}
                onClick={() => handleLanguageChange(language.code)}
                role="menuitem"
              >
                <span className="text-lg mr-3">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {currentLanguage === language.code && (
                  <svg
                    className="ml-auto h-4 w-4 text-green-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
