import { StrictMode, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./store";
import { initNativeShell } from "./lib/native";
import { ScrollToTop } from "./layout/ScrollToTop";
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

const el = document.getElementById("root")!;
// Reuse the root across Vite HMR so we don't remount and lose StoreProvider.
const root: Root = ((globalThis as unknown as { __bhishiRoot?: Root }).__bhishiRoot
  ??= createRoot(el));
(globalThis as unknown as { __bhishiRoot?: Root }).__bhishiRoot = root;

root.render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <NativeShellBoot />
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
