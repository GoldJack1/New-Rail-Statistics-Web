'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { BUTWideButton } from '@/components/buttons'
import { BackIcon } from '@/components/icons'
import { PageTopHeader } from '@/components/misc'
import BUTDDMList from '@/components/buttons/ddm/BUTDDMList'
import TXTINPWideButton from '@/components/textInputs/plain/TXTINPWideButton'
import { NetworkMessageAlertBanner } from '@/components/stations/NetworkMessageAlertBanner'
import {
  NETWORK_COLLECTION_IDS,
  NETWORK_LABELS,
  type NetworkCollectionId
} from '@/constants/stationCollections'
import {
  LIGHT_RAIL_LINE_OPTIONS,
  isLightRailNetworkCollection
} from '@/utils/lightRailStationFields'
import { collectUniqueStationTocNames } from '@/utils/stationCardForNetwork'
import { useTocOperators } from '@/hooks/useTocOperators'
import { resolveTocChipNamesForNetwork } from '@/services/tocOperators'
import {
  ensureCollectionLoaded,
  getCollectionStations,
  getStationsStoreRevision,
  subscribeStationsData
} from '@/services/stationsDataService'
import {
  NETWORK_MESSAGE_MAX_BULLETS,
  NETWORK_MESSAGE_MAX_PARAGRAPHS,
  emptyNetworkMessageDraft,
  normalizeNetworkMessageDraftInput,
  type NetworkMessage,
  type NetworkMessageDraftInput,
  type NetworkMessagePriority
} from '@/types/networkMessages'
import {
  createNetworkMessage,
  deleteNetworkMessage,
  getNetworkMessage,
  setNetworkMessageActive,
  updateNetworkMessage
} from '@/services/networkMessages'
import './NetworkMessagesAdminPage.css'

const NETWORK_OPTIONS = NETWORK_COLLECTION_IDS.map((id) => ({
  label: NETWORK_LABELS[id],
  value: id
}))

const PRIORITY_OPTIONS: Array<{ label: string; value: NetworkMessagePriority }> = [
  { label: '1 — Critical (red)', value: 1 },
  { label: '2 — Important (accent)', value: 2 },
  { label: '3 — Notice (favourites)', value: 3 },
  { label: '4 — Low (primary)', value: 4 },
  { label: '5 — Positive (green)', value: 5 }
]

const NONE_CHIP = '(none)'

