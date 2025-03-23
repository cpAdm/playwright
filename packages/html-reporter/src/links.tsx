/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import type { TestAttachment, TestCase, TestCaseSummary, TestResult, TestResultSummary } from './types';
import * as React from 'react';
import * as icons from './icons';
import { TreeItem } from './treeItem';
import { CopyToClipboard } from './copyToClipboard';
import './links.css';
import { linkifyText } from '@web/renderUtils';
import { clsx, useFlash } from '@web/uiUtils';
import { filterWithToken } from './filter';
import { hashStringToInt } from './utils';

export function navigate(href: string | URL) {
  window.history.pushState({}, '', href);
  const navEvent = new PopStateEvent('popstate');
  window.dispatchEvent(navEvent);
}

export const Route: React.FC<React.PropsWithChildren<{
  predicate: (params: URLSearchParams) => boolean,
}>> = ({ predicate, children }) => {
  const searchParams = React.useContext(SearchParamsContext);
  return predicate(searchParams) ? children : null;
};

export const Link: React.FC<React.PropsWithChildren<{
  href?: string,
  click?: string,
  ctrlClick?: string,
  className?: string,
  title?: string,
}>> = ({ click, ctrlClick, children, ...rest }) => {
  return <a {...rest} style={{ textDecoration: 'none', color: 'var(--color-fg-default)', cursor: 'pointer' }}
    onClick={e => {
      if (click) {
        e.preventDefault();
        navigate(e.metaKey || e.ctrlKey ? ctrlClick || click : click);
      }
    }}>{children}</a>;
};

export const LabelLink: React.FC<{
  searchParams: URLSearchParams,
  name: string,
  prefix?: 'p:'
}> = ({ searchParams, name, prefix = '' }) => {
  return <Link click={filterWithToken(searchParams, `${prefix}${name}`, false)} ctrlClick={filterWithToken(searchParams, `${prefix}${name}`, true)}>
    <span style={{ margin: '6px 0 0 6px' }} className={clsx('label', `label-color-${hashStringToInt(name)}`)}>
      {name}
    </span>
  </Link>;
};

export const TagLinks: React.FC<{
  searchParams: URLSearchParams,
  tags: string[],
}> = ({ searchParams, tags }) => {
  return <>{tags.map(tag => (<LabelLink key={tag} searchParams={searchParams} name={tag}/>))}</>;
};

export const AttachmentLink: React.FC<{
  attachment: TestAttachment,
  result: TestResult,
  href?: string,
  linkName?: string,
  openInNewTab?: boolean,
}> = ({ attachment, result, href, linkName, openInNewTab }) => {
  const [flash, triggerFlash] = useFlash();
  useAnchor('attachment-' + result.attachments.indexOf(attachment), triggerFlash);

  return <TreeItem
    title={<span>
      {attachment.contentType === kMissingContentType ? icons.warning() : icons.attachment()}
      {attachment.path && <a href={href || attachment.path} download={downloadFileNameForAttachment(attachment)}>{linkName || attachment.name}</a>}
      {!attachment.path && (
        openInNewTab
          ? <a href={URL.createObjectURL(new Blob([attachment.body!], { type: attachment.contentType }))} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()}>{attachment.name}</a>
          : <span>{linkifyText(attachment.name)}</span>
      )}
    </span>}
    loadChildren={attachment.body ? () => [<div key={1} className='attachment-body'><CopyToClipboard value={attachment.body!}/>{linkifyText(attachment.body!)}</div>] : undefined} depth={0}
    style={{ lineHeight: '32px' }}
    flash={flash}
  />;
};

export const SearchParamsContext = React.createContext<URLSearchParams>(new URLSearchParams(window.location.hash.slice(1)));

export const SearchParamsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [searchParams, setSearchParams] = React.useState<URLSearchParams>(new URLSearchParams(window.location.hash.slice(1)));

  React.useEffect(() => {
    const listener = () => setSearchParams(new URLSearchParams(window.location.hash.slice(1)));
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, []);

  return <SearchParamsContext.Provider value={searchParams}>{children}</SearchParamsContext.Provider>;
};

function downloadFileNameForAttachment(attachment: TestAttachment): string {
  if (attachment.name.includes('.') || !attachment.path)
    return attachment.name;
  const firstDotIndex = attachment.path.indexOf('.');
  if (firstDotIndex === -1)
    return attachment.name;
  return attachment.name + attachment.path.slice(firstDotIndex, attachment.path.length);
}

export function generateTraceUrl(traces: TestAttachment[]) {
  return `trace/index.html?${traces.map(a => `trace=${new URL(a.path!, window.location.href)}`).join('&')}`;
}

const kMissingContentType = 'x-playwright/missing';

export type AnchorID = string | string[] | ((id: string) => boolean) | undefined;

export function useAnchor(id: AnchorID, onReveal: React.EffectCallback) {
  const searchParams = React.useContext(SearchParamsContext);
  const isAnchored = useIsAnchored(id);
  React.useEffect(() => {
    if (isAnchored)
      return onReveal();
  }, [isAnchored, onReveal, searchParams]);
}

export function useIsAnchored(id: AnchorID) {
  const searchParams = React.useContext(SearchParamsContext);
  const anchor = searchParams.get('anchor');
  if (anchor === null)
    return false;
  if (typeof id === 'undefined')
    return false;
  if (typeof id === 'string')
    return id === anchor;
  if (Array.isArray(id))
    return id.includes(anchor);
  return id(anchor);
}

export function Anchor({ id, children }: React.PropsWithChildren<{ id: AnchorID }>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onAnchorReveal = React.useCallback(() => {
    ref.current?.scrollIntoView({ block: 'start', inline: 'start' });
  }, []);
  useAnchor(id, onAnchorReveal);

  return <div ref={ref}>{children}</div>;
}

export function testResultHref({ test, result, anchor, filter }: {
  test?: TestCase | TestCaseSummary,
  result?: TestResult | TestResultSummary,
  anchor?: string,
  filter?: URLSearchParams
}) {
  const params = new URLSearchParams();
  if (test)
    params.set('testId', test.testId);
  if (test && result)
    params.set('run', '' + test.results.indexOf(result as any));
  if (anchor)
    params.set('anchor', anchor);
  if (filter?.get('q'))
    params.set('q', filter.get('q') ?? '');
  return `#?` + params;
}
