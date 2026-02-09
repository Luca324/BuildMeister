#!/usr/bin/env node

/**
 * Диагностический скрипт для проверки сканирования компонентов
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getEnabledExtensions } from '../node_modules/@evershop/evershop/dist/bin/extension/index.js';
import { getCoreModules } from '../node_modules/@evershop/evershop/dist/bin/lib/loadModules.js';
import { scanRouteComponents } from '../node_modules/@evershop/evershop/dist/lib/componee/scanForComponents.js';
import { getConfig } from '../node_modules/@evershop/evershop/dist/lib/util/getConfig.js';
import { isProductionMode } from '../node_modules/@evershop/evershop/dist/lib/util/isProductionMode.js';
import { isDevelopmentMode } from '../node_modules/@evershop/evershop/dist/lib/util/isDevelopmentMode.js';

console.log('Production mode:', isProductionMode());
console.log('Development mode:', isDevelopmentMode());

const extensionsConfig = getConfig('system.extensions', []);
console.log('\n=== Расширения из config ===');
extensionsConfig.forEach(ext => {
  console.log(`- ${ext.name}: ${ext.resolve}, enabled: ${ext.enabled}`);
  const distPath = resolve(process.cwd(), ext.resolve, 'dist');
  const srcPath = resolve(process.cwd(), ext.resolve, 'src');
  console.log(`  dist exists: ${existsSync(distPath)}, src exists: ${existsSync(srcPath)}`);
});

const route = { id: 'account', isAdmin: false };
const enabledExtensions = getEnabledExtensions();
console.log('\n=== Загруженные расширения ===');
enabledExtensions.forEach(ext => {
  console.log(`- ${ext.name}: ${ext.path}`);
});

const modules = [...getCoreModules(), ...enabledExtensions];

console.log('\n=== Модули для сканирования ===');
modules.forEach(m => {
  console.log(`- ${m.name}: ${m.path}`);
});

console.log('\n=== Сканирование компонентов для route: account ===');
const components = scanRouteComponents(route, modules);

console.log(`\nНайдено компонентов: ${Object.keys(components).length}`);
console.log('\nКомпоненты:');
Object.entries(components).forEach(([key, path]) => {
  console.log(`  ${key}: ${path}`);
  if (key.includes('OrderHistory')) {
    console.log(`    ⭐ OrderHistory найден!`);
    // Проверяем layout
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      const layoutRegex = /export\s+const\s+layout\s*=\s*{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*,*\s*}/;
      const match = content.match(layoutRegex);
      if (match) {
        console.log(`    ✅ Layout найден: areaId=${match[1]}, sortOrder=${match[2]}`);
      } else {
        console.log(`    ❌ Layout НЕ найден в файле`);
        const layoutIndex = content.indexOf('export const layout');
        if (layoutIndex >= 0) {
          console.log(`    Содержимое вокруг layout:`, content.substring(Math.max(0, layoutIndex - 50), layoutIndex + 200));
        }
      }
    }
  }
});

console.log('\n=== Проверка OrderHistory компонентов ===');
const orderHistoryComponents = Object.entries(components).filter(([key]) => key.includes('OrderHistory'));
if (orderHistoryComponents.length === 0) {
  console.log('❌ OrderHistory компоненты НЕ найдены при сканировании!');
} else {
  console.log(`✅ Найдено OrderHistory компонентов: ${orderHistoryComponents.length}`);
  orderHistoryComponents.forEach(([key, path]) => {
    console.log(`  - ${key}: ${path}`);
  });
}