const COLLAPSIBLE_OPTIONS = [
  { label: 'Collapsible (start collapsed)', value: true },
  { label: 'Always expanded', value: false }
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function msToDatetimeLocal(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function datetimeLocalToMs(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const ms = Date.parse(trimmed)
  return Number.isFinite(ms) ? ms : null
}

function draftToPreviewMessage(draft: NetworkMessageDraftInput): NetworkMessage {
  return {
    id: 'preview',
    network: draft.network,
    priority: draft.priority,
    title: draft.title.trim() || 'Untitled network message',
    paragraphs: draft.paragraphs
      .map((p) => ({
        text: p.text,
        bullets: p.bullets.filter((b) => b.text.trim() || b.lineChip)
      }))
      .filter((p) => p.text.trim() || p.bullets.length > 0),
    body: '',
    ...(draft.preview?.trim() ? { preview: draft.preview.trim() } : {}),
    collapsible: draft.collapsible !== false,
    ...(draft.startsAtMs != null ? { startsAtMs: draft.startsAtMs } : {}),
    ...(draft.endsAtMs != null ? { endsAtMs: draft.endsAtMs } : {}),
    active: true
  }
}

const NetworkMessagesComposerPage: React.FC = () => {
  const router = useRouter()
  const { messageId } = useParams<{ messageId?: string }>()
  const [draft, setDraft] = useState<NetworkMessageDraftInput>(emptyNetworkMessageDraft())
  const [activeMessageId, setActiveMessageId] = useState<string>(
    messageId && messageId !== 'new' ? messageId : ''
  )
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const paragraphTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const usesLightRailChips = isLightRailNetworkCollection(draft.network)
  const tocOperators = useTocOperators(!usesLightRailChips)
  const stationsRevision = useSyncExternalStore(
    subscribeStationsData,
    getStationsStoreRevision,
    () => 0
  )

  useEffect(() => {
    if (usesLightRailChips) return
    void ensureCollectionLoaded(draft.network, { detailLevel: 'lean', force: false }).catch(
      (err: unknown) => {
        console.warn('Failed to load stations for network TOC chips.', err)
      }
    )
  }, [draft.network, usesLightRailChips])

  const networkTocNames = useMemo(() => {
    if (usesLightRailChips) return [] as string[]
    void stationsRevision
    const lean = getCollectionStations(draft.network, 'lean')
    const list = lean.length > 0 ? lean : getCollectionStations(draft.network, 'list')
    const stations = list.length > 0 ? list : getCollectionStations(draft.network, 'full')
    const stationNames = collectUniqueStationTocNames(stations)
    return resolveTocChipNamesForNetwork(stationNames, tocOperators.operators)
  }, [draft.network, stationsRevision, tocOperators.operators, usesLightRailChips])

  const chipOptions = useMemo(() => {
    if (usesLightRailChips) {
      return [NONE_CHIP, ...LIGHT_RAIL_LINE_OPTIONS]
    }
    return [NONE_CHIP, ...networkTocNames]
  }, [networkTocNames, usesLightRailChips])

  const chipFieldLabel = usesLightRailChips ? 'Line chip' : 'TOC chip'
  const chipFilterName = usesLightRailChips ? 'Line' : 'TOC'

  const loadMessageIntoComposer = async (id: string) => {
    const selected = await getNetworkMessage(id)
    if (!selected) {
      setError('Network message not found.')
      return
    }
    setActiveMessageId(selected.id)
    setDraft({
      network: selected.network,
      priority: selected.priority,
      title: selected.title,
      preview: selected.preview ?? '',
      paragraphs:
        selected.paragraphs.length > 0
          ? selected.paragraphs.map((p) => ({
              text: p.text,
              bullets: p.bullets.length > 0 ? p.bullets : []
            }))
          : [{ text: '', bullets: [] }],
      body: '',
      collapsible: selected.collapsible !== false,
      startsAtMs: selected.startsAtMs ?? null,
      endsAtMs: selected.endsAtMs ?? null,
      active: selected.active
    })
  }

  useEffect(() => {
    if (!messageId || messageId === 'new') {
      setActiveMessageId('')
      setDraft(emptyNetworkMessageDraft())
      return
    }
    void loadMessageIntoComposer(messageId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load network message.')
    })
  }, [messageId])

  const updateDraft = (patch: Partial<NetworkMessageDraftInput>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const updateParagraph = (
    index: number,
    patch: Partial<{ text: string; bullets: NetworkMessageDraftInput['paragraphs'][number]['bullets'] }>
  ) => {
    setDraft((prev) => {
      const next = [...prev.paragraphs]
      const current = next[index] ?? { text: '', bullets: [] }
      next[index] = { ...current, ...patch }
      return { ...prev, paragraphs: next }
    })
  }

  const addParagraph = () => {
    setDraft((prev) => {
      if (prev.paragraphs.length >= NETWORK_MESSAGE_MAX_PARAGRAPHS) return prev
      return { ...prev, paragraphs: [...prev.paragraphs, { text: '', bullets: [] }] }
    })
  }

  const removeParagraph = (index: number) => {
    setDraft((prev) => {
      const next = prev.paragraphs.filter((_, i) => i !== index)
      return { ...prev, paragraphs: next.length > 0 ? next : [{ text: '', bullets: [] }] }
    })
  }

  const addBullet = (paragraphIndex: number) => {
    setDraft((prev) => {
      const next = [...prev.paragraphs]
      const paragraph = next[paragraphIndex]
      if (!paragraph || paragraph.bullets.length >= NETWORK_MESSAGE_MAX_BULLETS) return prev
      next[paragraphIndex] = {
        ...paragraph,
        bullets: [...paragraph.bullets, { text: '' }]
      }
      return { ...prev, paragraphs: next }
    })
  }

  const updateBullet = (
    paragraphIndex: number,
    bulletIndex: number,
    patch: { text?: string; lineChip?: string | undefined }
  ) => {
    setDraft((prev) => {
      const next = [...prev.paragraphs]
      const paragraph = next[paragraphIndex]
      if (!paragraph) return prev
      const bullets = [...paragraph.bullets]
      const current = bullets[bulletIndex] ?? { text: '' }
      const nextBullet = { ...current, ...patch }
      if (patch.lineChip === undefined && 'lineChip' in patch) {
        delete nextBullet.lineChip
      }
      bullets[bulletIndex] = nextBullet
      next[paragraphIndex] = { ...paragraph, bullets }
      return { ...prev, paragraphs: next }
    })
  }

  const removeBullet = (paragraphIndex: number, bulletIndex: number) => {
    setDraft((prev) => {
      const next = [...prev.paragraphs]
      const paragraph = next[paragraphIndex]
      if (!paragraph) return prev
      next[paragraphIndex] = {
        ...paragraph,
        bullets: paragraph.bullets.filter((_, i) => i !== bulletIndex)
      }
      return { ...prev, paragraphs: next }
    })
  }

  const autosizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useLayoutEffect(() => {
    Object.values(paragraphTextareaRefs.current).forEach((textarea) => autosizeTextarea(textarea))
  }, [draft.paragraphs])

  const selectedNetworkIndex = Math.max(
    0,
    NETWORK_OPTIONS.findIndex((option) => option.value === draft.network)
  )
  const selectedPriorityIndex = Math.max(
    0,
    PRIORITY_OPTIONS.findIndex((option) => option.value === draft.priority)
  )
  const selectedCollapsibleIndex = draft.collapsible === false ? 1 : 0

  const previewMessages = useMemo(() => {
    const message = draftToPreviewMessage(draft)
    if (!message.title && message.paragraphs.length === 0 && !message.preview) return []
    return [message]
  }, [draft])

  const persist = async (options: { activate?: boolean; deactivate?: boolean }) => {
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      const nextActive =
        options.activate === true
          ? true
          : options.deactivate === true
            ? false
            : draft.active === true
      const payload = normalizeNetworkMessageDraftInput({ ...draft, active: nextActive })
      if (activeMessageId) {
        await updateNetworkMessage(activeMessageId, payload)
        setDraft(payload)
        setNotice(options.activate ? 'Saved and activated.' : options.deactivate ? 'Saved and deactivated.' : 'Saved.')
      } else {
        const createdId = await createNetworkMessage(payload)
        setActiveMessageId(createdId)
        setDraft(payload)
        router.push(`/admin/network-messages/${createdId}`)
        setNotice(options.activate ? 'Created and activated.' : 'Created.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const activateOnly = async () => {
    if (!activeMessageId) {
      await persist({ activate: true })
      return
    }
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await updateNetworkMessage(activeMessageId, normalizeNetworkMessageDraftInput({ ...draft, active: true }))
      await setNetworkMessageActive(activeMessageId, true)
      setDraft((prev) => ({ ...prev, active: true }))
      setNotice('Activated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activate failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const deactivateOnly = async () => {
    if (!activeMessageId) return
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await setNetworkMessageActive(activeMessageId, false)
      setDraft((prev) => ({ ...prev, active: false }))
      setNotice('Deactivated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivate failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const removeMessage = async () => {
    if (!activeMessageId) return
    const confirmed = window.confirm('Delete this network message permanently?')
    if (!confirmed) return
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deleteNetworkMessage(activeMessageId)
      router.push('/admin/network-messages')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setIsBusy(false)
    }
  }

  return (
    <div className="message-centre-admin-page-shell">
      <PageTopHeader
        title="Network Message Editor"
        subtitle="Edit network alert fields and preview the station banner."
        actionButton={{
          to: '/admin/network-messages',
          label: 'Back',
          mode: 'iconText',
          icon: <BackIcon />
        }}
      />
      <div className="message-centre-admin-page">
        <div className="message-centre-admin-layout">
          <section className="message-centre-composer-panel message-centre-composer-panel--wide">
            <div className="message-centre-status">
              {error && <p className="message-centre-status__error">{error}</p>}
              {notice && <p className="message-centre-status__notice">{notice}</p>}
            </div>

            <div className="message-centre-form-grid">
              <div className="message-centre-field">
                <span className="message-centre-field__label">Network</span>
                <BUTDDMList
                  items={NETWORK_OPTIONS.map((option) => option.label)}
                  filterName="Network"
                  selectionMode="single"
                  selectedPositions={[selectedNetworkIndex]}
                  onSelectionChanged={(selectedPositions) => {
                    const selectedIndex = selectedPositions[0]
                    if (typeof selectedIndex !== 'number') return
                    const selectedOption = NETWORK_OPTIONS[selectedIndex]
                    if (!selectedOption) return
                    const nextNetwork = selectedOption.value as NetworkCollectionId
                    const nextIsLightRail = isLightRailNetworkCollection(nextNetwork)
                    // Clear chips on network change — TOC/line options are network-specific.
                    setDraft((prev) => ({
                      ...prev,
                      network: nextNetwork,
                      paragraphs: prev.paragraphs.map((paragraph) => ({
                        ...paragraph,
                        bullets: paragraph.bullets.map((bullet) => {
                          if (!bullet.lineChip) return bullet
                          if (nextIsLightRail) {
                            return LIGHT_RAIL_LINE_OPTIONS.includes(
                              bullet.lineChip as (typeof LIGHT_RAIL_LINE_OPTIONS)[number]
                            )
                              ? bullet
                              : { text: bullet.text }
                          }
                          return { text: bullet.text }
                        })
                      }))
                    }))
                  }}
                  colorVariant="primary"
                />
              </div>

              <div className="message-centre-field">
                <span className="message-centre-field__label">Priority</span>
                <BUTDDMList
                  items={PRIORITY_OPTIONS.map((option) => option.label)}
                  filterName="Priority"
                  selectionMode="single"
                  selectedPositions={[selectedPriorityIndex]}
                  onSelectionChanged={(selectedPositions) => {
                    const selectedIndex = selectedPositions[0]
                    if (typeof selectedIndex !== 'number') return
                    const selectedOption = PRIORITY_OPTIONS[selectedIndex]
                    if (!selectedOption) return
                    updateDraft({ priority: selectedOption.value })
                  }}
                  colorVariant="primary"
                />
              </div>

              <div className="message-centre-field message-centre-form-grid__full">
                <span className="message-centre-field__label">Title</span>
                <TXTINPWideButton
                  value={draft.title}
                  onInputChange={(event) => updateDraft({ title: event.target.value })}
                  colorVariant="secondary"
                />
              </div>

              <div className="message-centre-field message-centre-form-grid__full">
                <span className="message-centre-field__label">Preview (collapsed summary)</span>
                <TXTINPWideButton
                  value={draft.preview ?? ''}
                  onInputChange={(event) => updateDraft({ preview: event.target.value })}
                  colorVariant="secondary"
                />
              </div>

              <div className="message-centre-field">
                <span className="message-centre-field__label">Starts at</span>
                <input
                  type="datetime-local"
                  className="message-centre-squared-input rs-button--color-secondary network-messages-datetime"
                  value={msToDatetimeLocal(draft.startsAtMs)}
                  onChange={(event) => updateDraft({ startsAtMs: datetimeLocalToMs(event.target.value) })}
                />
              </div>

              <div className="message-centre-field">
                <span className="message-centre-field__label">Ends at</span>
                <input
                  type="datetime-local"
                  className="message-centre-squared-input rs-button--color-secondary network-messages-datetime"
                  value={msToDatetimeLocal(draft.endsAtMs)}
                  onChange={(event) => updateDraft({ endsAtMs: datetimeLocalToMs(event.target.value) })}
                />
              </div>

              <div className="message-centre-field message-centre-form-grid__full">
                <span className="message-centre-field__label">Collapse behaviour</span>
                <BUTDDMList
                  items={COLLAPSIBLE_OPTIONS.map((option) => option.label)}
                  filterName="Collapse"
                  selectionMode="single"
                  selectedPositions={[selectedCollapsibleIndex]}
                  onSelectionChanged={(selectedPositions) => {
                    const selectedIndex = selectedPositions[0]
                    if (typeof selectedIndex !== 'number') return
                    const selectedOption = COLLAPSIBLE_OPTIONS[selectedIndex]
                    if (!selectedOption) return
                    updateDraft({ collapsible: selectedOption.value })
                  }}
                  colorVariant="primary"
                />
              </div>
            </div>

            <div className="message-centre-blocks">
              <div className="message-centre-blocks-header">
                <h2>Paragraphs ({draft.paragraphs.length}/{NETWORK_MESSAGE_MAX_PARAGRAPHS})</h2>
                <div className="message-centre-inline-actions">
                  <BUTWideButton
                    width="hug"
                    instantAction
                    disabled={draft.paragraphs.length >= NETWORK_MESSAGE_MAX_PARAGRAPHS}
                    onClick={addParagraph}
                  >
                    Add paragraph
                  </BUTWideButton>
                </div>
              </div>

              {draft.paragraphs.map((paragraph, paragraphIndex) => (
                <div className="message-centre-block-card" key={`paragraph-${paragraphIndex}`}>
                  <div className="message-centre-block-card__head">
                    <strong>Paragraph {paragraphIndex + 1}</strong>
                    <BUTWideButton
                      width="hug"
                      colorVariant="red-action"
                      instantAction
                      onClick={() => removeParagraph(paragraphIndex)}
                    >
                      Remove
                    </BUTWideButton>
                  </div>
                  <textarea
                    ref={(element) => {
                      paragraphTextareaRefs.current[`p-${paragraphIndex}`] = element
                    }}
                    className="message-centre-squared-textarea rs-button--color-secondary"
                    rows={2}
                    placeholder="Paragraph text (URLs are linkified)"
                    value={paragraph.text}
                    onChange={(event) => {
                      autosizeTextarea(event.currentTarget)
                      updateParagraph(paragraphIndex, { text: event.target.value })
                    }}
                  />

                  <div className="network-messages-bullets">
                    <div className="message-centre-blocks-header">
                      <h3>Bullets ({paragraph.bullets.length}/{NETWORK_MESSAGE_MAX_BULLETS})</h3>
                      <BUTWideButton
                        width="hug"
                        instantAction
                        disabled={paragraph.bullets.length >= NETWORK_MESSAGE_MAX_BULLETS}
                        onClick={() => addBullet(paragraphIndex)}
                      >
                        Add bullet
                      </BUTWideButton>
                    </div>
                    {paragraph.bullets.map((bullet, bulletIndex) => {
                      const lineChipValue = bullet.lineChip ?? NONE_CHIP
                      const optionsForRow =
                        lineChipValue === NONE_CHIP || chipOptions.includes(lineChipValue)
                          ? chipOptions
                          : [NONE_CHIP, lineChipValue, ...chipOptions.slice(1)]
                      const lineChipIndex = Math.max(
                        0,
                        optionsForRow.findIndex((option) => option === lineChipValue)
                      )
                      return (
                        <div
                          className={`network-messages-bullet-row ${
                            usesLightRailChips
                              ? 'network-messages-bullet-row--line'
                              : 'network-messages-bullet-row--toc'
                          }`}
                          key={`bullet-${paragraphIndex}-${bulletIndex}`}
                        >
                          <div className="network-messages-bullet-row__main">
                            <div className="network-messages-bullet-row__chip">
                              <span className="message-centre-field__label">{chipFieldLabel}</span>
                              {!usesLightRailChips && networkTocNames.length === 0 ? (
                                <p className="network-messages-status-hint">
                                  Loading TOCs for this network…
                                </p>
                              ) : null}
                              <BUTDDMList
                                items={optionsForRow}
                                filterName={chipFilterName}
                                selectionMode="single"
                                selectedPositions={[lineChipIndex]}
                                onSelectionChanged={(selectedPositions) => {
                                  const selectedIndex = selectedPositions[0]
                                  if (typeof selectedIndex !== 'number') return
                                  const selectedOption = optionsForRow[selectedIndex]
                                  if (!selectedOption) return
                                  updateBullet(paragraphIndex, bulletIndex, {
                                    lineChip:
                                      selectedOption === NONE_CHIP ? undefined : selectedOption
                                  })
                                }}
                                colorVariant="primary"
                              />
                            </div>
                            <div className="network-messages-bullet-row__text">
                              <span className="message-centre-field__label">Bullet text</span>
                              <TXTINPWideButton
                                value={bullet.text}
                                onInputChange={(event) =>
                                  updateBullet(paragraphIndex, bulletIndex, {
                                    text: event.target.value
                                  })
                                }
                                colorVariant="secondary"
                              />
                            </div>
                          </div>
                          <BUTWideButton
                            width="hug"
                            colorVariant="red-action"
                            instantAction
                            onClick={() => removeBullet(paragraphIndex, bulletIndex)}
                          >
                            Remove
                          </BUTWideButton>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="message-centre-actions">
              <BUTWideButton width="hug" instantAction disabled={isBusy} onClick={() => void persist({})}>
                Save
              </BUTWideButton>
              <BUTWideButton
                width="hug"
                colorVariant="green-action"
                instantAction
                disabled={isBusy || draft.active === true}
                onClick={() => void activateOnly()}
              >
                Activate
              </BUTWideButton>
              <BUTWideButton
                width="hug"
                colorVariant="red-action"
                instantAction
                disabled={isBusy || !activeMessageId || draft.active !== true}
                onClick={() => void deactivateOnly()}
              >
                Deactivate
              </BUTWideButton>
              <BUTWideButton
                width="hug"
                colorVariant="red-action"
                instantAction
                disabled={isBusy || !activeMessageId}
                onClick={() => void removeMessage()}
              >
                Delete
              </BUTWideButton>
            </div>
            <p className="network-messages-status-hint">
              Status: {draft.active ? 'Active' : 'Inactive'}
              {draft.startsAtMs != null || draft.endsAtMs != null
                ? ' · Schedule window set (public UI only shows inside the window)'
                : ''}
            </p>
          </section>

          <section className="message-centre-preview-panel">
            <h2>Live banner preview</h2>
            {previewMessages.length > 0 ? (
              <NetworkMessageAlertBanner messages={previewMessages} ariaLabel="Network message preview" />
            ) : (
              <p className="network-messages-preview-empty">Add a title, preview, or paragraph to preview.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default NetworkMessagesComposerPage
