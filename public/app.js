import { loadQuote, loadSignals, selectSignal } from "./modules/actions.js";
import { els } from "./modules/dom.js";
import { applyLanguage, setRenderHandlers, setView } from "./modules/renderers.js";
import { state } from "./modules/state.js";

setRenderHandlers({ onSelectSignal: selectSignal });

els.languageToggle.addEventListener("click", () => {
  state.language = state.language === "zh" ? "en" : "zh";
  localStorage.setItem("txradar-language", state.language);
  applyLanguage();
});

els.liveMode.addEventListener("change", () => {
  state.mode = els.liveMode.checked ? "live" : "cache";
  loadSignals();
});

els.refresh.addEventListener("click", loadSignals);
els.quote.addEventListener("click", loadQuote);
els.amount.addEventListener("change", loadQuote);

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

els.filters.forEach((button) => {
  button.addEventListener("click", () => {
    els.filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.chain = button.dataset.chain;
    loadSignals();
  });
});

setView(state.view);
applyLanguage();
loadSignals();
