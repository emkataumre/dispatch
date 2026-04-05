import React from 'react'
import { Image } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { PresenceBubble } from '../PresenceBubble'

describe('PresenceBubble', () => {
  it('renders two-letter initials for a two-word name', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<PresenceBubble displayName="Jane Doe" avatarUrl={null} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children).match(/^[A-Z]{1,2}$/))
    expect(initialsNode?.props.children).toBe('JD')
  })

  it('renders a single initial for a single-word name', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<PresenceBubble displayName="Jane" avatarUrl={null} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children).match(/^[A-Z]{1,2}$/))
    expect(initialsNode?.props.children).toBe('J')
  })

  it('renders an Image when avatarUrl is provided', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<PresenceBubble displayName="Jane Doe" avatarUrl="https://example.com/avatar.png" />) })

    const images = root!.root.findAllByType(Image)
    expect(images.length).toBeGreaterThan(0)
    expect(images[0].props.source.uri).toBe('https://example.com/avatar.png')
  })

  it('renders initials (no Image) when avatarUrl is null', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<PresenceBubble displayName="Jane Doe" avatarUrl={null} />) })

    const images = root!.root.findAllByType(Image)
    expect(images.length).toBe(0)
  })

  it('falls back to initials when the avatar image fails to load', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<PresenceBubble displayName="Jane Doe" avatarUrl="https://example.com/avatar.png" />) })

    // Initially renders an Image
    expect(root!.root.findAllByType(Image).length).toBeGreaterThan(0)

    // Simulate image load error
    act(() => { root!.root.findAllByType(Image)[0].props.onError() })

    // Image gone; initials rendered
    expect(root!.root.findAllByType(Image).length).toBe(0)
    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children).match(/^[A-Z]{1,2}$/))
    expect(initialsNode?.props.children).toBe('JD')
  })

  it('produces the same background color for the same display name', () => {
    let root1: ReturnType<typeof create>
    let root2: ReturnType<typeof create>
    act(() => { root1 = create(<PresenceBubble displayName="Jane Doe" avatarUrl={null} />) })
    act(() => { root2 = create(<PresenceBubble displayName="Jane Doe" avatarUrl={null} />) })

    // style may be an array — flatten to find backgroundColor across all style objects
    const getBgColor = (style: unknown): string | undefined => {
      if (Array.isArray(style)) {
        for (const s of style) {
          const c = getBgColor(s)
          if (c) return c
        }
        return undefined
      }
      return (style as Record<string, unknown> | null)?.backgroundColor as string | undefined
    }

    const getColor = (root: ReturnType<typeof create>) =>
      root.root
        .findAll((n: ReactTestInstance) => (n.type as string) === 'View')
        .map((n) => getBgColor(n.props.style))
        .find((c) => c !== undefined)

    expect(getColor(root1!)).toBe(getColor(root2!))
    expect(getColor(root1!)).toBeDefined()
  })
})
