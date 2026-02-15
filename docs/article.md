# Создание интернет-магазина на основе Evershop

# Введение

Делала знакомому сайт интернет-магазина. Чтобы не изобретать велосипед, решила поискать опенсорсное решение, которое останется только кастомизировать. И нашла! Evershop <https://evershop.io>.

О преимуществах Evershop: тут есть весь функционал, необходимый интернет-магазину: оплата stripe/paypal, админ-панель с управлением заказами, интерфейс для управления страницами и внешним видом сайта, а также много фич: статистика по продажам, гибкая система промокодов.

Этот пост — руководство по созданию сайта на основе Evershop, потому что их документация оставляет желать лучшего. Странно, что у такого развитого опенсорсного проекта такая скромная документация. В этой статье я проведу читателя через весь процесс создания сайта интернет-магазина, а также опишу проблемы, с которыми столкнулась, и их решения.

В некоторых местах будет подробно разбираться то, как работает Evershop, чтобы облегчить разработчику работу, если он будет писать собственные расширения, что, скорее всего, понадобится.

Без некоторых патчей, о которых говорится в конце статьи (PayPal), а также знаний, просто описанных в других главах, часть функционала тупо будет недоступна, как, например, PayPal, или пользователю могут кидаться непонятные ошибки типа "cannot read properties of undefined" при оформлении заказа. Поэтому читайте статью до конца, и тогда Evershop действительно станет для вас очень быстрым и простым решением.

# Создание Evershop проекта с нуля по инструкции в документации

Если вы используете данную статью, как руководство, тогда читайте параллельно документацию, т.к. тут я лишь комментирую моменты, на которые следует обратить внимание и которые документация оставляет неясными.

Если вы запускаете приложение не через Docker, тогда вам нужно иметь пустую PostgreSQL базу данных.

Затем запускаете команду `npx create-evershop-app [название проекта]`

```bash
npx create-evershop-app new-clear-evershop-app
```

Далее нужно будет указать хост базы данных, порт, название БД, имя пользователя и его пароль. А также данные администратора.

![Изображение выглядит как текст, снимок экрана, Шрифт, программное обеспечение]()

Будет создана следующая структура файлов

![Изображение выглядит как текст, Шрифт, снимок экрана]()


Часть скриптов в package.json добавляется сразу на этапе create-evershop-app, но часть почему-то нужно добавлять вручную.

![Изображение выглядит как текст, снимок экрана, Шрифт, программное обеспечение]()

Скрипты, которые нас просят добавить

![Изображение выглядит как текст, снимок экрана, Шрифт]()

Скрипты, которые уже есть

Причем скрипт dev нас, получается, просят удалить? Вместо этого предлагается скрипт start:debug, который тоже запускается на порту 3000 и, вероятно, выполняет те же функции. Зачем два скрипта, делающих одно и то же, и почему в ходе первоначальной настройки нам говорят заменить один другим — непонятно.

Мою настройку скриптов можно посмотреть по ссылке <https://github.com/Luca324/BuildMeister/blob/master/package.json>

Далее в документации нас просят запустить скрипт setup. Он снова просит указать информацию о БД и создать пользователя. Скорее всего, он нужен на тот случай, если во время создания проекта эти этапы выполнить не удалось.

![Изображение выглядит как текст, электроника, снимок экрана, программное обеспечение]()

Далее сборка и запуск проекта. Сборка длится довольно долго, может занимать минут 5-10. Поэтому при разработке настоятельно рекомендую использовать dev режим. При открытии каждой страницы будет заново запускаться процесс пересборки, он тоже занимает ощутимое время, иногда до минуты, но это уже лучше, чем пересобирать проект полностью после каждого изменения.

![Изображение выглядит как текст, снимок экрана, Шрифт, программное обеспечение]()

`npm start` и приложение запустится.

### Файлы конфигурации

Также важно создать правильные файлы конфигурации для dev и production режимов. Если вы разрабатываете на localhost, то homeUrl должен быть localhost:3000 и localhost соответственно.

