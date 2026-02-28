#!/usr/bin/env node

/**
 * Скрипт автоматической компиляции всех расширений и темы перед сборкой приложения
 * 
 * Этот скрипт гарантирует, что все расширения и тема будут скомпилированы
 * перед выполнением npm run build, что устраняет проблему нестабильного
 * попадания компонентов в production bundle.
 * 
 * Использование:
 *   - Автоматически вызывается через prebuild hook в package.json
 *   - Можно запустить вручную: node scripts/compile-extensions.js
 */

import { execSync } from 'child_process';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '..');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'yellow');
}

// Проверка наличия package.json и скрипта compile
function hasCompileScript(packageJsonPath) {
  if (!existsSync(packageJsonPath)) {
    return false;
  }
  
  try {
    const packageJson = JSON.parse(
      readFileSync(packageJsonPath, 'utf8')
    );
    return packageJson.scripts && packageJson.scripts.compile;
  } catch (error) {
    return false;
  }
}

// Компиляция одного модуля
function compileModule(name, path) {
  const packageJsonPath = resolve(path, 'package.json');
  
  if (!hasCompileScript(packageJsonPath)) {
    logInfo(`Пропуск ${name}: нет скрипта compile в package.json`);
    return true;
  }

  try {
    // Удаляем старую папку dist для чистоты сборки
    const distPath = resolve(path, 'dist');
    if (existsSync(distPath)) {
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${distPath}"`, { cwd: path, stdio: 'pipe' });
      } else {
        execSync(`rm -rf "${distPath}"`, { cwd: path, stdio: 'pipe' });
      }
    }
    
    // Выполняем компиляцию
    execSync('npm run compile', { 
      cwd: path, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Проверяем, что dist создалась и не пустая
    if (existsSync(distPath)) {
      const distContents = readdirSync(distPath);
      if (distContents.length === 0) {
        logError(`${name}: папка dist пуста после компиляции`);
        return false;
      }
      return true;
    } else {
      logError(`${name}: папка dist не была создана`);
      return false;
    }
  } catch (error) {
    logError(`Ошибка компиляции ${name}: ${error.message}`);
    return false;
  }
}

// Главная функция
function main() {
  let hasErrors = false;
  
  // Компилируем тему
  const themePath = resolve(rootPath, 'themes/tech');
  if (existsSync(themePath)) {
    if (!compileModule('темы tech', themePath)) {
      hasErrors = true;
    }
  } else {
    logInfo('Тема tech не найдена, пропуск');
  }
  
  // Компилируем расширения
  const extensionsPath = resolve(rootPath, 'extensions');
  if (existsSync(extensionsPath)) {
    const extensions = readdirSync(extensionsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort(); // Сортируем для предсказуемого порядка
    
    if (extensions.length === 0) {
      logInfo('Расширения не найдены');
    } else {
      logStep(`Найдено расширений: ${extensions.length}`);
      
      for (const ext of extensions) {
        const extPath = resolve(extensionsPath, ext);
        if (!compileModule(`расширения ${ext}`, extPath)) {
          hasErrors = true;
        }
      }
    }
  } else {
    logInfo('Папка extensions не найдена');
  }
  
  // Итоговый результат
  if (hasErrors) {
    logError('\n⚠️  Компиляция завершена с ошибками!', 'bright');
    logError('Проверьте ошибки выше и исправьте их перед сборкой приложения.');
    process.exit(1);
  } else {
    logSuccess('\n🎉 Все расширения и тема успешно скомпилированы!', 'bright');
    log('Теперь можно выполнять npm run build\n', 'cyan');
  }
}

// Запуск
main();

