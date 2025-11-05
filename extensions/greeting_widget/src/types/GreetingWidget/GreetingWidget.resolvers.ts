export default {
    Query: {
      greetingWidget(_, { settings }) {
        console.log("GreetingWidget resolver called with settings*", settings);
        return {
          text: settings?.text || "Hello, welcome to our store!",
          className: settings?.className || "",
        };
      },
    },
  };

