
## Написание тем (Themes)

### Что такое тема?

**Тема** в Evershop — это набор компонентов, стилей и статических файлов, которые переопределяют внешний вид и поведение магазина. Тема позволяет полностью изменить дизайн интернет-магазина без изменения основного кода Evershop.

**Отличия от расширений:**
- **Тема** меняет внешний вид и компоненты (один дизайн)
- **Расширение** добавляет новую функциональность (может быть много расширений)
- В системе может быть активна только **одна тема** в момент времени
- Расширения могут работать независимо от темы


### Создание новой темы

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

### Создание нового расширения

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
    ├── pages/            # Дополнительные страницы (опционально)
    └── types/            # GraphQL типы (опционально)
        └── MyType/
            └── MyType.graphql
```


### Регистрация функциональности

#### 1. Регистрация виджета

Виджет — это переиспользуемый компонент, который можно добавить на любую страницу через админ-панель.

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

// GraphQL запрос для получения данных виджета
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

#### 2. Регистрация процессора (фильтр, хук)

Процессоры позволяют модифицировать поведение системы на разных этапах выполнения.

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

#### 4. Регистрация GraphQL типов

Создайте файл с расширением GraphQL схемы:

```graphql
# extensions/my-extension/src/types/MyWidget/MyWidget.graphql
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

Evershop автоматически найдет и загрузит этот файл.

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

#### Пример 1: Простой виджет

Полный пример виджета для отображения категорий:

```typescript
// extensions/categories_widget/src/bootstrap.ts
import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
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

- [Theme Overview](https://evershop.io/docs/development/theme) — общий обзор системы тем
- [The View System](https://evershop.io/docs/development/theme/view-system) — подробно о системе Area и композиции
- [Templating](https://evershop.io/docs/development/theme/templating) — система шаблонов и компонентов
- [Theme Structure](https://evershop.io/docs/development/theme/theme-overview) — структура темы и организация файлов