Это необходимо для корректной работы ссылок: чтобы с localhost:3000/home при переходе по ссылке на /admin вы попали на localhost:3000/admin, а не на localhost/admin.

Если сайт размещен на домене, тогда вместо localhost нужно указать ваш домен: <http://yourdomain.ru:3000> и <http://yourdomain.ru> соответственно.


# Написание themes

Тема в Evershop — это набор компонентов, стилей и статических файлов, которые переопределяют внешний вид и поведение магазина.

В системе может быть активна только **одна тема** в момент времени.

Evershop предоставляет тему по умолчанию sample для демонстрационных целей. Но для настройки интерфейса под себя необходимо создать новую тему.

#### Шаг 1: Создание структуры папок

Базовая структура темы выглядит так:

```
themes/my-theme/
├── package.json
├── tsconfig.json
├── src/
│   ├── pages/           # Компоненты страниц (организованы по роутам)
│   │   ├── all/         # Компоненты для всех страниц
│   │   ├── homepage/    # Пример: только для главной
│   │   ├── categoryView/# Пример: для страницы категории
│   │   └── productView/ # Пример: для страницы товара
│   ├── components/      # Переопределения компонентов
│   │   └── frontStore/  # Компоненты фронтенда
│   │   └── admin/       # Компоненты админки
│   └── css/             # Глобальные стили
│       └── global.scss
└── public/              # Статические файлы
    ├── logo.png
    └── favicon.ico
```

Можно просто скопировать содержимое темы по умолчанию sample в качестве основы.

#### Шаг 2: Базовый Layout компонент

Этот шаг желателен для того, чтобы переопределять стили сразу по всему сайту. Достаточно создать `src/css/global.scss` для глобальных стилей темы и импортировать его в Layout компоненте.

Я переопределила Layout.tsx в том числе для того, чтобы поменять местами меню и лого в хедере.

Для этого в themes/tech/src/pages/all вставила копию файла Layout.jsx из исходного кода и внесла необходимые изменения.

