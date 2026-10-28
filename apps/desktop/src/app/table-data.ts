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

/**
 * A delimited file or a worksheet as the panel's table draws it, and the one
 * reader both arrive through.
 *
 * A CSV opened as source is a page of commas: the values are there and the
 * shape is not, which is the thing the reader opened it to see. The same goes
 * for a workbook. Both come out of here as a header row and rows of cells, and
 * the view above draws that shape rather than the text it came from.
 */

export interface Table {
  /** What each column is called, the first row of the document. */
  columns: string[];
  /** The document's rows below the header, as far as the panel holds them. */
  rows: string[][];
  /** Whether rows were left out; the caption says how many exist. */
  truncated: boolean;
  /** Rows below the header, held or not — what the caption counts. */
  totalRows: number;
}

/** What one table holds. Past this the reader is looking at the head of a data
 *  set, which is what a preview is for; the file itself is one download away. */
export const TABLE_MAX_ROWS = 300;
/** Wide tables scroll; this many columns is already more than the panel shows,
 *  and a worksheet can claim its last cell is the 16,384th. */
export const TABLE_MAX_COLUMNS = 60;
/** A cell longer than this is cut in the cell's tooltip-bearing text; the
 *  table is a shape, not a way to read an essay inside a column. */
export const CELL_MAX_CHARS = 2_000;

const CANDIDATES: ReadonlyArray<string> = [",", "\t", ";", "|"];

/** Which separator the first lines use, by which one splits them into an equal
 *  number of fields. A .csv is almost always a comma, but a European export
 *  writes semicolons and `sep=;` files exist; a guess that keeps the table
 *  square is worth one pass over the first kilobyte. */
export function sniffSeparator(source: string, sampleSize = 4096): string {
  const lines = source.replace(/^﻿/u, "").slice(0, sampleSize).split(/\r\n?|\n/u)
    .filter((line) => line.trim() !== "").slice(0, 8);
  let best: { count: number; separator: string } = { count: 1, separator: "," };
  for (const separator of CANDIDATES) {
    const counts = lines.map((line) => countOutsideQuotes(line, separator));
    const first = counts[0];
    if (first === undefined || first < 1) continue;
    if (!counts.every((count) => count === first)) continue;
    if (first + 1 > best.count) best = { count: first + 1, separator };
  }
  return best.separator;
}

function countOutsideQuotes(line: string, separator: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"") {
      if (quoted && line[index + 1] === "\"") {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === separator && !quoted) {
      count += 1;
    }
  }
  return quoted ? -1 : count;
}

/**
 * Read a delimited document into a header and rows.
 *
 * The first row is the header: a CSV written for a model or by one almost
 * always names its columns, and a table with no header at all still reads
 * correctly when the first row becomes one. A document that comes out one
 * column wide is not a table — it is text that happens to contain commas — and
 * is left to the source view.
 */
export function parseDelimited(
  source: string,
  options: { maxColumns?: number; maxRows?: number; separator?: string } = {},
): Table | undefined {
  const maxRows = options.maxRows ?? TABLE_MAX_ROWS;
  const maxColumns = options.maxColumns ?? TABLE_MAX_COLUMNS;
  const separator = options.separator ?? sniffSeparator(source);
  const text = source.replace(/^﻿/u, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let index = 0;
  let totalRows = 0;
  let keep = true;
  let widest = 0;

  const pushCell = () => {
    if (keep && row.length < maxColumns) row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    totalRows += 1;
    if (keep) {
      rows.push(row);
      widest = Math.max(widest, row.length);
      // The header plus this many rows is what the panel holds; past it the
      // scan goes on counting so the caption can say how much is missing.
      if (rows.length > maxRows + 1) {
        const dropped = rows.pop();
        if (dropped !== undefined) widest = Math.max(widest, dropped.length);
        keep = false;
      }
    }
    row = [];
  };

  while (index < text.length) {
    const character = text[index]!;
    if (quoted) {
      if (character === "\"") {
        if (text[index + 1] === "\"") {
          if (keep) cell += "\"";
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      if (keep) cell += character;
      index += 1;
      continue;
    }
    if (character === "\"" && cell.trim() === "") {
      quoted = true;
      cell = "";
      index += 1;
      continue;
    }
    if (character === separator) {
      pushCell();
      index += 1;
      continue;
    }
    if (character === "\r") {
      index += 1;
      continue;
    }
    if (character === "\n") {
      pushCell();
      pushRow();
      index += 1;
      continue;
    }
    if (keep) cell += character;
    index += 1;
  }
  if (cell !== "" || row.length > 0) {
    pushCell();
    pushRow();
  }

  const header = rows[0];
  if (header === undefined || widest < 2) return undefined;
  const columns: string[] = [];
  for (let column = 0; column < widest; column += 1) {
    columns.push((header[column] ?? "").slice(0, CELL_MAX_CHARS));
  }
  const body: string[][] = [];
  for (const source_row of rows.slice(1)) {
    const cells: string[] = [];
    for (let column = 0; column < widest; column += 1) {
      cells.push((source_row[column] ?? "").slice(0, CELL_MAX_CHARS));
    }
    body.push(cells);
  }
  return {
    columns,
    rows: body,
    totalRows: Math.max(totalRows - 1, 0),
    truncated: totalRows > rows.length,
  };
}

const NUMERIC = /^[-+]?(?:\d[\d,_]*)?(?:\.\d+)?(?:[eE][-+]?\d+)?$/u;

/** Which columns are numbers, so the table can set them flush right and give
 *  the eye a column to run down. A column of labels with one number in it stays
 *  left-aligned: mixed means the column is text. */
export function numericColumns(rows: readonly string[][], columnCount: number): boolean[] {
  const numeric: boolean[] = [];
  for (let column = 0; column < columnCount; column += 1) {
    let seen = 0;
    let all = true;
    for (const row of rows) {
      const value = (row[column] ?? "").trim();
      if (value === "") continue;
      seen += 1;
      if (!NUMERIC.test(value)) {
        all = false;
        break;
      }
    }
    numeric.push(seen > 0 && all);
  }
  return numeric;
}
