
## Написание тем (Themes)

### Что такое тема?

**Тема** в Evershop — это набор компонентов, стилей и статических файлов, которые переопределяют внешний вид и поведение магазина. Тема позволяет полностью изменить дизайн интернет-магазина без изменения основного кода Evershop.

**Отличия от расширений:**
- **Тема** меняет внешний вид и компоненты (один дизайн)
- **Расширение** добавляет новую функциональность (может быть много расширений)
- В системе может быть активна только **одна тема** в момент времени
- Расширения могут работать независимо от темы


### Создание новой темы

Подробнее: [Theme Structure](https://evershop.io/docs/development/theme/theme-overview)

#### Шаг 1: Создание структуры папок

Базовая структура темы выглядит так:

```
themes/my-theme/
├── package.json          # Метаданные и скрипты темы
├── tsconfig.json         # Настройки TypeScript
├── src/                  # Исходный код темы
│   ├── pages/           # Компоненты страниц (организованы по роутам)
│   │   ├── all/         # Компоненты для всех страниц
│   │   ├── homepage/    # Только для главной
│   │   ├── categoryView/# Для страницы категории
│   │   └── productView/ # Для страницы товара
│   ├── components/      # Переопределения компонентов
│   │   └── frontStore/  # Компоненты фронтенда
│   └── css/             # Глобальные стили
│       └── global.scss
└── public/              # Статические файлы (опционально)
    ├── logo.png
    └── favicon.ico
```

#### Шаг 4: Базовый Layout компонент
этот шаг желателен для того, чтобы переопределять стили сразу по всему сайту. достаточно создать `src/css/global.scss` для глобальных стилей темы и импортировать его в Layout компоненте.

пример моего Layout компонента: [Layout.jsx](https://github.com/Luca324/BuildMeister/blob/master/themes/tech/src/pages/all/Layout.jsx)

### Основные компоненты темы

#### 1. src/pages/ — компоненты страниц

Компоненты организованы по роутам Evershop. Структура папок определяет, на каких страницах компонент будет отображаться:

- `all/` — компоненты отображаются на всех страницах
- `homepage/` — только на главной странице
- `categoryView/` — страница категории товаров
- `productView/` — страница отдельного товара
- `catalogSearch/` — результаты поиска

**Пример:** Компонент логотипа для всех страниц

```jsx
// themes/my-theme/src/pages/all/Logo.jsx
import React from "react";

export default function Logo() {
  return (
    <div>
      <a href="/">
        <img src="/logo.png" alt="logo" style={{ maxHeight: "50px" }} />
      </a>
    </div>
  );
}

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
```

#### 2. src/components/ — переопределения компонентов

Вы можете переопределить стандартные компоненты Evershop, создав их копии в теме:

```
src/components/frontStore/catalog/product/list/List.jsx
```

Путь компонента должен точно соответствовать пути в исходном коде Evershop. Тема автоматически заменит стандартный компонент на ваш.

**Пример:** Переопределение списка товаров

```jsx
// themes/my-theme/src/components/frontStore/catalog/product/list/List.jsx
import React from 'react';

export default function ProductList({ products = [], countPerRow = 3 }) {
  // Ваша кастомная реализация
  return (
    <div className="my-custom-product-list">
      {products.map(product => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}
```

#### 3. src/css/ — глобальные стили


#### 4. public/ — статические файлы

Файлы из папки `public/` доступны по корневому пути сайта (например, так они указываются в config/default.json):

```
public/logo.png → доступен как /logo.png
public/favicon.ico → доступен как /favicon.ico
```

### Компиляция и активация темы

#### Компиляция

Перед использованием темы необходимо скомпилировать TypeScript код:

```bash
cd themes/my-theme
npm run tsc
```

#### Активация темы

Активируйте тему в `config/default.json`:

```json
{
  "system": {
    "theme": "my-theme"
  }
}
```

#### Сборка проекта

После активации темы выполните сборку всего проекта. Это создаст необходимые файлы для работы темы.


## Написание расширений (Extensions)

### Что такое расширение?

**Расширение** в Evershop — это модуль, который добавляет новую функциональность в магазин. В отличие от темы, расширения не меняют внешний вид, а добавляют новые возможности: виджеты, фильтры, страницы, GraphQL типы и т.д.

**Примеры расширений:**
- Виджет для отображения категорий
- Кастомные фильтры для товаров
- Дополнительные страницы (например, статусы заказов)
- Интеграции с внешними сервисами

**Ключевые концепции:**
- **getWidgetSetting()** — функция для получения настроек виджета из БД (таблица `WIDGET.settings`)
  - Формат: `{ categories: ["16", "17"] }` (массив строк)
  - Использование: `getWidgetSetting("categories", [])` → `["16", "17"]`
- **Процессоры** — нужны только если виджет использует кастомные фильтры в GraphQL запросах
  - Процессор автоматически преобразует строки в числа для SQL запросов
- **Bootstrap файл** — точка входа расширения, где регистрируется вся функциональность
- **GraphQL типы** — в большинстве случаев НЕ нужны, используются только стандартные запросы Evershop

### Создание нового расширения

Подробнее: [Extensions Documentation](https://evershop.io/docs/development/module)

#### Шаг 1: Создание структуры папок

Базовая структура расширения:

```
extensions/my-extension/
├── package.json          # Метаданные и скрипты
├── tsconfig.json         # Настройки TypeScript
└── src/                  # Исходный код
    ├── bootstrap.ts      # Точка входа, регистрация функциональности
    ├── components/       # React компоненты
    │   └── widgets/      # Компоненты виджетов
    ├── services/         # Сервисы (регистрация фильтров, процессоров)
    └── pages/            # Дополнительные страницы (опционально)
```

**Примечание:** GraphQL типы (`src/graphql/` или `src/types/`) нужны только в редких случаях, когда требуется кастомная обработка данных на сервере. В большинстве случаев достаточно стандартных GraphQL запросов Evershop (`products`, `categories`, `collection`).


### Регистрация функциональности

#### 1. Регистрация виджета

Виджет — это переиспользуемый компонент, который можно добавить на любую страницу через админ-панель.

Подробнее: [Widgets Documentation](https://evershop.io/docs/development/widget)

```typescript
// extensions/my-extension/src/bootstrap.ts
import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  registerWidget({
    type: "my_widget",                    // Уникальный тип виджета
    name: "My Widget",                    // Название в админке
    description: "Описание виджета",      // Описание
    settingComponent: path.resolve(       // Компонент настроек (для админки)
      __dirname,
      "components/widgets/MyWidgetSetting.js"
    ),
    component: path.resolve(              // Основной компонент виджета
      __dirname,
      "components/widgets/MyWidget.js"
    ),
    enabled: true,
    defaultSettings: {                    // Настройки по умолчанию
      title: "Заголовок",
      count: 5,
    },
  });
};
```

**Компонент виджета:**

```jsx
// extensions/my-extension/src/components/widgets/MyWidget.tsx
import React from 'react';
import PropTypes from 'prop-types';

export default function MyWidget({ myWidget }) {
  if (!myWidget) {
    return null;
  }

  return (
    <div className="my-widget">
      <h3>{myWidget.title}</h3>
      {/* Ваш контент */}
    </div>
  );
}

MyWidget.propTypes = {
  myWidget: PropTypes.shape({
    title: PropTypes.string,
  }),
};

/**
 * GraphQL запрос для получения данных виджета
 * 
 * getWidgetSetting() - функция Evershop для получения настроек виджета из БД
 * Настройки сохраняются в таблице WIDGET.settings (JSON) когда администратор
 * настраивает виджет в админ-панели.
 * 
 * Если виджет использует только стандартные запросы Evershop (products, categories),
 * кастомный GraphQL тип не нужен. См. пример ниже.
 */
export const query = `
  query Query($settings: JSON) {
    myWidget(settings: $settings) {
      title
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
```

**Упрощенный пример без кастомного GraphQL:**

Если виджет простой и не требует обработки настроек, можно использовать только стандартные запросы:

```jsx
// Простой виджет - показывает коллекцию товаров
export const query = `
  query Query($collection: String) {
    collection(code: $collection) {
      name
      products { items { name price } }
    }
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection")  // Просто получаем настройку
}`;
```

В этом случае кастомный GraphQL тип и resolver не нужны.

#### 2. Регистрация процессора (фильтр, хук)

Процессоры позволяют модифицировать поведение системы на разных этапах выполнения. Они используются для добавления новых фильтров для коллекций (товаров, категорий и т.д.).

**Зачем нужны процессоры:**
- Виджет использует фильтр в GraphQL запросе (например, `category_id`)
- Без процессора этот фильтр не будет работать
- Процессор добавляет поддержку фильтра в SQL запросы

**Когда НЕ нужны процессоры:**
- Виджет использует только стандартные фильтры Evershop
- Виджет не использует фильтрацию в GraphQL запросах

**Пример:** Регистрация фильтра для коллекций

```typescript
// extensions/my-extension/src/services/registerMyFilter.ts
// @ts-ignore - EverShop resolves these modules at runtime
import { OPERATION_MAP } from '@evershop/evershop/lib/util/filterOperationMap';
// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry';
// @ts-ignore - types resolved at runtime
import { value } from '@evershop/postgres-query-builder';

export default () => {
  addProcessor('categoryCollectionFilters', (filters: any[]) => {
    filters.push({
      key: 'my_custom_field',
      operation: ['eq', 'in'],
      callback: (query: any, operation: string, val: any, currentFilters: any[]) => {
        if (operation === 'eq') {
          query.andWhere('category.my_custom_field', OPERATION_MAP[operation], val);
          currentFilters.push({
            key: 'my_custom_field',
            operation,
            value: val,
          });
        } else if (operation === 'in') {
          query.andWhere('category.my_custom_field', 'IN', value(val));
          currentFilters.push({
            key: 'my_custom_field',
            operation,
            value: val,
          });
        }
      },
    });
    return filters;
  }, 10); // Приоритет обработки
};
```

**Регистрация в bootstrap:**

```typescript
// extensions/my-extension/src/bootstrap.ts
import registerMyFilter from "./services/registerMyFilter.js";

export default () => {
  registerMyFilter();
};
```

#### 3. Регистрация страниц

Страницы регистрируются автоматически через структуру папок `src/pages/`, аналогично темам:

```
extensions/my-extension/src/pages/frontStore/account/MyPage.jsx
```

Компонент автоматически будет доступен на роуте `/account/my-page`.

#### 4. Регистрация GraphQL типов (опционально, редко нужно)

**Важно:** GraphQL типы нужны НЕ для всех расширений. В большинстве случаев они НЕ требуются.

**Когда GraphQL типы НЕ нужны (большинство случаев):**
- Виджет использует стандартные запросы Evershop (`products`, `categories`, `collection`)
- Настройки виджета имеют простой формат (массивы, строки, числа)
- Процессоры могут обработать данные в нужном формате
- Пример: `categories_widget` — использует только стандартный запрос `categories` с фильтром

**Когда GraphQL типы могут понадобиться (редкие случаи):**
- Сложная бизнес-логика обработки настроек на сервере
- Необходимость объединения данных из нескольких источников
- Специфические вычисления, которые нельзя сделать на клиенте
- Кастомные типы данных, которых нет в стандартной схеме Evershop

**Пример расширения БЕЗ GraphQL типов (как `categories_widget`):**
- Настройки: `{ categories: ["16", "17"] }` (простой формат)
- GraphQL запрос: стандартный `categories` с фильтром
- Обработка: процессор преобразует строки в числа
- Результат: код проще, меньше файлов, легче поддерживать

Создайте файл с расширением GraphQL схемы (только если действительно нужен):

```graphql
# extensions/my-extension/src/graphql/types/MyWidget/MyWidget.graphql
"""
Описание типа
"""
type MyWidget {
  title: String
  items: [String]
}

extend type Query {
  myWidget(settings: JSON): MyWidget
}
```

**Создайте resolver для обработки запроса:**

```typescript
// extensions/my-extension/src/graphql/types/MyWidget/MyWidget.resolvers.ts
export default {
  Query: {
    myWidget: async (root: any, { settings }: { settings?: any }) => {
      // Обработка настроек виджета
      // Нормализация данных, валидация и т.д.
      return {
        title: settings?.title || "Default",
        items: settings?.items || []
      };
    }
  }
};
```

Evershop автоматически найдет и загрузит эти файлы при загрузке расширения.

### Компиляция и активация расширения

#### Компиляция

```bash
cd extensions/my-extension
npm run compile
```

Или из корня проекта:

```bash
npm run compile --prefix extensions/my-extension
```

#### Регистрация в конфигурации

Добавьте расширение в `config/default.json`:

```json
{
  "system": {
    "extensions": [
      {
        "name": "my-extension",
        "resolve": "extensions/my-extension",
        "enabled": true,
        "priority": 20
      }
    ]
  }
}
```

**Параметры:**
- `name` — имя расширения (любое, но лучше совпадает с папкой)
- `resolve` — путь к расширению относительно корня проекта
- `enabled` — включено ли расширение
- `priority` — приоритет загрузки (меньше = загружается раньше)

#### Сборка проекта

После регистрации выполните сборку:

```bash
npm run build
```

### Практические примеры

#### Пример 1: Полный пример расширения categories_widget

Этот пример показывает реальное расширение с виджетом и процессором фильтра.

**1. Bootstrap файл** (`src/bootstrap.ts`)

```typescript
// extensions/categories_widget/src/bootstrap.ts
import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";
import registerCategoryIdFilter from "./services/registerCategoryIdFilter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bootstrap функция - точка входа расширения
 * Регистрирует виджет и процессор фильтра
 */
export default () => {
  // Регистрация процессора для фильтра category_id
  // Без этого процессора фильтр category_id не будет работать в GraphQL запросах
  registerCategoryIdFilter();
  
  // Регистрация виджета
  registerWidget({
    type: "categories_widget",
    name: "Categories Widget",
    description: "Display selected categories",
    settingComponent: path.resolve(
      __dirname,
      "components/widgets/CategoriesWidgetSetting.js"
    ),
    component: path.resolve(
      __dirname,
      "components/widgets/CategoriesWidget.js"
    ),
    enabled: true,
    defaultSettings: {
      categories: [],
    },
  });
};
```

**2. Компонент виджета** (`src/components/widgets/CategoriesWidget.tsx`)

```jsx
// extensions/categories_widget/src/components/widgets/CategoriesWidget.tsx
import React from 'react';
import PropTypes from 'prop-types';

export default function CategoriesWidget({ categories }) {
  const categoriesList = Array.isArray(categories) 
    ? categories 
    : (categories?.items || []);
  
  if (!categoriesList || categoriesList.length === 0) {
    return null;
  }

  return (
    <div className="categories__widget">
      {categoriesList.map((category) => (
        <a key={category.uuid} href={category.url}>
          {category.name}
        </a>
      ))}
    </div>
  );
}

/**
 * GraphQL запрос для получения данных виджета
 * 
 * Использует стандартный запрос Evershop categories с фильтром category_id.
 * Фильтр работает благодаря процессору registerCategoryIdFilter().
 * 
 * Формат настроек из БД: { categories: ["16", "17"] } (массив строк)
 * Процессор автоматически преобразует строки в числа для SQL запроса.
 */
export const query = `
  query Query($categoryIds: [String]) {
    categories(filters: [
      {key: "category_id", operation: in, value: $categoryIds}
    ]) {
      items {
        categoryId
        uuid
        name
        url
        image { url alt }
      }
    }
  }
`;

/**
 * GraphQL переменные
 * 
 * getWidgetSetting("categories", []) - получает массив ID категорий из настроек виджета
 * 
 * Формат: ["16", "17"] (массив строк из БД)
 * Процессор преобразует строки в числа для SQL запроса
 */
export const variables = `{
  categoryIds: getWidgetSetting("categories", [])
}`;
```

**3. Компонент настроек виджета** (`src/components/widgets/CategoriesWidgetSetting.tsx`)

Компонент для настройки виджета в админ-панели. Позволяет администратору выбрать категории для отображения.

```jsx
// extensions/categories_widget/src/components/widgets/CategoriesWidgetSetting.tsx
export default function CategoriesWidgetSetting({
  categoriesWidget: { categories = [] },
}) {
  // Настройки приходят через props автоматически из БД
  // Формат: { categories: ["16", "17"] } (массив строк)
  
  // Обрабатываем формат настроек (массив строк → массив чисел)
  const initialCategories: number[] = Array.isArray(categories) 
    ? categories.map((c: string | number) => typeof c === 'string' ? parseInt(c, 10) : c)
      .filter((id: number) => !isNaN(id))
    : [];
  
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<number[]>(initialCategories);
  
  // UI для выбора категорий
  // Сохраняет выбранные категории в settings.categories
  return (
    <div>
      {/* Форма выбора категорий */}
    </div>
  );
}

// GraphQL запрос не требуется - настройки приходят через props
```

**4. Процессор фильтра** (`src/services/registerCategoryIdFilter.ts`)

```typescript
// extensions/categories_widget/src/services/registerCategoryIdFilter.ts
import { addProcessor } from '@evershop/evershop/lib/util/registry';
import { value } from '@evershop/postgres-query-builder';

export default () => {
  /**
   * Регистрация процессора для фильтра category_id
   * 
   * Без этого процессора фильтр category_id не будет работать в GraphQL запросах
   * Процессор добавляет SQL условие: WHERE category.category_id IN (1, 2, 3)
   */
  addProcessor('categoryCollectionFilters', (filters: any[]) => {
    filters.push({
      key: 'category_id',
      operation: ['in', 'eq'],
      callback: (query: any, operation: string, val: any) => {
        if (operation === 'in') {
          const ids = Array.isArray(val)
            ? val.map((v) => parseInt(v, 10)).filter((v) => !isNaN(v))
            : [];
          
          if (ids.length > 0) {
            query.andWhere('category.category_id', 'IN', value(ids));
          }
        }
      },
    });
    return filters;
  }, 10);
};
```

**Как это работает вместе:**

1. Администратор настраивает виджет в админ-панели (выбирает категории)
2. Настройки сохраняются в БД (таблица `WIDGET.settings`): `{ categories: ["16", "17"] }`
3. Виджет рендерится на странице
4. `getWidgetSetting("categories", [])` получает массив ID категорий из БД: `["16", "17"]`
5. Массив передается в GraphQL запрос как фильтр `category_id`
6. Процессор `registerCategoryIdFilter` обрабатывает фильтр:
   - Преобразует строки в числа: `["16", "17"]` → `[16, 17]`
   - Добавляет SQL условие: `WHERE category.category_id IN (16, 17)`
7. Виджет получает данные категорий и отображает их

**Структура файлов расширения:**

```
extensions/categories_widget/
├── src/
│   ├── bootstrap.ts                          # Регистрация виджета и процессора
│   ├── components/
│   │   └── widgets/
│   │       ├── CategoriesWidget.tsx         # Основной компонент виджета
│   │       └── CategoriesWidgetSetting.tsx # Компонент настроек (админка)
│   └── services/
│       └── registerCategoryIdFilter.ts      # Процессор фильтра
```

**Ссылки на файлы:**
- [Bootstrap](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/bootstrap.ts)
- [Компонент виджета](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/components/widgets/CategoriesWidget.tsx)
- [Компонент настроек](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/components/widgets/CategoriesWidgetSetting.tsx)
- [Процессор фильтра](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/services/registerCategoryIdFilter.ts)

**Примечание:** GraphQL типы и resolver не требуются, так как:
- Настройки виджета имеют простой формат: `{ categories: ["16", "17"] }` (массив строк)
- Процессор автоматически преобразует строки в числа для SQL запроса
- Виджет использует только стандартный GraphQL запрос `categories`

#### Пример 2: Расширение с фильтром и страницами

```typescript
// extensions/order_status_display/src/bootstrap.ts
export default () => {
  // Компоненты и страницы автоматически обнаруживаются Evershop
  // Дополнительная регистрация не требуется
};
```

Страницы автоматически регистрируются по структуре папок:

```
extensions/order_status_display/src/pages/frontStore/account/
  └── OrderHistoryWithStatuses.tsx  → доступен на /account/order-history-with-statuses
```

## Полезные ссылки

### Официальная документация Evershop

- [Theme Overview](https://evershop.io/docs/development/theme) — общий обзор системы тем
- [The View System](https://evershop.io/docs/development/theme/view-system) — подробно о системе Area и композиции
- [Templating](https://evershop.io/docs/development/theme/templating) — система шаблонов и компонентов
- [Theme Structure](https://evershop.io/docs/development/theme/theme-overview) — структура темы и организация файлов
- [Widgets](https://evershop.io/docs/development/module/widget-development) — документация по виджетам
- [Extensions](https://evershop.io/docs/development/module/extension-development) — документация по расширениям

### Дополнительные ресурсы

- [GraphQL в Evershop](https://evershop.io/docs/development/knowledge-base/graphql) — работа с GraphQL запросами, определение типов и resolvers
- [Data Fetching](https://evershop.io/docs/development/knowledge-base/data-fetching) — как работает получение данных в Evershop

**Примечание:** Документации по процессорам (processors) в официальной документации нет. Процессоры используются для расширения функциональности фильтров в GraphQL запросах. См. примеры в разделе "Регистрация процессора" выше.

