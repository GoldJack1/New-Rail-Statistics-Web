'use client'

import React, { useState } from 'react'
import TextCard from '@/components/cards/TextCard/TextCard'
import { BUTOperatorChip } from '@/components/buttons'
import { useTheme } from '@/hooks/useTheme'
import { useTocOperators } from '@/hooks/useTocOperators'
import type { NetworkCollectionId } from '@/constants/stationCollections'
import {
  getLightRailLineChipColors,
  isLightRailNetworkCollection,
  normalizeLightRailLineName
} from '@/utils/lightRailStationFields'
import {
  getTocOperatorChipColors,
  resolveTocOperatorDisplayName,
  type TocOperator
} from '@/services/tocOperators'
import {
  networkMessageIsCollapsible,
  type NetworkMessage,
  type NetworkMessageBullet,
  type NetworkMessageParagraph,
  type NetworkMessagePriority
} from '@/types/networkMessages'
import './NetworkMessageAlertBanner.css'
import type { TextCardState } from '@/components/cards/TextCard/TextCard'

export type NetworkMessageAlertBannerProps = {
  messages: NetworkMessage[]
  /** Accessible name for the stack (default: Network alerts). */
  ariaLabel?: string
}

/** Match http(s) URLs and bare www. hosts for linkification. */
const URL_IN_TEXT_RE =
  /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi

