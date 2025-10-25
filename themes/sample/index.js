// Sample EverShop Theme
// This file registers the theme components with EverShop

module.exports = {
  name: 'sample',
  version: '1.0.0',
  description: 'Sample theme with language switcher',
  components: {
    // Register all theme components
    'pages/all/EveryWhere': require('./dist/pages/all/EveryWhere.js'),
    'pages/all/HeaderLanguageSwitcher': require('./dist/pages/all/HeaderLanguageSwitcher.js'),
    'pages/homepage/OnlyHomePage': require('./dist/pages/homepage/OnlyHomePage.js'),
    'components/LanguageSwitcher': require('./dist/components/LanguageSwitcher.js')
  }
};

