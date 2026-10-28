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

import type { AttachmentKind } from "../app/attachments.js";

/**
 * The mark an attachment card puts in front of the file's name: a page in the
 * type's colour with the type's glyph on it, drawn from the handoff's own file
 * icons (`data/exports/*.svg`).
 *
 * Redrawn rather than shipped: the exports are 3–7 KB of Pixso gradient and
 * outline geometry each, and there are thirteen of them. The page, its folded
 * corner and a glyph are the whole of what reads at 32px, and a stroke set
 * scales to any size the card is given.
 */
const TINTS: Record<AttachmentKind, string> = {
  archive: "#715afb",
  audio: "#2cb8c9",
  code: "#8f5dff",
  csv: "#00b68e",
  excel: "#09aa71",
  file: "#7a7a7a",
  image: "#d41dbc",
  markdown: "#00b68e",
  pdf: "#e02128",
  ppt: "#ff7737",
  text: "#08aaea",
  video: "#62b42e",
  word: "#1476ff",
};

/** A page with a 3px corner radius and the top-right corner folded over. */
const PAGE = "M2 3a3 3 0 0 1 3-3h9.93a1 1 0 0 1 .7.29l6.08 5.92a1 1 0 0 1 .29.71V21a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z";
/** The fold itself, lighter than the page so it reads as paper turned over. */
const FOLD = "M15.34 0 22 6.5h-4.66A2 2 0 0 1 15.34 4.5z";

/** 24×24 artwork, white on the page, in the body's free space — the fold takes
 *  the top-right corner, so every glyph sits below and to the left of it. */
function Glyph({ kind }: { kind: AttachmentKind }) {
  switch (kind) {
    case "excel":
    case "csv":
      return (
        <>
          <rect fill="#fff" height="7" opacity=".38" rx="1.2" width="8.6" x="6.2" y="10.6" />
          <path d="M6.2 14.1h8.6M10.5 10.6v7" stroke="#fff" strokeWidth="1.1" />
        </>
      );
    case "ppt":
      return (
        <>
          <path d="M11 10.4a4.1 4.1 0 1 0 4.1 4.1H11z" fill="#fff" opacity=".45" />
          <path d="M11 10.4a4.1 4.1 0 0 1 4.1 4.1H11z" fill="#fff" />
        </>
      );
    case "image":
      return (
        <>
          <rect fill="none" height="7.4" rx="1.4" stroke="#fff" strokeWidth="1.2" width="9.2" x="6" y="10.3" />
          <circle cx="8.7" cy="12.7" fill="#fff" r=".9" />
          <path d="M6.4 16.6l2.6-2.6 1.9 1.9 1.6-1.4 2.2 2.1" fill="none" stroke="#fff" strokeWidth="1.1" />
        </>
      );
    case "video":
      return (
        <>
          <rect fill="#fff" height="7.4" rx="1.6" width="9.2" x="6" y="10.3" />
          <path d="M9.4 12.1v3.8l3.3-1.9z" fill={TINTS[kind]} />
        </>
      );
    case "audio":
      return (
        <>
          <path d="M9.6 10.8v5.5" stroke="#fff" strokeLinecap="round" strokeWidth="1.2" />
          <path d="M9.6 10.8c2 .2 2.8.9 2.8 1.9" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.2" />
          <circle cx="8.2" cy="16.6" fill="#fff" r="1.7" />
        </>
      );
    case "archive":
      return (
        <>
          <rect fill="#fff" height="7.6" rx="1.2" width="4.4" x="8.3" y="10.2" />
          <path d="M8.3 12.6h4.4M8.3 15.4h4.4" stroke={TINTS[kind]} strokeWidth="1" />
        </>
      );
    case "code":
      return (
        <>
          <path d="M9.4 11.4 6.8 14l2.6 2.6M12.6 11.4 15.2 14l-2.6 2.6" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
        </>
      );
    case "pdf":
    case "markdown":
    case "file":
      return (
        <text fill="#fff" fontSize="9.6" fontWeight="700" textAnchor="middle" x="10.6" y="18.1">
          {kind === "pdf" ? "A" : kind === "markdown" ? "M" : "?"}
        </text>
      );
    case "word":
    case "text":
      return (
        <>
          <rect fill="#fff" height="1.5" rx=".75" width="8.4" x="6.4" y="11" />
          <rect fill="#fff" height="1.5" opacity=".85" rx=".75" width="8.4" x="6.4" y="14" />
          <rect fill="#fff" height="1.5" opacity=".7" rx=".75" width="5.6" x="6.4" y="17" />
        </>
      );
  }
}

export function FileBadge({ kind }: { kind: AttachmentKind }) {
  return (
    <svg aria-hidden="true" className="file-badge" viewBox="0 0 24 24">
      <path d={PAGE} fill={TINTS[kind]} />
      <path d={FOLD} fill="#fff" opacity=".55" />
      <Glyph kind={kind} />
    </svg>
  );
}