Мой Layout компонент смотри здесь: [Layout.jsx](https://github.com/Luca324/BuildMeister/blob/master/themes/tech/src/pages/all/Layout.jsx)

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

Тут можно положить файл global.scss с общими стилями, который можно импортировать, например, в Layout.tsx, либо файлы стилей для отдельных страниц, и импортировать их оттуда.

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

### Сборка проекта

После активации темы выполните сборку всего проекта. Это создаст необходимые файлы для работы темы.

# Написание extensions

**Расширение** — это модуль, который добавляет новую функциональность в магазин. В отличие от темы, расширения не меняют внешний вид, а добавляют новые возможности: виджеты, фильтры, страницы, GraphQL типы и т.д.

**Примеры расширений:**

- Виджет для отображения категорий
- Кастомные фильтры для товаров
- Дополнительные страницы (например, статусы заказов)
- Интеграции с внешними сервисами

## Создание нового расширения

Разберем создание нового расширения на примере создания виджета категорий. У меня он находится на главной странице и показывает список категорий, которые мы выберем в админ-панели.

Подробнее про создание расширений: [Extensions Documentation](https://evershop.io/docs/development/module). (прим.: тут в структуре файлов не упомянута папка components, содержащая widgets, но она содержится в другой статье документации — о создании виджетов (об этом читай дальше))

**Шаг 1: Создание структуры папок**

Базовая структура расширения:

```
extensions/my-extension/
├── package.json
├── tsconfig.json
└── src/
    ├── bootstrap.ts      # Точка входа, регистрация функциональности
    ├── components/       # React компоненты
    │   └── widgets/      # Компоненты виджетов
    ├── services/         # Сервисы (регистрация фильтров, процессоров)
    ├── pages/            # Дополнительные страницы (опционально)
    └── types/            # GraphQL типы (опционально)
        └── MyType/
            └── MyType.graphql
```

*Примечание:* GraphQL типы (`src/graphql/` или `src/types/`) нужны только в редких случаях, когда требуется кастомная обработка данных на сервере. В большинстве случаев достаточно стандартных GraphQL запросов Evershop (`products`, `categories`, `collection`).

### Регистрация функциональности

#### 1. Регистрация виджета

Виджет — это переиспользуемый компонент, который можно добавить на любую страницу через админ-панель.

Подробнее: [Widgets Documentation](https://evershop.io/docs/development/widget)

*Bootstrap функция — точка входа расширения*
* Вызывается при загрузке расширения Evershop
* Здесь регистрируется вся функциональность расширения

```typescript
// extensions/my-extension/src/bootstrap.ts
import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";
import registerCategoryIdFilter from "./services/registerCategoryIdFilter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  // регистрация процессоров (опционально)
  // …

  // Регистрация виджета
  registerWidget({
    type: "categories_widget", // уникальный идентификатор виджета (используется в БД)
    name: "Categories Widget", // название в админке
    description: "Display selected categories", // описание
    settingComponent: path.resolve( // компонент настроек для админки
      __dirname,
      "components/widgets/CategoriesWidgetSetting.js"
    ),
    component: path.resolve( // основной компонент виджета (отображается на фронтенде)
      __dirname,
      "components/widgets/CategoriesWidget.js"
    ),
    enabled: true, // включен ли виджет
    defaultSettings: { categories: [] }, // настройки по умолчанию (сохраняются в БД при создании)
  });
};
```

**Компонент виджета:**

```jsx
// extensions/categories_widget/src/components/widgets/CategoriesWidget.tsx
import React from 'react';
import PropTypes from 'prop-types';

export default function CategoriesWidget({ categories }: CategoriesWidgetProps) {
  const categoriesList = categories?.items || [];

  return (
    <div className="categories__widget">
      <div>
        <h3>Kategorier</h3>
        <div>
          {categoriesList.map((category) => (
            <a key={category.uuid} href={category.url || `#category-${category.uuid}`}>
              {/* ... отображение изображения категории и названия ... */}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * GraphQL запрос для получения данных виджета
 * Использует стандартный запрос Evershop categories с фильтром category_id.
 * Фильтр работает благодаря процессору registerCategoryIdFilter().
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

export const variables = `{
  categoryIds: getWidgetSetting("categories", [])
}`;
```

Полный код компонента: [CategoriesWidget.tsx](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/components/widgets/CategoriesWidget.tsx)

**Компонент настроек виджета:**

Компонент настроек позволяет администратору выбирать категории для отображения в виджете через админ-панель. Использует стандартный компонент `CategorySelector` из Evershop и модальное окно для выбора категорий.

```jsx
// extensions/categories_widget/src/components/widgets/CategoriesWidgetSetting.tsx
export default function CategoriesWidgetSetting({
  categoriesWidget: { categories = [] },
}) {
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<number[]>(categories);
  
  // ... логика выбора категорий через модальное окно ...
  
  return (
    <div>
      {/* ... UI для отображения выбранных категорий и их выбора ... */}
      {/* Скрытые поля для сохранения выбранных категорий */}
      {selectedCategoryIds.map((categoryId, index) => (
        <input
          key={categoryId}
          type="hidden"
          name={`settings[categories][${index}]`}
          value={categoryId}
        />
      ))}
    </div>
  );
}

export const query = `
  query Query($settings: JSON) {
    categoriesWidget(settings: $settings) {
      categories
    }
  }
`;

/**
 * getWidgetSetting() - получает настройки виджета из БД (таблица WIDGET.settings)
 * В компоненте настроек это текущие сохраненные настройки виджета
 */
export const variables = `{
  settings: getWidgetSetting()
}`;
```

Полный код компонента: [CategoriesWidgetSetting.tsx](https://github.com/Luca324/BuildMeister/blob/master/extensions/categories_widget/src/components/widgets/CategoriesWidgetSetting.tsx)

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

В данном примере используется процессор `registerCategoryIdFilter`, который добавляет поддержку фильтрации категорий по `category_id`. В репозитории также присутствует `registerCategoryUuidFilter.ts` — аналогичный процессор для фильтрации по `uuid` категорий, но он не используется в данном примере виджета.

```typescript
// extensions/my-extension/src/services/registerCategoryIdFilter.ts
// @ts-ignore - EverShop resolves these modules at runtime
import { OPERATION_MAP } from '@evershop/evershop/lib/util/filterOperationMap';
// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry';
// @ts-ignore - types resolved at runtime
import { value } from '@evershop/postgres-query-builder';

/**
 * Регистрация процессора (фильтра) для категорий
 * Как это работает:
 * 1. Виджет делает GraphQL запрос с фильтром category_id
 * 2. Evershop вызывает все процессоры для 'categoryCollectionFilters'
 * 3. Наш процессор добавляет SQL условие: WHERE category.category_id IN (1, 2, 3)
 * 4. Запрос выполняется с фильтром
 *
 * См. также: src/components/widgets/CategoriesWidget.tsx - использование фильтра
 */
export default () => {
  /**
   * Регистрация процессора для фильтров коллекции категорий
   *
   * 'categoryCollectionFilters' - имя точки расширения (hook point)
   * (filters: any[]) => {...} - функция-обработчик
   * 10 - приоритет выполнения (меньше = выполняется раньше)
   */
  addProcessor('categoryCollectionFilters', (filters: any[]) => {
    /**
     * Добавляем новый фильтр в список доступных фильтров
     */
    filters.push({
      key: 'category_id',           // Имя фильтра (используется в GraphQL)
      operation: ['in', 'eq'],      // Поддерживаемые операции: IN (массив) и = (равно)
      /**
       * Callback функция вызывается при использовании фильтра
       *
       * @param query - объект SQL запроса (для добавления условий WHERE)
       * @param operation - операция фильтра ('in' или 'eq')
       * @param val - значение фильтра (может быть массивом или одним значением)
       * @param currentFilters - массив текущих фильтров (для отображения в UI)
       */
      callback: (query: any, operation: string, val: string | string[] | number | number[], currentFilters: any[]) => {
        if (operation === 'in') {
          // Операция IN - фильтр по нескольким значениям
          // Преобразуем все значения в числа
          const ids = Array.isArray(val)
            ? val.map((v) => {
                const num = typeof v === 'string' ? parseInt(v, 10) : v;
                return isNaN(num) ? null : num;
              }).filter((v) => v !== null)
            : [typeof val === 'string' ? parseInt(val, 10) : val].filter((v) => !isNaN(v));
          if (ids.length > 0) {
            // Добавляем SQL условие: WHERE category.category_id IN (1, 2, 3)
            query.andWhere('category.category_id', 'IN', value(ids));
            // Сохраняем фильтр для отображения в UI
            currentFilters.push({
              key: 'category_id',
              operation,
              value: val,
            });
          }
        } else if (operation === 'eq') {
          // Операция = (равно) - фильтр по одному значению
          const num = typeof val === 'string' ? parseInt(val, 10) : (typeof val === 'number' ? val : null);
          if (num !== null && !isNaN(num)) {
            // Добавляем SQL условие: WHERE category.category_id = 1
            query.andWhere('category.category_id', OPERATION_MAP[operation], num);
            // Сохраняем фильтр для отображения в UI
            currentFilters.push({
              key: 'category_id',
              operation,
              value: val,
            });
          }
        }
      },
    });
    return filters;
  }, 10);
};

\`\`\`

**Регистрация в bootstrap:**

```typescript
// extensions/my-extension/src/bootstrap.ts
import registerCategoryIdFilter from "./services/registerCategoryIdFilter.js";

export default () => {
  registerCategoryIdFilter();
  // далее регистрация виджетов (опционально)
};
```

### Компиляция и активация расширения

#### Компиляция

```bash
cd extensions/my-extension
npm run tsc
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

# Система Area в Evershop

**Area** — это система композиции компонентов в Evershop, которая позволяет автоматически размещать компоненты в нужных местах страницы без ручной регистрации. Компоненты объявляют, где они должны отображаться, а система Area автоматически их находит и рендерит.

**1. Компонент Area**

Area — это React компонент, который рендерит все компоненты, зарегистрированные для определенной области страницы:

```jsx
import Area from '@components/common/Area';

// В Layout компоненте
<Area id="header" /> // Рендерит все компоненты с areaId: "header"
<Area id="content" /> // Рендерит все компоненты с areaId: "content"
<Area id="footer" /> // Рендерит все компоненты с areaId: "footer"
```

Подробнее: [The View System](https://evershop.io/docs/development/theme/view-system)

**2. Регистрация компонента через layout**

Чтобы компонент автоматически появился в Area, нужно его экспортировать объект layout.

Покажу на примере переопределения компонента Logo.jsx, который присутствует на всех страницах в области header.

```jsx
// themes/your-theme/src/pages/all/Logo.jsx
import React from "react";

export default function Logo() {
  return (
    <div>
      <a href="/">
        <img src="/logo.png" alt="logo" />
      </a>
    </div>
  );
}

// Регистрация в системе Area
export const layout = {
  areaId: "header", // В какой Area отображать
  sortOrder: 5 // Порядок отображения (меньше = выше)
};
```

**3. areaId — идентификатор области**

areaId определяет, в какую область макета будет вставлен компонент.

Его необходимо указать при создании компонента в экспорте layout. При создании виджета layout не экспортируется (т.к. элемент добавляется на страницы вручную из админки), поэтому и areaId указывать не нужно.

Примеры области:

- body — корневой макет (Layout компонент)
- header — шапка сайта
- content — основная область контента
- footer — подвал
- rightColumn — правая колонка (например, в категориях)
- leftColumn — левая колонка
- productPageMiddleRight — область на странице товара
- oneColumn — одна колонка (для страниц поиска)

Вы можете использовать любые кастомные areaId в своих компонентах.

Где можно получить полный список возможных areaId? А нигде. В исходном коде. Но в официальном репозитории почему-то присутствуют не все файлы, тут уж я разбираться не стала. Мой способ увидеть все возможные areaId: 1) скопировать папку @evershop/evershop из node_modules и сделать поиск по строке 'React.createElement(Area, { id: "'.

Можно заметить, что areaId зачастую повторяются из-за того, что area с одинаковыми id встречаются на разных страницах. Поэтому важно создать компонент в правильной директории, соответствующей названию страницы, на которой вы хотите, чтобы он был отображен. Скоро поговорим об этом подробнее.

**4. sortOrder — порядок отображения**

sortOrder определяет порядок компонентов в одной области. Компоненты сортируются по возрастанию:

```jsx
// Компонент A
export const layout = {
  areaId: "header",
  sortOrder: 5 // Отобразится первым
};

// Компонент B
export const layout = {
  areaId: "header",
  sortOrder: 10 // Отобразится вторым
};
```

**Организация компонентов по страницам**

Структура папок src/pages/ соответствует роутам Evershop:

- all/ — компоненты, отображаемые на **всех страницах**
- homepage/ — только на главной странице
- categoryView/ — страница категории
- productView/ — страница товара
- catalogSearch/ — результаты поиска

**Пример:** Компонент в pages/all/ будет отображаться на всех страницах, а в pages/homepage/ — только на главной.

Подробнее: [Theme Structure](https://evershop.io/docs/development/theme/theme-overview)

**Практические примеры**

**Пример 1: Компонент для всех страниц**

```jsx
// themes/your-theme/src/pages/all/EveryWhere.tsx
import React from 'react';

export default function EveryWhere() {
  return (
    <div>
      <p>Этот компонент виден на всех страницах</p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};
```

**Пример 2: Компонент только для главной**

```jsx
// themes/your-theme/src/pages/homepage/OnlyHomePage.tsx
import React from 'react';

export default function OnlyHomePage() {
  return (
    <div>
      <p>Этот компонент виден только на главной странице</p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10 // Отобразится перед EveryWhere (sortOrder: 20)
};
```

**Пример 3: Компонент для страницы категории**

```jsx
// themes/your-theme/src/pages/categoryView/Products.jsx
import React from 'react';

export default function Products({ products }) {
  return (
    <div>
      {products.items.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 25
};
```

**Как это работает под капотом**

- **Build Time (Сборка):** Webpack loader (AreaLoader) сканирует все компоненты страницы
- **Парсинг:** Находит export const layout в каждом компоненте
- **Группировка:** Группирует компоненты по areaId
- **Регистрация:** Автоматически регистрирует их в Area.defaultProps.components
- **Runtime:** Компонент Area использует эту информацию для рендеринга

Подробнее: [Templating](https://evershop.io/docs/development/theme/templating)

**Создание собственных Area**

Вы можете создавать собственные области в Layout:

```jsx
// themes/your-theme/src/pages/all/Layout.jsx
import Area from '@components/common/Area';

export default function Layout() {
  return (
    <>
      <Area id="header" />
      <main>
        <Area id="content" />
        {/* Ваша кастомная область */}
        <aside>
          <Area id="sidebar" />
        </aside>
      </main>
      <Area id="footer" />
    </>
  );
}
```

Теперь компоненты с areaId: "sidebar" будут автоматически отображаться в этой области.

**Полезные ссылки**

- [Theme Overview](https://evershop.io/docs/development/theme) — общий обзор системы тем
- [The View System](https://evershop.io/docs/development/theme/view-system) — подробно о системе Area и композиции
- [Templating](https://evershop.io/docs/development/theme/templating) — система шаблонов и компонентов
- [Theme Structure](https://evershop.io/docs/development/theme/theme-overview) — структура темы и организация

# Для любопытных: система GraphQL запросов

В Evershop используется сложная для понимания система GraphQL запросов, напоминающая очень костыльное решение. Для каждого роута (страницы) все GraphQL запросы компонентов этой страницы объединяются в один запрос и сохраняются в файл query.graphql.

Проблема в том, что некоторые значения для запросов (например, фильтры из URL или настройки виджетов) доступны только в runtime, когда существует объект request с контекстом HTTP-запроса. Поэтому Evershop использует обходное решение: вместо реальных значений в запросах сохраняются маркеры-заглушки с аргументами функций в base64-кодировании.

Конкретно: когда в компоненте указано getContextValue("filtersFromUrl") или getWidgetSetting("collection"), на этапе сборки эти функции не могут быть выполнены (объекта request еще нет). Поэтому аргументы этих функций кодируются в base64 и сохраняются как маркеры вида "getContextValue_ImZpbHRlcnNGcm9tVXJsIg==". Эти маркеры становятся частью структуры запроса и сохраняются в файле query.graphql внутри поля variables.\*.source (где \* - это уникальный ключ компонента). При выполнении запроса (runtime) файл query.graphql загружается, маркеры извлекаются из этого поля, декодируются из base64, и функции выполняются с реальным объектом request, получая актуальные значения из контекста запроса. Затем маркеры заменяются на реальные значения, и финальный GraphQL запрос выполняется.

# Переводы

Если пишете расширение (или тему), которое хотите опубликовать — хорошим тоном будет предусмотреть интернационализацию. В Evershop предусмотрен i18n. Жаль только, что по интернационализации в расширениях 0 документации. Я изучила исходный код и обнаружила, что все слова обернуты в функции перевода. Функций две: одна `__()`, другая `translate()`. Насколько я поняла, первая применяется на этапе сборки webpack. А вторая как-то по-другому. Я использую функцию `__()`: экспортирую ее из `@evershop/evershop/lib/locale/translate/` и оборачиваю в нее исходные фразы на английском.

Импорт функции перевода `__()`

Использование функции перевода `__()`

Сами переводы размещаются в папке `translations/язык/`, как и сказано в документации <https://evershop.io/docs/development/knowledge-base/translation>, в виде .csv файлов с двумя колонками: первая — фразы на английском, вторая — их перевод на целевой язык. Если разместить все и в одном файле, то должно тоже работать, но принято разделить на 5: account, catalog, checkout, general, paypal.

# Миграции данных

Я лично писала JS скрипты. В теории можно было использовать сервисы для PostgreSQL миграций, однако я выбрала импорт из CSV файлов, чтобы было удобнее генерировать данные с нейросетью.

Мои скрипты можно посмотреть в репозитории <https://github.com/Luca324/BuildMeister/tree/master/scripts>

# Патчи

Некоторый базовый функционал не работал, пока я не изменила исходный код.

- Патч test: `/[\\/][A-Z][^\\/]*\.(js|jsx)$/` нужен!!!

Ну тут мне нечего прокомментировать. Хз, просто без этого переводы не применяются. Точнее не все. Меню перевелось, а остальная страница (категория ПК) — вроде нет. +- так.

- Yandex S3 storage. Написала патч для s3_file_storage расширения, чтобы он работал с Yandex S3. Yandex S3 был выбран потому что там есть достаточный объем и бесплатное количество запросов.

# Как изучать исходный код

По структуре веток в GitHub Evershop: как я поняла, помимо главной ветки dev, все остальные — feature-ветки либо багфиксы, так что на них внимания обращать нет смысла. Исходный код фронтенда располагается по пути Evershop/packages/evershop/src. Там 3 папки: admin, common, frontStore, отвечающие соответственно за компоненты админ-панели, общие компоненты и компоненты магазина, которые видит конечный пользователь.

И 0 комментариев по всему коду. Может разработчики считают свой код самодокументируемым, но, на мой взгляд, это не так. Чтобы было проще внести вклад в Evershop, стоило бы сделать в документации навигацию по имеющимся компонентам.

# Недоработки Evershop

Одной из важных недоработок является отсутствие статусов заказов на стороне клиента. Клиент видит список своих заказов, их id, картинки, а поля для отображения статусов доставки и оплаты нет. Хотя в админ-панели они есть. Это очень странно. Я добавила те же самые статусы и на сторону клиента.

**Добавление статусов заказов на стороне клиента:**

Это патч, который мне пришлось сделать, т.к. разработчики не предусмотрели, что клиент тоже должен видеть статус заказа.

Для реализации создается расширение `order_status_display`, которое переопределяет компонент списка заказов и добавляет отображение статусов через стандартный компонент `Badge` из Evershop (`@components/common/Badge`).

**Структура расширения:**

```
extensions/order_status_display/
├── package.json
├── tsconfig.json
└── src/
    ├── bootstrap.ts
    ├── pages/frontStore/account/OrderHistory.tsx
    └── components/frontStore/customer/detail/OrderWithStatuses.tsx
```

**1. Переопределение страницы OrderHistory:**

Страница переопределяется для добавления полей `shipmentStatus` и `paymentStatus` в GraphQL запрос:

```tsx
// extensions/order_status_display/src/pages/frontStore/account/OrderHistory.tsx
import OrderWithStatuses from '../../../components/frontStore/customer/detail/OrderWithStatuses.js';

export default function OrderHistory({ customer }) {
  const orders = customer?.orders || [];
  
  return (
    <div className="order-history">
      {orders.map((order) => (
        <div key={order.orderId}>
          <OrderWithStatuses order={order} />
        </div>
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 10,
};

export const query = `
  query Query {
    customer: currentCustomer {
      orders {
        orderId
        orderNumber
        createdAt { text }
        shipmentStatus {
          name
          code
          badge
          progress
        }
        paymentStatus {
          name
          code
          badge
          progress
        }
        grandTotal { text }
        items {
          productName
          thumbnail
          productPrice { text }
          productSku
          qty
        }
      }
    }
  }
`;
```

**2. Компонент OrderWithStatuses:**

Компонент переопределяет стандартный `Order` и добавляет отображение статусов:

```tsx
// extensions/order_status_display/src/components/frontStore/customer/detail/OrderWithStatuses.tsx
import Badge from '@components/common/Badge';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

export default function OrderWithStatuses({ order }) {
  const { shipmentStatus, paymentStatus } = order;
  
  // Функция для определения progress по коду статуса
  const getProgress = (statusCode, statusType) => {
    if (statusType === 'shipment') {
      return statusCode === 'delivered' ? 'complete' : 'incomplete';
    } else {
      return statusCode === 'paid' ? 'complete' : 'incomplete';
    }
  };
  
  return (
    <div className="order">
      <div className="order-inner grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* ... отображение товаров заказа и другой информации ... */}
        
        {/* Отображение статусов */}
        {(shipmentStatus || paymentStatus) && (
          <div className="order-statuses flex gap-12 mt-4">
            {shipmentStatus && (
              <div className="shipment-status">
                <span>{_('Shipment')}:</span>
                <Badge
                  title={_(shipmentStatus.name)}
                  variant={shipmentStatus.badge}
                  progress={shipmentStatus.progress || getProgress(shipmentStatus.code, 'shipment')}
                />
              </div>
            )}
            {paymentStatus && (
              <div className="payment-status">
                <span>{_('Payment')}:</span>
                <Badge
                  title={_(paymentStatus.name)}
                  variant={paymentStatus.badge}
                  progress={paymentStatus.progress || getProgress(paymentStatus.code, 'payment')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Компонент `Badge` принимает пропсы:
- `title` — текст статуса (переведенный через `_()`)
- `variant` — вариант стиля (`'success'`, `'warning'`, `'danger'` и т.д.)
- `progress` — прогресс выполнения (`'complete'` или `'incomplete'`)

Полный код расширения: [order_status_display](https://github.com/Luca324/BuildMeister/tree/master/extensions/order_status_display)


# Настройка PayPal

Чтобы привязать оплату PayPal, нужно в админ-панели сайта указать два значения: Client Id, client secret. Эти значения должен будет получить заказчик. У PayPal есть исчерпывающая статья на этот счет:

<https://developer.paypal.com/api/rest/?_ga=2.1033913.984222656.1766907053-1493702913.1765184715#link-getclientidandclientsecret>

Также можно посмотреть видео <https://youtu.be/povhVRdCExc?si=drIiPodSv8QiJMnj>

# Способы доставки

Доставка в Evershop организована следующим образом:

1. Вы создаете shipping zone. Нужно указать страну и перечислить провинции/города (из выпадающего списка), на которые распространяется эта зона. Если не указывать провинции, то зона будет охватывать всю страну. Если не указывать страну, то зона будет охватывать весь мир.

![Изображение выглядит как текст, снимок экрана, число, Шрифт]()

Создание shipping zone

2. Добавляете методы доставки для этой зоны. Это может быть Самовывоз, Почта и т.д. Есть гибкая система условий для формирования цены в зависимости от стоимости заказа и его веса.

![Изображение выглядит как текст, снимок экрана, число, программное обеспечение]()

Если пользователю не доступен ни один способ доставки, например, потому что пользователь находится в другой географической зоне, тогда в списке методов доставок будет сообщение «Sorry, there is no available method for your address», и пользователь не сможет выбрать метод доставки, однако кнопка оформления заказа все равно будет активной, и при ее нажатии Evershop будет кидать ошибку «Cannot read properties of undefined (reading 'code')», но не скажет, что проблема в том, что поле «способ доставки» не может быть пустым. Поэтому будьте осторожны и всегда имейте минимум один возможный способ доставки для всей территории страны. Пользователь, увидев «Cannot read properties of undefined», решит, что сайт сломался.

Я решила эту проблему, написав патч, который делает кнопку disabled, если заполнены не все поля формы (в т.ч. метод доставки).

Патч с этим и другими изменениями можно посмотреть здесь: <https://github.com/Luca324/BuildMeister/tree/master/patches>

**ВАЖНО:**

- Всегда должен быть хотя бы один метод доставки для страны.

![Изображение выглядит как текст, снимок экрана, программное обеспечение, число]()

Ошибка оформления заказа, когда нет доступных методов доставки

# Docker

Вроде тут все довольно стандартно и достаточно будет документации. Тогда можно эту главу удалить.