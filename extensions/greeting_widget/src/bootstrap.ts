import path from "path";
import { fileURLToPath } from "url";
import { registerWidget } from "@evershop/evershop/lib/widget";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  // Register our greeting widget
  registerWidget({
    type: "greeting_widget",
    name: "Greeting Widget",
    description: "Display a greeting message",
    settingComponent: path.resolve(
      __dirname,
      "components/widgets/GreetingWidgetSetting.js"
    ),
    component: path.resolve(
      __dirname,
      "components/widgets/GreetingWidget.js"
    ),
    enabled: true,
    defaultSettings: {
      text: "Hello, welcome to our store!",
      className: "",
    },
  });
  console.log("Greeting widget registered successfully*");
};