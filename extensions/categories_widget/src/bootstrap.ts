import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";
import registerCategoryIdFilter from "./services/registerCategoryIdFilter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  console.log('CategoriesWidget extension bootstrap loaded*');
  
  // Register filter for category_id
  registerCategoryIdFilter();
  
  // Register our categories widget
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