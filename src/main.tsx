import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./store";
import { initNativeShell } from "./lib/native";
import "./index.css";

function NativeShellBoot() {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    void initNativeShell().then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <NativeShellBoot />
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
