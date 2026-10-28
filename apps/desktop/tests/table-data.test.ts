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

import { numericColumns, parseDelimited, sniffSeparator } from "../src/app/table-data.js";

test("the first row is the header and the rest are cells", () => {
  assert.deepEqual(parseDelimited("样品,强度\nA,12.5\nB,3\n"), {
    columns: ["样品", "强度"],
    rows: [["A", "12.5"], ["B", "3"]],
    totalRows: 2,
    truncated: false,
  });
});

test("a quoted cell keeps its separator, its newline and its doubled quote", () => {
  const table = parseDelimited("name,note\n\"a,b\",\"line one\nline two\"\n\"say \"\"hi\"\"\",ok\n");
  assert.deepEqual(table?.rows, [
    ["a,b", "line one\nline two"],
    ["say \"hi\"", "ok"],
  ]);
});

test("a document one column wide is text, not a table", () => {
  assert.equal(parseDelimited("just some\nplain text\n"), undefined);
  assert.equal(parseDelimited(""), undefined, "empty is not a table either");
});

test("the separator is the one that keeps the rows square", () => {
  assert.equal(sniffSeparator("a,b\n1,2\n"), ",");
  assert.equal(sniffSeparator("a;b\n1;2\n"), ";");
  assert.equal(sniffSeparator("a\tb\n1\t2\n"), "\t");
  // A semicolon inside a quoted value does not make the file semicolon-separated.
  assert.equal(sniffSeparator("a,b\n\"x;y\",2\n"), ",");
});

test("a tab-separated file can be read as one whatever its first line looks like", () => {
  const table = parseDelimited("a\tb\n1\t2\n", { separator: "\t" });
  assert.deepEqual(table?.columns, ["a", "b"]);
  assert.deepEqual(table?.rows, [["1", "2"]]);
});

test("a document past the row cap is counted whole and held in part", () => {
  const table = parseDelimited("h1,h2\n1,2\n3,4\n5,6\n", { maxRows: 2 });
  assert.deepEqual(table?.rows, [["1", "2"], ["3", "4"]], "the header plus two rows");
  assert.equal(table?.totalRows, 3, "the caption still counts what exists");
  assert.equal(table?.truncated, true);
});

test("ragged rows are padded to the widest one, and the extra column is unnamed", () => {
  const table = parseDelimited("a,b,c\n1,2\n3,4,5,6\n");
  assert.deepEqual(table?.columns, ["a", "b", "c", ""]);
  assert.deepEqual(table?.rows, [["1", "2", "", ""], ["3", "4", "5", "6"]]);
});

test("a byte order mark is not part of the first column's name", () => {
  const table = parseDelimited("﻿a,b\n1,2\n");
  assert.equal(table?.columns[0], "a");
});

test("a numeric column is a column whose values all read as numbers", () => {
  const rows = [
    ["1", "12.5", "A", ""],
    ["-2", "3e4", "B", ""],
    ["3.5", "1_000", "C", ""],
  ];
  assert.deepEqual(numericColumns(rows, 4), [true, true, false, false]);
});

test("one label in a column is enough to make it text", () => {
  assert.deepEqual(numericColumns([["1", "2"], ["none", "3"]], 2), [false, true]);
});
