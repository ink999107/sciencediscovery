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
 * Which of the panel's renderers a document gets.
 *
 * The name decides, because the name is what the reader sees on the tab and in
 * the tree, and because the server answers with `application/octet-stream` for
 * every extension its static table does not know — a `.py` or a `.xlsx`
 * included. The answer's media type is the fallback for a name with no
 * extension, which is where it is the only thing left to go on.
 */

export type DocumentKind =
  | "csv"
  | "html"
  | "image"
  | "json"
  | "markdown"
  | "pdf"
  | "prose"
  | "python"
  | "sheet"
  | "source";

const IMAGE_EXTENSIONS = new Set([
  "avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp",
]);
const SHEET_EXTENSIONS = new Set(["xlsx"]);

/** The media type an .xlsx is stored and served with, when the server knows the
 *  extension at all. */
export const XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function extensionOf(name: string): string {
  const bare = name.split(/[?#]/, 1)[0] ?? "";
  const dot = bare.lastIndexOf(".");
  return dot <= 0 || dot === bare.length - 1 ? "" : bare.slice(dot + 1).toLowerCase();
}

/** A document the panel draws from its bytes rather than from its text: a
 *  picture, a PDF, a workbook. The tab holds a data URL instead of a string. */
export function isBinaryDocument(kind: DocumentKind): boolean {
  return kind === "image" || kind === "pdf" || kind === "sheet";
}

export function documentKind(name: string, mediaType = ""): DocumentKind {
  const extension = extensionOf(name);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (SHEET_EXTENSIONS.has(extension)) return "sheet";
  if (extension === "pdf") return "pdf";
  if (extension === "csv" || extension === "tsv") return "csv";
  if (extension === "py" || extension === "pyw") return "python";
  if (extension === "md" || extension === "markdown") return "markdown";
  if (extension === "htm" || extension === "html") return "html";
  if (extension === "json") return "json";
  // A .txt is a document that carries no markup — an answer, a note, a report —
  // rather than a source file; it is set as a page rather than as a listing.
  if (extension === "txt" || extension === "text") return "prose";

  const type = (mediaType.split(";", 1)[0] ?? "").trim().toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type === XLSX_MEDIA_TYPE) return "sheet";
  if (type === "text/csv" || type === "text/tab-separated-values") return "csv";
  if (type === "text/markdown") return "markdown";
  if (type === "text/html") return "html";
  if (type === "application/json") return "json";
  // Everything else that can be read as text is shown as source, where a log, a
  // script of a language this build does not colour, and a structure file all
  // land — the last one having been claimed by the 3D viewer before this.
  return "source";
}

/** The separator a delimited document uses when its name does not already say:
 *  a .tsv is tab-separated, whatever its first line looks like. */
export function delimitedSeparator(name: string): string | undefined {
  return extensionOf(name) === "tsv" ? "\t" : undefined;
}