function hrefForMatchedUrl(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Split plain text into text + external anchor nodes (safe; no HTML injection). */
function linkifyText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const re = new RegExp(URL_IN_TEXT_RE.source, URL_IN_TEXT_RE.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const start = match.index
    const raw = match[1] ?? match[0]
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }
    const href = hrefForMatchedUrl(raw)
    nodes.push(
      <a
        key={`link-${start}-${raw}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="network-message-alert-banner__link"
      >
        {raw}
      </a>
    )
    lastIndex = start + raw.length
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes.length > 0 ? nodes : [text]
}

function textCardStateForPriority(priority: NetworkMessagePriority): TextCardState {
  if (priority === 1) return 'redAction'
  if (priority === 2) return 'accent'
  if (priority === 3) return 'favAction'
  if (priority === 5) return 'greenAction'
  return 'default'
}

function LightRailLineChip({ line }: { line: string }) {
  const { theme } = useTheme()
  const normalized = normalizeLightRailLineName(line)
  const colors = getLightRailLineChipColors(normalized, theme)
  const label = normalized
  return (
    <BUTOperatorChip
      instantAction
      pressed
      colorVariant="primary"
      width="fill"
      className="network-message-alert-banner__line-chip"
      ariaLabel={`${label} Route`}
      title={`${label} Route`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.bg
      }}
    >
      {label}
    </BUTOperatorChip>
  )
}

function TocOperatorChip({
  toc,
  operators
}: {
  toc: string
  operators: TocOperator[]
}) {
  const label = resolveTocOperatorDisplayName(operators, toc)
  const colors = getTocOperatorChipColors(operators, toc)
  return (
    <BUTOperatorChip
      instantAction
      pressed
      colorVariant="primary"
      width="hug"
      className="network-message-alert-banner__line-chip network-message-alert-banner__line-chip--toc"
      ariaLabel={label}
      title={label}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.bg
      }}
    >
      {label}
    </BUTOperatorChip>
  )
}

function MessageBulletChip({
  value,
  network,
  tocOperators
}: {
  value: string
  network: NetworkCollectionId
  tocOperators: TocOperator[]
}) {
  if (isLightRailNetworkCollection(network)) {
    return <LightRailLineChip line={value} />
  }
  return <TocOperatorChip toc={value} operators={tocOperators} />
}

function BulletRow({
  bullet,
  network,
  tocOperators
}: {
  bullet: NetworkMessageBullet
  network: NetworkCollectionId
  tocOperators: TocOperator[]
}) {
  const isLightRail = isLightRailNetworkCollection(network)
  return (
    <li
      className={`network-message-alert-banner__bullet${
        isLightRail
          ? ' network-message-alert-banner__bullet--line'
          : ' network-message-alert-banner__bullet--toc'
      }`}
    >
      {bullet.lineChip ? (
        <MessageBulletChip value={bullet.lineChip} network={network} tocOperators={tocOperators} />
      ) : null}
      {bullet.text ? (
        <span className="network-message-alert-banner__bullet-text">{linkifyText(bullet.text)}</span>
      ) : null}
    </li>
  )
}

function ParagraphBlock({
  paragraph,
  idPrefix,
  network,
  tocOperators
}: {
  paragraph: NetworkMessageParagraph
  idPrefix: string
  network: NetworkCollectionId
  tocOperators: TocOperator[]
}) {
  return (
    <span className="network-message-alert-banner__paragraph">
      {paragraph.text ? (
        <span className="network-message-alert-banner__paragraph-text">
          {linkifyText(paragraph.text)}
        </span>
      ) : null}
      {paragraph.bullets.length > 0 ? (
        <ul className="network-message-alert-banner__bullets">
          {paragraph.bullets.map((bullet, index) => (
            <BulletRow
              key={`${idPrefix}-b-${index}`}
              bullet={bullet}
              network={network}
              tocOperators={tocOperators}
            />
          ))}
        </ul>
      ) : null}
    </span>
  )
}

function NetworkMessageCard({
  message,
  tocOperators
}: {
  message: NetworkMessage
  tocOperators: TocOperator[]
}) {
  const title = message.title.trim() || 'Network alert'
  const canCollapse = networkMessageIsCollapsible(message)
  const [expanded, setExpanded] = useState(!canCollapse)
  const preview = message.preview?.trim() ?? ''
  const collapsedParagraphs: NetworkMessageParagraph[] = preview
    ? [{ text: preview, bullets: [] }]
    : message.paragraphs.slice(0, 1).map((paragraph) => ({
        ...paragraph,
        // Keep the collapsed preview to the lead text only when no dedicated preview is set.
        bullets: [] as NetworkMessageBullet[]
      }))
  const paragraphs = canCollapse && !expanded ? collapsedParagraphs : message.paragraphs

  const description =
    paragraphs.length > 0 || canCollapse ? (
      <span className="network-message-alert-banner__description">
        {paragraphs.length > 0 ? (
          <span className="network-message-alert-banner__paragraphs">
            {paragraphs.map((paragraph, index) => (
              <ParagraphBlock
                key={`${message.id}-p-${index}`}
                idPrefix={`${message.id}-p-${index}`}
                paragraph={paragraph}
                network={message.network}
                tocOperators={tocOperators}
              />
            ))}
          </span>
        ) : null}
        {canCollapse ? (
          <button
            type="button"
            className="network-message-alert-banner__toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show less' : 'Expand this message to read more'}
          </button>
        ) : null}
      </span>
    ) : undefined

  return (
    <div
      className={`network-message-alert-banner__item network-message-alert-banner__item--priority-${message.priority}${
        canCollapse && !expanded ? ' network-message-alert-banner__item--collapsed' : ''
      }`}
    >
      <TextCard
        static
        title={title}
        description={description}
        state={textCardStateForPriority(message.priority)}
        trailingIcon={<span aria-hidden="true" />}
        className="network-message-alert-banner__card"
        ariaLabel={title}
      />
    </div>
  )
}

/**
 * Network-wide alerts from Firestore `networkmessages` — same TextCard treatment as
 * the Knowledgebase station alert banner on National Rail details.
 */
export function NetworkMessageAlertBanner({
  messages,
  ariaLabel = 'Network alerts'
}: NetworkMessageAlertBannerProps) {
  const visible = messages.filter((m) => m.title.trim() || m.paragraphs.length > 0)
  const needsTocOperators = visible.some((message) => !isLightRailNetworkCollection(message.network))
  const tocOperatorsState = useTocOperators(needsTocOperators)
  if (visible.length === 0) return null

  return (
    <div className="network-message-alert-banner" role="region" aria-label={ariaLabel}>
      {visible.map((message) => (
        <NetworkMessageCard
          key={message.id}
          message={message}
          tocOperators={tocOperatorsState.operators}
        />
      ))}
    </div>
  )
}

export default NetworkMessageAlertBanner
