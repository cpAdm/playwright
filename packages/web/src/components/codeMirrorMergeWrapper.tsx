/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import './codeMirrorWrapper.css';
import * as React from 'react';
import type { CodeMirror } from './codeMirrorModule';
import { mimeTypeToMode, highlighterToMode, type CodeMirrorHighlighter } from './codeMirrorWrapper';


export const CodeMirrorMergeWrapper: React.FC<{
  original: string;
  changed: string;
  // TODO either pass highlighter or mimeType
  highlighter?: CodeMirrorHighlighter;
  mimeType?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  wrapLines?: boolean;
  height?: number;
}> = ({
  original,
  changed,
  highlighter,
  mimeType,
  readOnly = true,
  lineNumbers = true,
  wrapLines = true,
  height = 400,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [modulePromise] = React.useState<Promise<CodeMirror>>(
      import('./codeMirrorModule').then(m => m.default),
  );

  React.useEffect(() => {
    let disposed = false;

    (async () => {
      const CodeMirror = await modulePromise;
      const element = containerRef.current;
      if (!element || disposed)
        return;

      const mode = highlighterToMode(highlighter) || mimeTypeToMode(mimeType) || 'javascript';

      // Clear previous content
      element.innerHTML = '';

      const cmAny = CodeMirror as any;
      cmAny.MergeView(element, {
        value: changed,
        orig: original,
        mode,
        lineNumbers,
        readOnly,
        lineWrapping: wrapLines,
        highlightDifferences: true,
        connect: 'align',
        showDifferences: true,
        collapseIdentical: false,
        revertButtons: !readOnly,
      });
    })();

    return () => {
      disposed = true;
      if (containerRef.current)
        containerRef.current.innerHTML = '';
    };
  }, [modulePromise, original, changed, highlighter, mimeType, readOnly, lineNumbers, wrapLines]);

  return (
    <div
      ref={containerRef}
      className='cm-wrapper'
      style={{ height, minHeight: 200, overflow: 'hidden' }}
    />
  );
};
