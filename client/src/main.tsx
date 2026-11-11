import { createRoot } from "react-dom/client";
import App, { prepareStartup } from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
const prepared = prepareStartup();
if (prepared) {
  // Errors are rendered by the application's existing ErrorBoundary.
  void prepared.catch(() => {}).then(() => root.render(<App />));
} else {
  root.render(<App />);
}
