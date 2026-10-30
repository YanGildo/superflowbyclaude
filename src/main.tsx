import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html sem o elemento #root");
createRoot(root).render(<App />);
