import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// HashRouter (not BrowserRouter): GitHub Pages serves static files with no
// server-side rewrite rules, so a deep link like /admin/decants would 404 on
// refresh under path-based routing. Hash routing keeps all routing client-side.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
