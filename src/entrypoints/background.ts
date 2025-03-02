export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    if (command === "togglePopup") {
      browser.action.openPopup();
    }
  });
});
