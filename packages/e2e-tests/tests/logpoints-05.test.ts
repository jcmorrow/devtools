import test, { Page, expect } from "@playwright/test";

import { openDevToolsTab, startTest } from "../helpers";
import {
  addLogpoint,
  editLogPoint,
  getCurrentLogPointPanelTypeAhead,
} from "../helpers/source-panel";

const url = "log_points_and_block_scope.html";

async function verifyLogPointTypeAheadSuggestions(page: Page, expectedPartialList: string[]) {
  const actualTextContent = (await getCurrentLogPointPanelTypeAhead(page).textContent()) || "";
  const expectedTextContent = expectedPartialList.join("");
  expect(actualTextContent.startsWith(expectedTextContent)).toBe(true);
}

test(`logpoints-05: should auto-complete based on log point location`, async ({ page }) => {
  await startTest(page, url);
  await openDevToolsTab(page);

  await addLogpoint(page, { lineNumber: 5, url });
  await addLogpoint(page, { lineNumber: 12, url });
  await addLogpoint(page, { lineNumber: 17, url });

  // Verify different auto-complete options based on location
  await editLogPoint(page, { content: "array", lineNumber: 5, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, ["arrayGlobal", "Array", "ArrayBuffer"]);

  await editLogPoint(page, { content: "array", lineNumber: 12, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, [
    "arrayBlockOne",
    "arrayBlockOuter",
    "arrayGlobal",
    "Array",
    "ArrayBuffer",
  ]);

  await editLogPoint(page, { content: "array", lineNumber: 17, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, [
    "arrayBlockOuter",
    "arrayBlockTwo",
    "arrayGlobal",
    "Array",
    "ArrayBuffer",
  ]);

  // Alpha sorting should impact priority
  await editLogPoint(page, { content: "Array", lineNumber: 5, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, ["Array", "ArrayBuffer", "arrayGlobal"]);

  await editLogPoint(page, { content: "Array", lineNumber: 12, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, [
    "Array",
    "ArrayBuffer",
    "arrayBlockOne",
    "arrayBlockOuter",
    "arrayGlobal",
  ]);

  await editLogPoint(page, { content: "Array", lineNumber: 17, saveAfterEdit: false, url });
  await verifyLogPointTypeAheadSuggestions(page, [
    "Array",
    "ArrayBuffer",
    "arrayBlockOuter",
    "arrayBlockTwo",
    "arrayGlobal",
  ]);
});
