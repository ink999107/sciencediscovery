// Copyright (C) 2026-2026 Huawei Technologies Co., Ltd
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createTest } from "../../../test/support/tagged/compat.mjs";
const { test } = createTest(import.meta.url, { tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"] });
import assert from "node:assert/strict";

import {
  MAX_INLINE_BYTES,
  base64Of,
  bytesOfDataUrl,
  documentPayload,
} from "../src/app/document-payload.js";
import { XLSX_MEDIA_TYPE } from "../src/app/preview-kind.js";

const encoder = new TextEncoder();

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

test("base64 pads the last group the way the alphabet requires", () => {
  assert.equal(base64Of(bytes()), "");
  assert.equal(base64Of(bytes(0x4d, 0x61, 0x6e)), "TWFu");
  assert.equal(base64Of(bytes(0x4d, 0x61)), "TWE=");
  assert.equal(base64Of(bytes(0x4d)), "TQ==");
  assert.equal(base64Of(bytes(0, 0)), "AAA=");
  assert.equal(base64Of(bytes(255, 255, 255)), "////");
});

test("a data URL carries back exactly the bytes it was made from", () => {
  const original = bytes(0, 1, 2, 250, 251, 252, 253, 254, 255);
  const { dataUrl } = documentPayload(original, "blob.png");
  assert.deepEqual([...bytesOfDataUrl(dataUrl!)], [...original]);
});

test("a script is decoded as text and typed by its name", () => {
  const payload = documentPayload(encoder.encode("print('hi')\n"), "plot.py", "application/octet-stream");
  assert.equal(payload.content, "print('hi')\n");
  assert.equal(payload.dataUrl, undefined);
  assert.equal(payload.mediaType, "text/x-python");
});

test("a type the server does know is kept as it is", () => {
  const payload = documentPayload(encoder.encode("a,b\n1,2\n"), "samples.csv", "text/csv; charset=utf-8");
  assert.equal(payload.mediaType, "text/csv");
});

test("a picture, a PDF and a workbook are carried as data URLs of their own type", () => {
  const image = documentPayload(bytes(137, 80, 78, 71), "figure.png", "application/octet-stream");
  assert.equal(image.content, undefined);
  assert.match(image.dataUrl ?? "", /^data:image\/png;base64,/u);
  assert.equal(image.mediaType, "image/png");

  const pdf = documentPayload(encoder.encode("%PDF-1.4"), "paper.pdf");
  assert.match(pdf.dataUrl ?? "", /^data:application\/pdf;base64,/u);

  const sheet = documentPayload(bytes(80, 75, 3, 4), "results.xlsx", "application/octet-stream");
  assert.equal(sheet.mediaType, XLSX_MEDIA_TYPE);
  assert.match(sheet.dataUrl ?? "", /^data:application\/vnd\.openxmlformats/u);
});

test("a document past the inline ceiling says so and carries nothing", () => {
  const huge = { byteLength: MAX_INLINE_BYTES + 1 } as Uint8Array;
  const payload = documentPayload(huge, "huge.png", "image/png");
  assert.deepEqual(payload, { mediaType: "image/png", tooLarge: true });
});
