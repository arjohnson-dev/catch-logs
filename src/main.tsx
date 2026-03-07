/*
 * File:        src/main.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile-first.css";

createRoot(document.getElementById("root")!).render(<App />);
