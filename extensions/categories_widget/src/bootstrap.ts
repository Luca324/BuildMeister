import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";
import registerCategoryIdFilter from "./services/registerCategoryIdFilter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bootstrap функция - точка входа расширения
 * Вызывается при загрузке расширения Evershop
 * Здесь регистрируется вся функциональность расширения
 */
export default () => {
  /**
   * Регистрация процессора (фильтра) для категорий
   * 
   * Зачем это нужно:
   * - Виджет использует фильтр по category_id в GraphQL запросе
   * - Без этого процессора фильтр category_id не будет работать
   * - Процессор добавляет поддержку фильтрации категорий по ID в SQL запросы
   * 
   * См. также: src/services/registerCategoryIdFilter.ts
   */
  registerCategoryIdFilter();
  
  /**
   * Регистрация виджета
   * 
   * Виджет - это переиспользуемый компонент, который можно добавить
   * на любую страницу через админ-панель Evershop.
   * 
   * Параметры:
   * - type: уникальный идентификатор виджета (используется в БД)
   * - name: название виджета в админ-панели
   * - settingComponent: компонент для настройки виджета в админке
   * - component: основной компонент виджета (отображается на фронтенде)
   * - defaultSettings: настройки по умолчанию (сохраняются в БД при создании)
   */
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