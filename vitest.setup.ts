import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";

// Ignore <option> elements in getByText to avoid duplicate matches
// from Radix UI's hidden native <select> elements (aria-hidden="true")
configure({ defaultIgnore: "script, style, option" });
